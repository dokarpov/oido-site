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
const commonLanguages=['en','es','ca','fr','de','it','pt','nl','pl','cs','sk','ro','hu','el','sv','da','no','fi','ru','uk','tr','ar','he','fa','zh','ja','ko','hi','bn','ur','id','ms','vi','th','fil','bg','hr','sr','sl','et','lv','lt','is','ga','af','sw','ta','te'];

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
  await page.waitForTimeout(70);
  const mid=await page.evaluate(()=>scrollY);
  if(!(mid>0 && mid<target-40)) throw new Error('anchor scroll did not animate through an intermediate position: '+JSON.stringify({mid,target}));
  await page.waitForTimeout(700);
  const end=await page.evaluate(()=>scrollY);
  if(end<=mid) throw new Error('smooth anchor scroll did not continue: '+JSON.stringify({mid,end,target}));
  console.log('PASS smooth anchor motion');
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

// RTL locale must mirror reading direction even when the translation engine is external.
{
  const context=await browser.newContext({viewport:{width:390,height:844},locale:'ar'});
  const page=await context.newPage();
  await page.route('https://translate.google.com/translate_a/element.js**', async route => {
    await route.fulfill({
      contentType:'application/javascript',
      body:`
        window.google={translate:{}};
        google.translate.TranslateElement=function(opts,id){
          var host=document.getElementById(id);
          var s=document.createElement('select');s.className='goog-te-combo';
          ['en','ar'].forEach(function(v){var o=document.createElement('option');o.value=v;o.textContent=v;s.appendChild(o);});
          host.appendChild(s);
        };
        google.translate.TranslateElement.InlineLayout={SIMPLE:1};
        window.googleTranslateElementInit();
      `
    });
  });
  await page.goto(base+'/index.html?lang=ar',{waitUntil:'networkidle'});
  await page.waitForTimeout(250);
  const rtl=await page.evaluate(()=>({
    html:document.documentElement.dir,
    body:document.body.dir,
    css:getComputedStyle(document.body).direction,
    menuLeft:document.querySelector('.oido-menu-panel') ? getComputedStyle(document.querySelector('.oido-menu-panel')).left : ''
  }));
  if(rtl.html!=='rtl'||rtl.body!=='rtl'||rtl.css!=='rtl') throw new Error('RTL direction not enforced: '+JSON.stringify(rtl));
  console.log('PASS RTL language direction');
  await context.close();
}

await browser.close();
