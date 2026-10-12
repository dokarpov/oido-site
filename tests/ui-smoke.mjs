import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const base = process.env.BASE_URL || 'http://127.0.0.1:4173';
const pages = [
  {name:'main', path:'/index.html'},
  {name:'investors', path:'/investors/index.html'}
];
const viewports = [
  {name:'xs-320', width:320, height:700},
  {name:'mobile-375', width:375, height:812},
  {name:'mobile-390', width:390, height:844},
  {name:'mobile-430', width:430, height:932},
  {name:'tablet', width:768, height:1024},
  {name:'desktop', width:1440, height:1000}
];
const commonLanguages=['en','es','ca'];

await mkdir('artifacts/ui', {recursive:true});
const browser = await chromium.launch({headless:true});

for (const vp of viewports) {
  const isTouch = vp.width <= 430;
  const context = await browser.newContext({
    viewport:{width:vp.width,height:vp.height},
    locale:'en-GB',
    isMobile:isTouch,
    hasTouch:isTouch
  });
  const page = await context.newPage();

  for (const item of pages) {
    const errors=[];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(base + item.path, {waitUntil:'networkidle'});
    await page.waitForTimeout(350);

    const closed = await page.evaluate(() => {
      const header = document.querySelector('.hdi') || document.querySelector('header');
      const picker = document.querySelector('.oido-lang');
      const panel = document.querySelector('.oido-menu-panel');
      const menu = document.querySelector('.oido-menu-btn');
      const footer = document.querySelector('footer');
      const brand = document.querySelector('.oido-brand-spot');
      const rect = header?.getBoundingClientRect();
      return {
        lang:document.documentElement.lang,
        scrollWidth:document.documentElement.scrollWidth,
        viewport:window.innerWidth,
        menu:!!menu,
        menuVisible:!!menu && getComputedStyle(menu).display !== 'none',
        picker:!!picker,
        values:picker ? [...picker.options].map(o=>o.value) : [],
        pickerVisible:!!picker && getComputedStyle(picker).display !== 'none' && getComputedStyle(panel).display !== 'none',
        panelVisible:!!panel && getComputedStyle(panel).display !== 'none',
        headerLeft:rect?.left ?? 0,
        headerRight:rect?.right ?? 0,
        h1:!!document.querySelector('h1'),
        motionReady:document.documentElement.dataset.oidoMotionReady,
        scrollBehavior:getComputedStyle(document.documentElement).scrollBehavior,
        brandNoTranslate:brand?.getAttribute('translate')==='no' && brand?.classList.contains('notranslate'),
        headerLogoCount:header ? header.querySelectorAll('.oido-brand-spot').length : 0,
        footerLogoCount:footer ? footer.querySelectorAll('.oido-footer-brand').length : 0,
        mobileThemeVisible: window.innerWidth <= 700 && !!document.querySelector('.site .hdi>.thm') &&
          getComputedStyle(document.querySelector('.site .hdi>.thm')).display !== 'none',
        offenders:[...document.querySelectorAll('body *')].map(el => {
          const r=el.getBoundingClientRect();
          const cs=getComputedStyle(el);
          return {tag:el.tagName.toLowerCase(), cls:el.className?.toString().slice(0,120) || '', text:(el.textContent||'').trim().replace(/\s+/g,' ').slice(0,80), left:Math.round(r.left), right:Math.round(r.right), width:Math.round(r.width), display:cs.display};
        }).filter(x => x.display !== 'none' && x.width > 0 && (x.left < -2 || x.right > window.innerWidth + 2)).slice(0,20)
      };
    });

    await page.screenshot({path:`artifacts/ui/${item.name}-${vp.name}-closed.png`,fullPage:false});
    if (closed.offenders.length) console.log('OFFENDERS',item.name,vp.name,JSON.stringify(closed.offenders));
    if (!closed.menu || !closed.menuVisible) throw new Error(item.name+' '+vp.name+': compact menu missing');
    if (!closed.picker) throw new Error(item.name+' '+vp.name+': language control missing from menu');
    for (const lang of commonLanguages) if (!closed.values.includes(lang)) throw new Error(item.name+' '+vp.name+': common language missing '+lang);
    if (closed.pickerVisible || closed.panelVisible) throw new Error(item.name+' '+vp.name+': language selector visible before menu opens');
    if (!closed.h1) throw new Error(item.name+' '+vp.name+': H1 missing');
    if (closed.motionReady !== '1') throw new Error(item.name+' '+vp.name+': shared motion layer missing');
    if (closed.scrollBehavior !== 'smooth') throw new Error(item.name+' '+vp.name+': smooth anchor scrolling not enabled');
    if (!closed.brandNoTranslate) throw new Error(item.name+' '+vp.name+': Oído logo not protected from translation');
    if (closed.headerLogoCount !== 1) throw new Error(item.name+' '+vp.name+': expected exactly one header logo, got '+closed.headerLogoCount);
    if (closed.footerLogoCount !== 0) throw new Error(item.name+' '+vp.name+': duplicate footer logo remains, got '+closed.footerLogoCount);
    if (closed.scrollWidth > closed.viewport + 2) throw new Error(item.name+' '+vp.name+': horizontal overflow '+closed.scrollWidth+' > '+closed.viewport);
    if (closed.headerLeft < -1 || closed.headerRight > closed.viewport + 1) throw new Error(item.name+' '+vp.name+': header escapes viewport');
    if (closed.mobileThemeVisible) throw new Error(item.name+' '+vp.name+': duplicate theme control remains in mobile header');
    if (errors.length) throw new Error(item.name+' '+vp.name+': page errors '+errors.join(' | '));

    const brand=page.locator('.oido-brand-spot').first();
    const bb=await brand.boundingBox();
    if(!bb) throw new Error(item.name+' '+vp.name+': logo missing');
    await page.mouse.move(bb.x+Math.max(2,bb.width*.18),bb.y+bb.height*.5);
    await page.waitForTimeout(280);
    const logoVisual=await brand.evaluate(el=>({
      spot:el.style.getPropertyValue('--spot-x'),
      glow:Number(getComputedStyle(el,'::before').opacity),
      mark:getComputedStyle(el.querySelector('.mk')).filter,
      fine:matchMedia('(hover:hover) and (pointer:fine)').matches
    }));
    if(logoVisual.fine){
      if(!logoVisual.spot) throw new Error(item.name+' '+vp.name+': cursor spotlight did not update');
      if(logoVisual.glow<0.9) throw new Error(item.name+' '+vp.name+': desktop logo hover glow is not visible '+JSON.stringify(logoVisual));
      if(!logoVisual.mark || logoVisual.mark==='none') throw new Error(item.name+' '+vp.name+': desktop logo mark glow is not active '+JSON.stringify(logoVisual));
    } else {
      if(logoVisual.glow<0.3) throw new Error(item.name+' '+vp.name+': mobile logo has no static spotlight '+JSON.stringify(logoVisual));
    }

    await page.locator('.oido-menu-btn').click();
    await page.waitForTimeout(120);
    const opened = await page.evaluate(() => {
      const panel=document.querySelector('.oido-menu-panel');
      const picker=document.querySelector('.oido-lang');
      const menu=document.querySelector('.oido-menu-btn');
      const pr=panel?.getBoundingClientRect();
      return {
        expanded:menu?.getAttribute('aria-expanded'),
        panelVisible:!!panel && getComputedStyle(panel).display !== 'none',
        pickerVisible:!!picker && getComputedStyle(picker).display !== 'none',
        panelLeft:pr?.left ?? 0,
        panelRight:pr?.right ?? 0,
        selected:picker?.value
      };
    });
    if (opened.expanded !== 'true' || !opened.panelVisible || !opened.pickerVisible) throw new Error(item.name+' '+vp.name+': menu does not expose language control');
    if (opened.panelLeft < -1 || opened.panelRight > vp.width + 1) throw new Error(item.name+' '+vp.name+': menu panel escapes viewport');
    if (opened.selected !== 'auto') throw new Error(item.name+' '+vp.name+': automatic language is not the default');

    await page.screenshot({path:`artifacts/ui/${item.name}-${vp.name}-menu.png`,fullPage:false});

    if (item.name === 'investors') {
      const theme = await page.evaluate(() => ({
        body:getComputedStyle(document.body).backgroundColor,
        radius:getComputedStyle(document.querySelector('.meetc') || document.querySelector('.tier')).borderRadius
      }));
      if (theme.body !== 'rgb(14, 23, 38)') throw new Error('investors '+vp.name+': investor theme mismatch '+theme.body);
      if (theme.radius !== '0px') throw new Error('investors '+vp.name+': rounded investor cards remain '+theme.radius);
    }

    await page.keyboard.press('Escape');
    if (await page.locator('.oido-menu-btn').getAttribute('aria-expanded') !== 'false') throw new Error(item.name+' '+vp.name+': Escape does not close menu');
    console.log('PASS',item.name,vp.name);
  }
  await context.close();
}

