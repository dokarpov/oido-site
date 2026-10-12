import {chromium} from 'playwright';
const base=process.env.BASE_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:900},locale:'en-GB'});
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.goto(base+'/index.html?lang=en',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(220);
await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';});
const pile=page.locator('.site .pile');
await pile.scrollIntoViewIfNeeded();
await page.waitForTimeout(650);
const initial=await page.evaluate(()=>{
 const tags=[...document.querySelectorAll('.site .pile .tag')];
 return {tags:tags.length,stage:document.querySelector('.site .pile').getBoundingClientRect().toJSON(),
  originals:tags.map(t=>({left:t.offsetLeft,top:t.offsetTop})),scrollY:scrollY};
});
if(initial.tags!==8)throw Error('Expected eight badges '+JSON.stringify(initial));
const badge=page.locator('.site .pile .tag').nth(1);
const rect=await badge.boundingBox();
await page.mouse.move(rect.x+rect.width*.5,rect.y+rect.height*.5,{steps:6});
await page.waitForTimeout(520);
const play=await page.evaluate(()=>{
 const chip=document.querySelector('.site .pile .tag:nth-child(2)');
 const c=document.querySelector('#oido-pointer-studio');
 return {pointer:!!c,mode:c?.dataset.mode,visible:document.documentElement.classList.contains('oido-custom-cursor'),
  computedCursor:getComputedStyle(chip).cursor,x:getComputedStyle(chip).translate,
  deltas:[...document.querySelectorAll('.site .pile .tag')].map(t=>({
    left:t.offsetLeft,top:t.offsetTop,sx:parseFloat(t.style.getPropertyValue('--oido-scatter-x'))||0,
    sy:parseFloat(t.style.getPropertyValue('--oido-scatter-y'))||0
  }))};
});
if(!play.pointer||play.mode!=='scatter'||!play.visible)throw Error('Custom cursor missing in badge section '+JSON.stringify(play));
if(play.computedCursor!=='none')throw Error('Default cursor still visible over badges '+JSON.stringify(play));
if(!play.deltas.some(v=>Math.abs(v.sx)+Math.abs(v.sy)>5))throw Error('Badge hover is not scattering '+JSON.stringify(play));
if(play.deltas.some((d,i)=>d.left!==initial.originals[i].left||d.top!==initial.originals[i].top))throw Error('Badge changed layout position '+JSON.stringify(play));
const stageHeight=initial.stage.height;
await page.mouse.move(20,20);
await page.waitForTimeout(2100);
const reset=await page.evaluate(()=>[...document.querySelectorAll('.site .pile .tag')].map(t=>({
 sx:parseFloat(t.style.getPropertyValue('--oido-scatter-x'))||0,
 sy:parseFloat(t.style.getPropertyValue('--oido-scatter-y'))||0
})));
if(reset.some(v=>Math.abs(v.sx)+Math.abs(v.sy)>1.5))throw Error('Badges did not settle back '+JSON.stringify(reset));
await page.evaluate(()=>{
 document.documentElement.style.scrollBehavior='auto';
 const el=document.querySelector('[data-sec="scan"]');
 const r=el.getBoundingClientRect(),range=Math.max(1,r.height-innerHeight+69);
 scrollTo(0,Math.round(scrollY+r.top-69+range*.85));
});
await page.waitForTimeout(90);
const early=await page.evaluate(()=>{
 const ind=document.querySelector('.site').dataset.ind;
 const stage=document.querySelector('.i-'+ind+'.sc-stage');
 const beam=stage?.querySelector('.beam');
 return {scroll:scrollY,scanProgress:Number(beam?.style.opacity)||0,beam:beam?.style.transform,lines:[...stage.querySelectorAll('.pp p:not(.pt).is-read')].length};
});
if(!early.beam||early.beam==='translateY(0px)'||early.lines<1)throw Error('Pinned scan did not advance immediately on scroll '+JSON.stringify(early));
if(errors.length)throw Error('Page JS errors '+errors.join('; '));
console.log('PASS cursor, spring scatter, stable layout, reset, and responsive scroll',JSON.stringify({spread:play.deltas.map(v=>[v.sx,v.sy]),early}));
await context.close();
for(const [width,height] of [[390,844],[768,1024]]){
 const touch=width===390;
 const ctx=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,locale:'en-GB'});
 const p=await ctx.newPage();
 await p.goto(base+'/index.html?lang=en',{waitUntil:'domcontentloaded'});
 await p.waitForTimeout(130);
 const st=await p.evaluate(()=>({fine:matchMedia('(hover:hover) and (pointer:fine)').matches,active:document.documentElement.classList.contains('oido-custom-cursor'),badges:document.querySelectorAll('.pile .tag').length,scrollWidth:document.documentElement.scrollWidth,innerWidth:window.innerWidth}));
 if(touch&&(st.fine||st.active))throw Error('Mobile custom cursor appeared '+JSON.stringify(st));
 if(st.scrollWidth>st.innerWidth+2)throw Error('Horizontal overflow '+JSON.stringify(st));
 console.log('PASS pointer adaptation viewport',width);
 await ctx.close();
}
await browser.close();