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

// Four-step phone storyboard: phone, frames, caption and all quote cards
// must keep identical geometry across industry, step and translated copy.
for(const vp of [{w:320,h:700},{w:375,h:812},{w:390,h:844},{w:430,h:932},{w:768,h:1024},{w:1024,h:768},{w:1440,h:900}]){
  const context=await browser.newContext({viewport:{width:vp.w,height:vp.h},locale:'en-GB'});
  const page=await context.newPage();
  await page.goto(base+'/index.html?lang=en',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(350);
  const snapshot=()=>page.evaluate(()=>{
    const ind=document.querySelector('.site').dataset.ind, w=document.querySelector('.i-'+ind+'.pz-w');
    const rect=(el)=>{
      if(!el)return null;const r=el.getBoundingClientRect();
      return {top:+r.top.toFixed(2),left:+r.left.toFixed(2),width:+r.width.toFixed(2),height:+r.height.toFixed(2)};
    };
    return {
      ind,phone:rect(w.querySelector('.pz-ph')),
      dv:rect(w.querySelector('.pz-ph>.dv')),
      screen:rect(w.querySelector('.dv-s')),
      caption:rect(w.querySelector('.pz-cap')),
      quoteStage:rect(w.querySelector('.pz-cur')),
      quotes:[...w.querySelectorAll('.pz-cur>.pz-card')].map(rect),
      scenes:[...w.querySelectorAll('.scn')].map(rect),
      frames:[...w.querySelectorAll('.scn .fr')].map(rect),
      screenOverflow:getComputedStyle(w.querySelector('.dv-s')).overflow,
      scrollWidth:document.documentElement.scrollWidth,
      viewport:innerWidth
    };
  });
  let baselineByIndustry={};
  for(const ind of ['rest','cafe','salon','studio']){
    await page.evaluate(ind=>document.querySelector('.hdi button[data-ind="'+ind+'"]')?.click()||document.querySelector('button[data-ind="'+ind+'"]')?.click(),ind);
    await page.waitForTimeout(80);
    const siteInd=await page.evaluate(()=>document.querySelector('.site').dataset.ind);
    if(siteInd!==ind)throw Error(vp.w+': could not select '+ind+' / got '+siteInd);
    const results=[];
    for(let step=0;step<4;step++){
      await page.evaluate(({ind,step})=>document.querySelector('.i-'+ind+'.pz-w .pz[data-i="'+step+'"]')?.click(),{ind,step});
      await page.waitForTimeout(50);
      results.push(await snapshot());
    }
    // Simulate expansion after translation without relying on an external API.
    await page.evaluate(ind=>{
      const w=document.querySelector('.i-'+ind+'.pz-w');
      w.querySelectorAll('.pz-card .tq,.pz-a span,.pz-card .ans2 span').forEach(el=>el.textContent='Превратите этот список в многоязычный мобильный магазин без перестройки существующих процессов обслуживания и оплаты.');
      w.querySelectorAll('.fr .u-h').forEach(el=>el.textContent='Заказы и взаимодействие с посетителями');
      const cap=w.querySelector('.pz-cap span');if(cap)cap.textContent='Продолжение сценария с более длинным описанием взаимодействия и этапов';
    },ind);
    await page.waitForTimeout(100);
    results.push(await snapshot());
    const stableKeys=['phone','dv','screen','caption','quoteStage'];
    for(const key of stableKeys){
      const b=results[0][key];
      if(!b)throw Error(vp.w+' '+ind+': missing '+key);
      for(const item of results.slice(1)){
        const v=item[key];
        for(const dim of ['top','left','height','width']){
          if(Math.abs(v[dim]-b[dim])>1.2)throw Error(vp.w+' '+ind+': '+key+'.'+dim+' jumps '+JSON.stringify([b,v]));
        }
      }
    }
    for(const snap of results){
      if(snap.scrollWidth>snap.viewport+2)throw Error(vp.w+' '+ind+': horizontal overflow '+JSON.stringify(snap));
      if(Math.abs(snap.phone.width-snap.dv.width)>1.2||Math.abs(snap.phone.height-snap.dv.height)>1.2)throw Error(vp.w+' '+ind+': phone frame mismatches stage '+JSON.stringify(snap));
      for(const frame of snap.frames){
        if(Math.abs(frame.height-snap.screen.height)>1.2||Math.abs(frame.width-snap.screen.width)>1.2)
          throw Error(vp.w+' '+ind+': uneven phone animation frame '+JSON.stringify({frame,screen:snap.screen}));
      }
      if(vp.w<768){
        if(snap.quotes.length!==4)throw Error(vp.w+' '+ind+': mobile quote cards missing');
        for(const q of snap.quotes){
          if(Math.abs(q.height-snap.quoteStage.height)>1.2||Math.abs(q.width-snap.quoteStage.width)>1.2)
            throw Error(vp.w+' '+ind+': quote cards differ in size '+JSON.stringify({q,stage:snap.quoteStage}));
        }
      }
    }
    baselineByIndustry[ind]=results[0];
  }
  console.log('PASS fixed multi-language four-step storyboard',vp.w,Object.keys(baselineByIndustry).join(','));
  await context.close();
}

await browser.close();