// Verify that navigation scrolls through intermediate positions rather than jumping.
{
  const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'en-GB'});
  const page=await context.newPage();
  await page.goto(base+'/index.html?lang=en',{waitUntil:'networkidle'});
  const target=await page.locator('#how').evaluate(el=>el.getBoundingClientRect().top+scrollY);
  await page.locator('.nv a[href="#how"]').click();
  const samples=[];
  for(const wait of [40,60,80,120,180]){
    await page.waitForTimeout(wait);
    samples.push(await page.evaluate(()=>scrollY));
  }
  const mid=samples.find(v=>v>0&&v<target-40);
  if(mid==null) throw new Error('anchor scroll did not animate through an intermediate position: '+JSON.stringify({samples,target}));
  await page.waitForTimeout(500);
  const end=await page.evaluate(()=>scrollY);
  if(end<=mid) throw new Error('smooth anchor scroll did not continue: '+JSON.stringify({mid,end,target,samples}));
  console.log('PASS smooth anchor motion');
  await context.close();
}


// Scroll-driven scenes must advance smoothly and never rewind when the reader scrolls upward.
{
  const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'en-GB'});
  const page=await context.newPage();
  await page.goto(base+'/index.html?lang=en',{waitUntil:'networkidle'});
  await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';});

  const sceneY=async (selector,fraction)=>page.evaluate(({selector,fraction})=>{
    const el=document.querySelector(selector);
    const r=el.getBoundingClientRect();
    const top=scrollY+r.top;
    const hd=69;
    const range=Math.max(1,r.height-innerHeight+hd);
    return Math.max(0,top-hd+range*fraction);
  },{selector,fraction});

  const snap=async ()=>page.evaluate(()=>{
    const ind=document.querySelector('.site').dataset.ind;
    const scan=document.querySelector('.i-'+ind+'.sc-stage');
    const setup=document.querySelector('[data-sec="setup"]');
    const pain=document.querySelector('.i-'+ind+'.pz-w');
    const matrixY=el=>{
      if(!el)return 0;
      const tr=getComputedStyle(el).transform;
      if(!tr||tr==='none')return 0;
      try{return new DOMMatrixReadOnly(tr).m42||0;}catch{return 0;}
    };
    const activeIndex=(nodes,cls)=>Math.max(0,[...nodes].findIndex(n=>cls(n)));
    return {
      scanRows:[...scan.querySelectorAll('.u-row,.u-sug')].filter(x=>x.classList.contains('is-in')).length,
      scanStep:activeIndex(document.querySelectorAll('.sc-steps li'),x=>x.classList.contains('is-on')),
      beamY:matrixY(scan.querySelector('.beam')),
      setupStep:activeIndex(setup.querySelectorAll('.stp'),x=>x.getAttribute('aria-pressed')==='true'),
      painStep:activeIndex(pain.querySelectorAll('.pz'),x=>x.classList.contains('is-on'))
    };
  });

  const scanDown=await sceneY('[data-sec="scan"]',.76);
  await page.evaluate(y=>scrollTo(0,y),scanDown);
  await page.waitForTimeout(1000);
  const scanA=await snap();
  const scanUp=await sceneY('[data-sec="scan"]',.20);
  await page.evaluate(y=>scrollTo(0,y),scanUp);
  await page.waitForTimeout(650);
  const scanB=await snap();
  if(scanB.scanRows<scanA.scanRows||scanB.scanStep<scanA.scanStep||scanB.beamY+1<scanA.beamY)
    throw new Error('scan animation rewound on upward scroll: '+JSON.stringify({scanA,scanB}));

  const setupDown=await sceneY('[data-sec="setup"]',.78);
  await page.evaluate(y=>scrollTo(0,y),setupDown);
  await page.waitForTimeout(1000);
  const setupA=await snap();
  const setupUp=await sceneY('[data-sec="setup"]',.24);
  await page.evaluate(y=>scrollTo(0,y),setupUp);
  await page.waitForTimeout(650);
  const setupB=await snap();
  if(setupB.setupStep<setupA.setupStep)
    throw new Error('setup animation rewound on upward scroll: '+JSON.stringify({setupA,setupB}));

  const painDown=await sceneY('[data-sec="pains"]',.70);
  await page.evaluate(y=>scrollTo(0,y),painDown);
  await page.waitForTimeout(1100);
  const painA=await snap();
  const painUp=await sceneY('[data-sec="pains"]',.20);
  await page.evaluate(y=>scrollTo(0,y),painUp);
  await page.waitForTimeout(650);
  const painB=await snap();
  if(painB.painStep<painA.painStep)
    throw new Error('pain scenario rewound on upward scroll: '+JSON.stringify({painA,painB}));

  const motionCss=await page.evaluate(()=>({
    stamp:getComputedStyle(document.querySelector('.stamp')).transitionDuration,
    beam:getComputedStyle(document.querySelector('.beam')).transitionDuration,
    bar:getComputedStyle(document.querySelector('.sb')).transitionDuration,
    tag:getComputedStyle(document.querySelector('.tag')).transitionDuration,
    containers:['.rail-in','.sc-stage','.pz-w','.su-g','.pile'].map(sel=>({
      sel,
      isolation:getComputedStyle(document.querySelector(sel)).isolation,
      position:getComputedStyle(document.querySelector(sel)).position
    }))
  }));
  for(const [key,value] of Object.entries({stamp:motionCss.stamp,beam:motionCss.beam,bar:motionCss.bar,tag:motionCss.tag}))
    if(!value||value.split(',').every(v=>parseFloat(v)===0)) throw new Error(key+' has no smoothing transition: '+JSON.stringify(motionCss));
  for(const c of motionCss.containers)
    if(c.isolation!=='isolate'||c.position==='static') throw new Error('motion surface is not locally contained: '+JSON.stringify(c));

  console.log('PASS forward-only contained motion');
  await context.close();
}


