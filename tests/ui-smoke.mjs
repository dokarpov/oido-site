
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const base = process.env.BASE_URL || 'http://127.0.0.1:4173';
const pages = [
  {name:'main', path:'/index.html?lang=en'},
  {name:'investors', path:'/investors/index.html?lang=en'}
];
const viewports = [
  {name:'mobile', width:375, height:812},
  {name:'tablet', width:768, height:1024},
  {name:'desktop', width:1440, height:1000}
];

await mkdir('artifacts/ui', {recursive:true});
const browser = await chromium.launch({headless:true});
let failed = false;

for (const vp of viewports) {
  const context = await browser.newContext({viewport:{width:vp.width,height:vp.height}});
  const page = await context.newPage();

  for (const item of pages) {
    const errors=[];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(base + item.path, {waitUntil:'networkidle'});
    await page.waitForTimeout(300);

    const result = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      width: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
      picker: !!document.querySelector('.oido-lang'),
      h1: !!document.querySelector('h1'),
      minButtons: [...document.querySelectorAll('button,a.btn')]
        .filter(el => getComputedStyle(el).display !== 'none')
        .map(el => Math.round(el.getBoundingClientRect().height))
        .filter(Boolean)
    }));

    if (!result.picker) throw new Error(item.name+' '+vp.name+': language selector missing');
    if (!result.h1) throw new Error(item.name+' '+vp.name+': H1 missing');
    if (result.width > result.viewport + 2) throw new Error(item.name+' '+vp.name+': horizontal overflow '+result.width+' > '+result.viewport);
    if (result.minButtons.some(h => h < 40)) throw new Error(item.name+' '+vp.name+': interactive target below 40px');
    if (errors.length) throw new Error(item.name+' '+vp.name+': page errors '+errors.join(' | '));

    if (item.name === 'investors') {
      const theme = await page.evaluate(() => ({
        body:getComputedStyle(document.body).backgroundColor,
        radius:getComputedStyle(document.querySelector('.meetc') || document.querySelector('.tier')).borderRadius
      }));
      if (theme.body !== 'rgb(14, 23, 38)') throw new Error('investors '+vp.name+': investor theme not aligned, bg='+theme.body);
      if (theme.radius !== '0px') throw new Error('investors '+vp.name+': rounded investor cards remain, radius='+theme.radius);
    }

    await page.screenshot({path:`artifacts/ui/${item.name}-${vp.name}.png`, fullPage:true});
    console.log('PASS', item.name, vp.name);
  }
  await context.close();
}

await browser.close();
if (failed) process.exitCode=1;
