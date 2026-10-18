import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.PILOT_BASE_URL||'http://127.0.0.1:8788',admin=process.env.PILOT_ADMIN_TOKEN||'ci-pilot-admin-testing-secret-00000000';
const req=async(route,{method='GET',token,payload,origin}={})=>{
 const headers={...(payload?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{}),...(origin?{Origin:origin}:{})};
 const r=await fetch(base+'/api/pilot/'+route,{method,headers,body:payload?JSON.stringify(payload):undefined});
 const data=await r.json().catch(()=>({}));return{code:r.status,data};
};
const health=await req('health');assert.equal(health.code,200,JSON.stringify(health));
assert.equal(health.data.ready,true);
assert.equal(health.data.payments,'disabled');
const unauthorized=await req('invite',{method:'POST',payload:{name:'Unauthorized'}});assert.equal(unauthorized.code,401);
const cross=await req('invite',{method:'POST',token:admin,origin:'https://hostile.example',payload:{name:'Blocked'}});assert.equal(cross.code,403);
const created=await req('invite',{method:'POST',token:admin,payload:{name:'La Curandera'}});assert.equal(created.code,201,JSON.stringify(created));
const token=created.data.merchantToken,slug=created.data.slug;assert.match(token,/^[a-f0-9]{64}$/);
const empty=await req('merchant',{token});assert.equal(empty.code,200);assert.equal(empty.data.items.length,0);
const importer=await req('import',{method:'POST',token,payload:{text:'Patatas bravas 5,80\nCoffee; 2.50\nAmbiguous item'}});
assert.equal(importer.code,200,JSON.stringify(importer));assert.equal(importer.data.imported,3);
assert.equal(importer.data.requiresReview,3);
const before=await req('publish',{method:'POST',token,payload:{}});assert.equal(before.code,400);
const items=importer.data.items.map(x=>({id:x.id,label:x.label,priceCents:x.priceCents??0,approved:true}));
const review=await req('review',{method:'POST',token,payload:{items}});assert.equal(review.code,200);assert.equal(review.data.approved,3);
const published=await req('publish',{method:'POST',token,payload:{}});assert.equal(published.code,200);
const publicPage=await req('public?m='+slug);assert.equal(publicPage.code,200);assert.equal(publicPage.data.items.length,3);assert.equal(publicPage.data.merchant.acceptingRequests,false);
const noStaff=await req('settings',{method:'POST',token,payload:{acceptingRequests:true}});assert.equal(noStaff.code,400);
const key='pilot_test_1234567890';
const failedReal=await req('request',{method:'POST',payload:{slug,itemId:items[0].id,idempotencyKey:key,isTest:false,acknowledged:true}});assert.equal(failedReal.code,409);
const simulated=await req('request',{method:'POST',payload:{slug,itemId:items[0].id,idempotencyKey:key,isTest:true,acknowledged:true}});
assert.equal(simulated.code,201,JSON.stringify(simulated));assert.equal(simulated.data.isTest,true);
const duplicate=await req('request',{method:'POST',payload:{slug,itemId:items[0].id,idempotencyKey:key,isTest:true,acknowledged:true}});
assert.equal(duplicate.data.reference,simulated.data.reference);
const status=await req('request-status?ref='+simulated.data.reference);assert.equal(status.data.status,'submitted');
const enabled=await req('settings',{method:'POST',token,payload:{acceptingRequests:true,staffReady:true}});assert.equal(enabled.code,200);
const sent=await req('request',{method:'POST',payload:{slug,itemId:items[1].id,idempotencyKey:'pilot_real_1234567890',isTest:false,acknowledged:true}});
assert.equal(sent.code,201,JSON.stringify(sent));assert.equal(sent.data.isTest,false);
const accepted=await req('status',{method:'POST',token,payload:{reference:sent.data.reference,status:'accepted'}});assert.equal(accepted.code,200);
const fulfilled=await req('status',{method:'POST',token,payload:{reference:sent.data.reference,status:'fulfilled'}});assert.equal(fulfilled.code,200);
const invalidStatus=await req('status',{method:'POST',token,payload:{reference:sent.data.reference,status:'accepted'}});assert.equal(invalidStatus.code,409);
const state=await req('request-status?ref='+sent.data.reference);assert.equal(state.data.status,'fulfilled');
const activity=await req('activity',{token});assert.equal(activity.data.requests.length,2);assert.equal(activity.data.eventDefinition.includes('No passive views'),true);
const second=await req('invite',{method:'POST',token:admin,payload:{name:'Studio C'}});assert.equal(second.code,201);
const isolation=await req('status',{method:'POST',token:second.data.merchantToken,payload:{reference:sent.data.reference,status:'declined'}});assert.equal(isolation.code,404);
const pause=await req('settings',{method:'POST',token,payload:{acceptingRequests:false}});assert.equal(pause.code,200);
const reimport=await req('import',{method:'POST',token,payload:{text:'New menu item; 6.00'}});assert.equal(reimport.code,200,JSON.stringify(reimport));
const after=await req('activity',{token});assert.equal(after.data.requests.length,2,'historical requests must survive imports');
const csv=await fetch(base+'/api/pilot/export',{headers:{Authorization:'Bearer '+token}});assert.equal(csv.status,200);const csvText=await csv.text();assert.match(csvText,/Patatas bravas/);assert.match(csvText,/Coffee/);
assert.equal((await req('payment/charge',{method:'POST',token,payload:{}})).code,404);
console.log('PASS 23 API assertions: secure invite, import, review, publish, guest test/live, idempotency, staff, transitions, isolation, history, export and no payment endpoint');

