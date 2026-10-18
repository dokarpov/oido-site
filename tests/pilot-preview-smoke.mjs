import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';

const base=process.env.PREVIEW_URL||'http://127.0.0.1:8789';
await mkdir('artifacts/pilot-visual',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const size of [{width:320,height:700},{width:390,height:844},{width:768,height:1024},{width:1440,height:900}]){
  const context=await browser.newContext({viewport:size,reducedMotion:'reduce'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/pilot-preview/index.html',{waitUntil:'domcontentloaded'});
  await page.locator('#workspace').waitFor({state:'visible',timeout:15000});
  assert.equal(await page.locator('.preview-label').isVisible(),true);
  assert.equal((await page.locator('#merchant-title').innerText()).toLowerCase(),'la curandera · sample venue · demo-la-curandera');
  assert.equal(await page.locator('#review-area tbody tr').count(),6);
  assert.equal(await page.locator('#share').isVisible(),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'merchant overflow '+size.width);
  const faces=await page.evaluate(async()=>{await document.fonts.ready;return {title:document.fonts.check('24px FD'),body:document.fonts.check('16px FS')};});
  assert.equal(faces.title,true,'website FD font missing '+size.width);
  assert.equal(faces.body,true,'website FS font missing '+size.width);
  await page.screenshot({path:'artifacts/pilot-visual/merchant-'+size.width+'.png',fullPage:true});
  await page.goto(base+'/pilot-preview/guest.html?m=demo-la-curandera&test=1',{waitUntil:'domcontentloaded'});
  await page.locator('#catalog article').first().waitFor();
  await page.locator('button[data-lang="es"]').click();
  assert.equal(await page.locator('#offer-title').innerText(),'Elige un artículo');
  await page.locator('button[data-lang="ca"]').click();
  assert.equal(await page.locator('#offer-title').innerText(),'Tria un article');
  await page.locator('button[data-lang="en"]').click();
  await page.locator('#catalog article button').first().click();
  await page.locator('#ack').check();
  await page.locator('#send').click();
  await page.locator('#receipt').waitFor({state:'visible',timeout:8000});
  assert.match(await page.locator('#reference').innerText(),/sample-/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'guest overflow '+size.width);
  await page.screenshot({path:'artifacts/pilot-visual/guest-'+size.width+'.png',fullPage:true});
  assert.equal(errors.length,0,'browser errors '+size.width+': '+errors.join('; '));
  await page.goto(base+'/pilot-preview/index.html',{waitUntil:'domcontentloaded'});
  await page.locator('#workspace').waitFor({state:'visible'});
  assert.equal(await page.locator('#test-count').innerText(),'3','guest action should be visible in merchant activity '+size.width);
  if(size.width===390){
    await page.locator('#menu-text').fill('New coffee 3,50\nCroissant\nTea;2.20');
    page.once('dialog',d=>d.accept());
    await page.locator('#import').click();
    await page.waitForFunction(()=>document.querySelectorAll('#review-area tbody tr').length===3);
    assert.equal(await page.locator('#share').isVisible(),false,'should unpublish while source is under review');
    for(let i=0;i<3;i++){
      const row=page.locator('#review-area tbody tr').nth(i);
      if(i===1)await row.locator('input[type=number]').fill('3.25');
      await row.locator('input[type=checkbox]').check();
    }
    await page.locator('#approve').click();
    await page.waitForFunction(()=>document.querySelector('#publish')&&!document.querySelector('#publish').disabled);
    await page.locator('#publish').click();
    await page.locator('#share').waitFor({state:'visible'});
    assert.match(await page.locator('#guest-url').innerText(),/pilot-preview\/guest\.html/);
    assert.equal(await page.locator('#review-area tbody tr').count(),3);
  }
  await context.close();
 }
 console.log('PASS visual review: 4 viewports, original fonts, EN/ES/CA, sample guest request, merchant activity, import-review-publish, no document overflow');
}finally{await browser.close();}