// The four-step setup scene is a single autoplay timeline: scroll starts it once, then it runs forward on time.
for (const viewport of [{width:390,height:844},{width:1440,height:1000}]) {
  const context=await browser.newContext({viewport,locale:'en-GB'});
  const page=await context.newPage();
  await page.goto(base+'/index.html?lang=en',{waitUntil:'networkidle'});
  await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';});

  const place=async ratio=>{
    const y=await page.evaluate(({ratio})=>{
      const sec=document.querySelector('[data-sec="setup"]');
      const top=scrollY+sec.getBoundingClientRect().top;
      return Math.max(0,top-innerHeight*ratio);
    },{ratio});
    await page.evaluate(y=>scrollTo(0,y),y);
  };
  const snap=()=>page.evaluate(()=>{
    const site=document.querySelector('.site');
    const panel=document.querySelector('.i-'+site.dataset.ind+'.bpanel');
    const steps=[...document.querySelectorAll('[data-sec="setup"] .stp')];
    const stepWrap=document.querySelector('[data-sec="setup"] .stps').getBoundingClientRect();
    return {
      height:panel.getBoundingClientRect().height,
      active:steps.findIndex(x=>x.getAttribute('aria-pressed')==='true'),
      tops:steps.map(x=>x.getBoundingClientRect().top-stepWrap.top),
      sides:[...panel.querySelectorAll('.side')].map(x=>{
        const cs=getComputedStyle(x);
        return {opacity:Number(cs.opacity),visibility:cs.visibility,display:cs.display};
      })
    };
  });

  await place(.80);
  await page.waitForTimeout(220);
  const idle=await snap();
  if(idle.active!==0) throw new Error('setup started before entering trigger zone at '+viewport.width+': '+JSON.stringify(idle));

  await place(.68);
  await page.waitForTimeout(1100);
  const blend01=await snap();
  if(blend01.active!==1) throw new Error('setup autoplay did not reach step 2 at '+viewport.width+': '+JSON.stringify(blend01));
  if(blend01.sides.filter(x=>x.visibility==='visible'&&x.opacity>.03).length<2)
    throw new Error('setup step 1→2 is not crossfaded at '+viewport.width+': '+JSON.stringify(blend01));

  await page.waitForTimeout(500);
  const settled1=await snap();

  await place(.95);
  await page.waitForTimeout(850);
  const forward2=await snap();
  if(forward2.active<2) throw new Error('setup rewound/stalled after upward scroll at '+viewport.width+': '+JSON.stringify({settled1,forward2}));

  await page.waitForTimeout(1250);
  const final=await snap();
  if(final.active!==3) throw new Error('setup autoplay did not finish at '+viewport.width+': '+JSON.stringify(final));

  const states=[idle,blend01,settled1,forward2,final];
  for(let i=1;i<states.length;i++){
    for(let k=0;k<states[i].tops.length;k++){
      if(Math.abs(states[i].tops[k]-states[i-1].tops[k])>1)
        throw new Error('setup tab hops vertically at '+viewport.width+': '+JSON.stringify(states.map(x=>x.tops)));
    }
  }
  const heights=states.map(x=>x.height);
  if(Math.max(...heights)-Math.min(...heights)>1)
    throw new Error('setup stage height jumps between steps at '+viewport.width+': '+JSON.stringify(heights));
  for(const state of states)
    if(state.sides.some(x=>x.display==='none'))
      throw new Error('setup side panels use display switching at '+viewport.width+': '+JSON.stringify(state));

  console.log('PASS one-shot smooth forward setup '+viewport.width);
  await context.close();
}


