import {chromium} from 'playwright';
const base=process.env.BASE_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
for(const [width,height] of [[320,700],[390,844],[768,1024],[1440,900]]){
  const context=await browser.newContext({viewport:{width,height},locale:'en-GB'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(base+'/index.html?lang=en',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(250);
  const boxes=await page.locator('.rail-in .tkw').evaluateAll(nodes=>nodes.map(el=>{
    const a=el.getBoundingClientRect(),card=el.querySelector('.tkt'),c=card.getBoundingClientRect(),stamp=card.querySelector('.stamp')?.getBoundingClientRect();
    return {height:a.height,width:a.width,top:a.top,cardHeight:c.height,cardTop:c.top,stampBottom:stamp?Math.round(parseFloat(getComputedStyle(card.querySelector('.stamp')).bottom)):0};
  }));
  if(boxes.length<4)throw Error(width+': fewer than four receipts');
  for(const k of ['width','height','top','cardHeight','cardTop','stampBottom']){
    const values=boxes.map(b=>b[k]);
    if(Math.max(...values)-Math.min(...values)>1)throw Error(width+': jumping '+k+' for receipt cards '+JSON.stringify(boxes));
  }
  const before=await page.evaluate(()=>window.scrollY);
  const dest=await page.evaluate(()=>{const el=document.querySelector('[data-sec="scan"]'); const r=el.getBoundingClientRect();return Math.round(r.top+scrollY+innerHeight*.45);});
  await page.evaluate(y=>{document.documentElement.style.scrollBehavior='auto';window.scrollTo(0,y)},dest);
  await page.waitForTimeout(100);
  const early=await page.evaluate(()=>({y:window.scrollY,step:[...document.querySelectorAll('.sc-steps li')].findIndex(x=>x.classList.contains('is-on'))}));
  if(Math.abs(early.y-dest)>4)throw Error(width+': scrolling blocked '+JSON.stringify({dest,early}));
  await page.waitForTimeout(1200);
  const later=await page.evaluate(()=>({y:scrollY,rows:[...document.querySelectorAll('.i-'+document.querySelector('.site').dataset.ind+'.sc-stage .u-row.is-in')].length}));
  if(Math.abs(later.y-dest)>4)throw Error(width+': motion changed scroll position '+JSON.stringify({dest,later}));
  if(errors.length)throw Error(width+': page error '+errors.join(' | '));
  console.log('PASS fixed receipts + free scrolling',width,boxes[0].width,boxes[0].height);
  await context.close();
}
{
 const context=await browser.newContext({viewport:{width:390,height:844},locale:'en-GB'});
 const page=await context.newPage();
 await page.goto(base+'/investors/index.html?lang=en',{waitUntil:'domcontentloaded'});
 const st=await page.evaluate(()=>{const el=document.querySelector('.pitch-section');const r=el.getBoundingClientRect();document.documentElement.style.scrollBehavior='auto';scrollTo(0,r.top+scrollY-130);return el.className;});
 await page.waitForTimeout(80);
 const during=await page.evaluate(()=>document.querySelector('.pitch-section')?.classList.contains('is-visible'));
 await page.waitForTimeout(580);
 const after=await page.evaluate(()=>document.querySelector('.pitch-section')?.querySelector('.pitch-top')?.classList.contains('is-visible'));
 if(during)throw Error('Investor entrance happened before scroll settled '+st);
 if(!after)throw Error('Investor section not revealed after scroll idle');
 console.log('PASS investor scroll-idle reveal');
 await context.close();
}
{
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const page=await context.newPage();
 await page.goto(base+'/investors/index.html',{waitUntil:'domcontentloaded'});
 const v=await page.evaluate(()=>({motionRoot:document.documentElement.classList.contains('oido-scroll-motion-ready'),opacity:getComputedStyle(document.querySelector('.pitch-section .pitch-top')).opacity}));
 if(v.motionRoot||v.opacity==='0')throw Error('Reduced-motion content hidden '+JSON.stringify(v));
 console.log('PASS reduced-motion fallback');
 await context.close();
}
await browser.close();