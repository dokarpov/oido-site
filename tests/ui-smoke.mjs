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

await mkdir('artifacts/ui', {recursive:true});
const browser = await chromium.launch({headless:true});

for (const vp of viewports) {
  const context = await browser.newContext({
    viewport:{width:vp.width,height:vp.height},
    locale:'en-GB'
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
      const rect = header?.getBoundingClientRect();
      return {
        lang:document.documentElement.lang,
        scrollWidth:document.documentElement.scrollWidth,
        viewport:window.innerWidth,
        menu:!!menu,
        menuVisible:!!menu && getComputedStyle(menu).display !== 'none',
        picker:!!picker,
        pickerVisible:!!picker && getComputedStyle(picker).display !== 'none' && getComputedStyle(panel).display !== 'none',
        panelVisible:!!panel && getComputedStyle(panel).display !== 'none',
        headerLeft:rect?.left ?? 0,
        headerRight:rect?.right ?? 0,
        headerWidth:rect?.width ?? 0,
        h1:!!document.querySelector('h1'),
        mobileThemeVisible: window.innerWidth <= 700 && !!document.querySelector('.site .hdi>.thm') &&
          getComputedStyle(document.querySelector('.site .hdi>.thm')).display !== 'none'
      };
    });

    if (!closed.menu || !closed.menuVisible) throw new Error(item.name+' '+vp.name+': compact menu missing');
    if (!closed.picker) throw new Error(item.name+' '+vp.name+': language control missing from menu');
    if (closed.pickerVisible || closed.panelVisible) throw new Error(item.name+' '+vp.name+': language selector visible before menu opens');
    if (!closed.h1) throw new Error(item.name+' '+vp.name+': H1 missing');
    if (closed.scrollWidth > closed.viewport + 2) throw new Error(item.name+' '+vp.name+': horizontal overflow '+closed.scrollWidth+' > '+closed.viewport);
    if (closed.headerLeft < -1 || closed.headerRight > closed.viewport + 1) throw new Error(item.name+' '+vp.name+': header escapes viewport');
    if (closed.mobileThemeVisible) throw new Error(item.name+' '+vp.name+': duplicate theme control remains in mobile header');
    if (errors.length) throw new Error(item.name+' '+vp.name+': page errors '+errors.join(' | '));

    await page.screenshot({path:`artifacts/ui/${item.name}-${vp.name}-closed.png`,fullPage:false});

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
        panelTop:pr?.top ?? 0,
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

await browser.close();