// The four numbered pain scenarios also stay in one stage and crossfade instead of display-jumping.
for (const viewport of [{width:390,height:844},{width:1440,height:1000}]) {
  const context=await browser.newContext({viewport,locale:'en-GB'});
  const page=await context.newPage();
  await page.goto(base+'/index.html?lang=en',{waitUntil:'networkidle'});
  await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';});

  const go=async fraction=>{
    const y=await page.evaluate(({fraction,width})=>{
      const sec=document.querySelector('[data-sec="pains"]');
      const r=sec.getBoundingClientRect();
      const top=scrollY+r.top;
      const hd=width>=1000?69:65;
      const range=Math.max(1,r.height-innerHeight+hd);
      return Math.max(0,top-hd+range*fraction);
    },{fraction,width:viewport.width});
    await page.evaluate(y=>scrollTo(0,y),y);
    await page.waitForTimeout(1100);
    return page.evaluate(()=>{
      const site=document.querySelector('.site');
      const w=document.querySelector('.i-'+site.dataset.ind+'.pz-w');
      const stage=w.querySelector('.pz-r');
      const sr=stage.getBoundingClientRect();
      return {
        top:sr.top,
        height:sr.height,
        scenes:[...w.querySelectorAll('.scn')].map(x=>({
          display:getComputedStyle(x).display,
          visibility:getComputedStyle(x).visibility,
          opacity:Number(getComputedStyle(x).opacity)
        })),
        cards:[...w.querySelectorAll('.pz-cur>.pz-card')].map(x=>({
          visibility:getComputedStyle(x).visibility,
          opacity:Number(getComputedStyle(x).opacity)
        }))
      };
    });
  };

  const before=await go(.16);
  const blend=await go(.245);
  const after=await go(.33);
  if(blend.scenes.some(x=>x.display==='none'))
    throw new Error('pain scene still display-switches at '+viewport.width+': '+JSON.stringify(blend));
  if(blend.scenes.filter(x=>x.visibility==='visible'&&x.opacity>.03).length<2)
    throw new Error('pain phone scenarios snap instead of crossfading at '+viewport.width+': '+JSON.stringify(blend));
  if(blend.cards.filter(x=>x.visibility==='visible'&&x.opacity>.03).length<2)
    throw new Error('pain text cards snap instead of crossfading at '+viewport.width+': '+JSON.stringify(blend));
  const heights=[before.height,blend.height,after.height];
  if(Math.max(...heights)-Math.min(...heights)>1)
    throw new Error('pain stage changes height while switching points at '+viewport.width+': '+JSON.stringify({before,blend,after}));

  console.log('PASS stable crossfaded four-point pain scene '+viewport.width);
  await context.close();
}