const browser=await chromium.launch({headless:true});
try{
 for(const viewport of [{width:390,height:844},{width:320,height:700},{width:375,height:812},{width:768,height:1024},{width:1440,height:900}]){
  const context=await browser.newContext({viewport});
  const page=await context.newPage();
  const errs=[];page.on('pageerror',e=>errs.push(e.message));
  await page.goto(base+'/pilot/index.html',{waitUntil:'networkidle'});
  await page.locator('#token').fill(token);
  await page.locator('#login').click();await page.locator('#workspace').waitFor({state:'visible'});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);assert.equal(overflow,false,'merchant horizontal overflow '+viewport.width);
  await page.locator('#refresh').click();await page.waitForTimeout(180);
  assert.equal(await page.locator('#real-count').innerText(),'1');
  // The new imported draft is intentionally unpublished until this merchant reviews it.
  if(viewport.width===390){
    assert.equal(await page.locator('#share').isVisible(),false);
    await page.locator('#review-area input[type="checkbox"]').check();
    await page.locator('#approve').click();
    await page.waitForFunction(()=>!document.querySelector('#publish').disabled);
    await page.locator('#publish').click();
    await page.locator('#share').waitFor({state:'visible'});
  }
  await page.goto(base+'/pilot/guest.html?m='+slug+'&test=1',{waitUntil:'networkidle'});
  await page.locator('button[data-lang="es"]').click();
  assert.equal(await page.locator('#offer-title').innerText(),'Elige un artículo');
  await page.locator('button[data-lang="ca"]').click();
  assert.equal(await page.locator('#offer-title').innerText(),'Tria un article');
  await page.locator('button[data-lang="en"]').click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'guest horizontal overflow '+viewport.width);
  const minTouch=await page.locator('[data-lang]').evaluateAll(buttons=>buttons.every(b=>b.getBoundingClientRect().height>=44));
  assert.equal(minTouch,true,'guest language controls below 44px on '+viewport.width);
  assert.equal(await page.locator('h1').count(),1);
  assert.equal(await page.locator('#notice').isVisible(),true);
  await page.locator('#catalog button').first().click();
  await page.locator('#ack').check();
  await page.locator('#send').click();
  await page.locator('#receipt').waitFor({state:'visible'});
  assert.match(await page.locator('#request-state').innerText(),/Waiting for staff/);
  await page.locator('#check').click();
  assert.equal(errs.length,0,JSON.stringify(errs));
  await context.close();
 }
 console.log('PASS browser merchant/guest UX at 320, 375, 390, 768 and 1440px: languages, touch targets, no overflow');
}finally{await browser.close();}
