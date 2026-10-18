import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
const targets=[
 {name:'diego-original',url:'https://diegoarredondo.com/kindtip/index.html'},
 {name:'oido-visual-merchant',url:'https://dokarpov.github.io/oido-site/pilot-preview/index.html'},
 {name:'oido-visual-guest',url:'https://dokarpov.github.io/oido-site/pilot-preview/guest.html?m=demo-la-curandera&test=1'}
];
await mkdir('artifacts/compare-kindtip',{recursive:true});
const browser=await chromium.launch({headless:true});
for(const t of targets){
 const ctx=await browser.newContext({viewport:{width:390,height:844},ignoreHTTPSErrors:false,serviceWorkers:'block'});
 const page=await ctx.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message.slice(0,180)));
 const failed=[];page.on('requestfailed',r=>failed.push({url:r.url().split('?')[0],reason:r.failure()?.errorText}));
 const result={name:t.name,url:t.url};
 try{
  const resp=await page.goto(t.url,{waitUntil:'domcontentloaded',timeout:23000});
  result.status=resp?.status();
  result.title=await page.title();
  await page.waitForTimeout(1100);
  result.ui=await page.evaluate(()=>({
   lang:document.documentElement.lang,
   headings:[...document.querySelectorAll('h1,h2')].map(x=>x.innerText?.trim().slice(0,90)).filter(Boolean).slice(0,18),
   buttons:[...document.querySelectorAll('button,[role=button],a')].filter(x=>x.getClientRects().length&&x.innerText?.trim()).map(x=>x.innerText.trim().slice(0,64)).slice(0,35),
   forms:[...document.querySelectorAll('form')].map(x=>({id:x.id,method:x.method,fields:[...x.querySelectorAll('input,select,textarea')].map(f=>({type:f.type,name:f.name,id:f.id,placeholder:f.placeholder?.slice(0,50)})).slice(0,15)})).slice(0,5),
   scripts:[...document.scripts].filter(x=>x.src).map(x=>new URL(x.src).pathname).slice(0,25),
   titleText:document.body.innerText?.slice(0,700),
   width:document.documentElement.scrollWidth,
   viewport:window.innerWidth,
   languageSwitch:[...document.querySelectorAll('[lang],button[data-lang]')].length,
   iframeSources:[...document.querySelectorAll('iframe')].map(x=>x.src).slice(0,4),
   backendSourceHints:{
    apiPHP:document.documentElement.outerHTML.includes('api.php'),
    fetchCalls:document.documentElement.outerHTML.split('fetch(').length-1,
    localStorage:document.documentElement.outerHTML.includes('localStorage'),
    paymentProviderNames:['stripe','paypal','mollie'].filter(x=>document.documentElement.outerHTML.toLowerCase().includes(x))
   },
   visibleInputFields:[...document.querySelectorAll('input,select')].filter(x=>x.getClientRects().length).map(x=>({type:x.type,id:x.id,placeholder:x.placeholder?.slice(0,75)})).slice(0,12),
   navigableVenueLinks:[...document.querySelectorAll('a[href]')].filter(x=>/Go|console/i.test(x.innerText||'') && x.href.startsWith(location.origin)).map(x=>({text:x.innerText,pathname:new URL(x.href).pathname,search:new URL(x.href).search})).slice(0,5)
  }));
  await page.screenshot({path:'artifacts/compare-kindtip/'+t.name+'-390.png',fullPage:true,timeout:15000});
  if(t.name==='diego-original'){
   const venue=await page.locator('a[href]').filter({hasText:'Go'}).first().getAttribute('href').catch(()=>null);
   if(venue){
    const loc=new URL(venue,t.url);
    if(loc.origin===new URL(t.url).origin){
     const first=await page.goto(loc.href,{waitUntil:'domcontentloaded',timeout:18000});
     await page.waitForTimeout(500);
     const detail=()=>page.evaluate(()=>({title:document.title,visibleText:document.body.innerText?.slice(0,350),visibleInputs:[...document.querySelectorAll('input')].filter(x=>x.getClientRects().length).map(x=>({type:x.type,placeholder:x.placeholder})),horizontalOverflow:document.documentElement.scrollWidth>innerWidth+2}));
     const screen1=await detail();await page.reload({waitUntil:'domcontentloaded',timeout:18000});await page.waitForTimeout(400);const screen2=await detail();
     result.directVenue={route:loc.pathname+loc.search,firstStatus:first.status(),onNavigation:screen1,onReload:screen2};
     await page.screenshot({path:'artifacts/compare-kindtip/diego-direct-venue-390.png',fullPage:true,timeout:15000});
    }
   }
  }
 }catch(e){result.error=String(e).slice(0,500);}
 result.jsErrors=errors.slice(0,8);
 result.failedRequests=failed.slice(0,8);
 console.log('READ_ONLY_COMPARE '+JSON.stringify(result));
 await ctx.close();
}
await browser.close();