// Automatic locale must ignore stale legacy language state and prefer the current device language.
{
  const context=await browser.newContext({viewport:{width:390,height:844},locale:'en-GB'});
  const page=await context.newPage();
  await page.addInitScript(()=>{
    localStorage.setItem('oido.locale','pl');
    localStorage.setItem('oido.locale.mode','manual');
    localStorage.setItem('oido.locale.modeVersion','2026-10-11.7');
    document.cookie='googtrans=/en/pl;path=/;SameSite=Lax';
  });
  await page.goto(base+'/index.html',{waitUntil:'networkidle'});
  await page.waitForTimeout(250);
  const state=await page.evaluate(()=>({
    lang:document.documentElement.lang,
    stored:localStorage.getItem('oido.locale'),
    mode:localStorage.getItem('oido.locale.mode'),
    picker:document.querySelector('.oido-lang')?.value,
    cookie:document.cookie
  }));
  if(state.lang!=='en'||state.stored!==null||state.mode!==null||state.picker!=='auto')
    throw new Error('automatic locale kept stale Polish state: '+JSON.stringify(state));
  if(/googtrans=\/en\/pl/.test(state.cookie))
    throw new Error('stale Polish Google cookie survived automatic mode: '+JSON.stringify(state));
  console.log('PASS automatic locale clears stale Polish state');
  await context.close();
}

// If the device/browser does not expose a supported language, automatic mode falls back to network/IP country.
{
  const context=await browser.newContext({viewport:{width:390,height:844},locale:'zz-ZZ'});
  const page=await context.newPage();
  await page.route('https://ipapi.co/country/', async route => route.fulfill({status:200,contentType:'text/plain',body:'ES'}));
  await page.route('https://translate.google.com/translate_a/element.js**', async route => {
    await route.fulfill({contentType:'application/javascript',body:`
      window.google={translate:{}};
      google.translate.TranslateElement=function(opts,id){
        var host=document.getElementById(id);var s=document.createElement('select');s.className='goog-te-combo';
        ['en','es'].forEach(function(v){var o=document.createElement('option');o.value=v;o.textContent=v;s.appendChild(o);});host.appendChild(s);
      };
      google.translate.TranslateElement.InlineLayout={SIMPLE:1};
      window.googleTranslateElementInit();
    `});
  });
  await page.goto(base+'/index.html',{waitUntil:'networkidle'});
  await page.waitForTimeout(250);
  const state=await page.evaluate(()=>({lang:document.documentElement.lang,picker:document.querySelector('.oido-lang')?.value,mode:localStorage.getItem('oido.locale.mode')}));
  if(state.lang!=='es'||state.picker!=='auto'||state.mode!==null)
    throw new Error('IP-country fallback did not select Spanish automatically: '+JSON.stringify(state));
  console.log('PASS automatic locale falls back to IP country');
  await context.close();
}


// The 4-step setup story is one-shot, but must never trap native reverse scrolling.
{
  const context=await browser.newContext({viewport:{width:390,height:844},locale:'en-GB'});
  const page=await context.newPage();
  await page.goto(base+'/index.html?lang=en',{waitUntil:'networkidle'});
  await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';});

  const layout=await page.evaluate(()=>{
    const sec=document.querySelector('[data-sec="setup"]');
    const inner=sec.querySelector('.pinin');
    return {
      sectionHeight:sec.getBoundingClientRect().height,
      viewport:innerHeight,
      innerPosition:getComputedStyle(inner).position
    };
  });
  if(layout.sectionHeight>layout.viewport*1.8)
    throw new Error('setup still behaves like a long pinned scroll trap: '+JSON.stringify(layout));
  if(layout.innerPosition==='sticky'||layout.innerPosition==='fixed')
    throw new Error('setup visual remains pinned: '+JSON.stringify(layout));

  const target=await page.evaluate(()=>{
    const sec=document.querySelector('[data-sec="setup"]');
    return scrollY+sec.getBoundingClientRect().top+Math.min(180,sec.getBoundingClientRect().height*.25);
  });
  await page.evaluate(y=>scrollTo(0,y),target);
  await page.waitForTimeout(1100);
  const down=await page.evaluate(()=>({
    y:scrollY,
    step:[...document.querySelectorAll('.stp')].findIndex(x=>x.getAttribute('aria-pressed')==='true')
  }));
  await page.evaluate(()=>scrollBy(0,-500));
  await page.waitForTimeout(250);
  const up=await page.evaluate(()=>({
    y:scrollY,
    step:[...document.querySelectorAll('.stp')].findIndex(x=>x.getAttribute('aria-pressed')==='true')
  }));
  if(!(up.y<down.y-300))
    throw new Error('reverse native scroll was obstructed: '+JSON.stringify({down,up}));
  if(up.step<down.step)
    throw new Error('one-shot setup animation rewound while scrolling back: '+JSON.stringify({down,up}));

  console.log('PASS setup animation does not trap reverse scroll');
  await context.close();
}

// Verify the static-host Google Translate fallback without calling the external service in CI.
{
  const context=await browser.newContext({viewport:{width:390,height:844},locale:'en-GB'});
  const page=await context.newPage();
  await page.route('https://translate.google.com/translate_a/element.js**', async route => {
    await route.fulfill({
      contentType:'application/javascript',
      body:`
        window.google={translate:{}};
        google.translate.TranslateElement=function(opts,id){
          var host=document.getElementById(id);
          var s=document.createElement('select');s.className='goog-te-combo';
          ['en','es','ca','fr','de','it','pt','ru','uk','ar','iw','zh-CN','ja','ko','hi','id','vi','th','tl'].forEach(function(v){var o=document.createElement('option');o.value=v;o.textContent=v;s.appendChild(o);});
          s.addEventListener('change',function(){
            if(s.value==='es'){
              var a=[...document.querySelectorAll('a')].find(function(x){return x.textContent.trim()==='How it works';});
              if(a)a.textContent='Cómo funciona';
              var hidden=[...document.querySelectorAll('.i-rest')].find(function(x){return x.textContent.includes('Orders');});
              if(hidden && getComputedStyle(hidden).display!=='none'){
                document.documentElement.dataset.mockHiddenTranslated='1';
                [...hidden.querySelectorAll('*')].forEach(function(el){
                  if(el.childNodes.length===1 && el.firstChild.nodeType===3 && el.textContent.trim()==='Orders')el.firstChild.nodeValue='Pedidos';
                });
              }
              document.documentElement.classList.add('translated-ltr');
            }
          });
          host.appendChild(s);
        };
        google.translate.TranslateElement.InlineLayout={SIMPLE:1};
        window.googleTranslateElementInit();
      `
    });
  });
  await page.goto(base+'/index.html?lang=es',{waitUntil:'networkidle'});
  await page.waitForTimeout(350);
  const state=await page.evaluate(()=>({
    provider:window.__oidoI18n?.provider,
    lang:document.documentElement.lang,
    nav:[...document.querySelectorAll('a')].some(a=>a.textContent.trim()==='Cómo funciona'),
    combo:document.querySelector('.goog-te-combo')?.value,
    menuLabel:document.querySelector('.oido-menu-label span')?.textContent.trim(),
    investorHref:[...document.querySelectorAll('a')].find(a=>a.textContent.includes('invest'))?.getAttribute('href') || '',
    stored:localStorage.getItem('oido.locale'),
    hiddenVariantTranslated:document.documentElement.dataset.mockHiddenTranslated==='1',
    googleChromeVisible:[...document.querySelectorAll('.goog-te-banner-frame,iframe.skiptranslate,.VIpgJd-ZVi9od-ORHb-OEVmcd')].some(el=>getComputedStyle(el).display!=='none')
  }));
  if(state.provider!=='google'||state.lang!=='es'||!state.nav||state.combo!=='es') throw new Error('static multilingual fallback did not activate: '+JSON.stringify(state));
  if(state.menuLabel!=='Idioma') throw new Error('language menu did not localize: '+JSON.stringify(state));
  if(!state.investorHref.includes('lang=es')) throw new Error('language was not preserved across internal navigation: '+JSON.stringify(state));
  if(state.stored!=='es') throw new Error('explicit language was not persisted: '+JSON.stringify(state));
  if(!state.hiddenVariantTranslated) throw new Error('inactive industry variants were hidden from translation engine: '+JSON.stringify(state));
  if(state.googleChromeVisible) throw new Error('third-party translation chrome is visible: '+JSON.stringify(state));
  console.log('PASS static Google Translate fallback');
  await context.close();
}

// Unsupported locales must fall back to English instead of exposing untested translation.
{
  const context=await browser.newContext({viewport:{width:390,height:844},locale:'ru-RU'});
  const page=await context.newPage();
  await page.goto(base+'/index.html?lang=ru',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(250);
  const state=await page.evaluate(()=>({
    html:document.documentElement.lang,
    dir:document.documentElement.dir,
    choices:[...document.querySelectorAll('.oido-lang option')].map(o=>o.value),
    exposed:window.__oidoI18n?.supported||[]
  }));
  if(state.html!=='en'||state.dir!=='ltr'||state.choices.join(',')!=='auto,en,es,ca'||state.exposed.join(',')!=='en,es,ca')
    throw new Error('Unreviewed locale was exposed instead of English fallback: '+JSON.stringify(state));
  console.log('PASS production language allowlist and unsupported language fallback');
  await context.close();
}

await browser.close();
