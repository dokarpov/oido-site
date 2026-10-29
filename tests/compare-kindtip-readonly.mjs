import {chromium,webkit} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const liveUrl=process.env.DIEGO_APP_URL||'https://diegoarredondo.com/kindtip/index.html';
const targets=[
 {name:'diego-original',url:liveUrl},
 {name:'oido-visual-merchant',url:'https://dokarpov.github.io/oido-site/pilot-preview/index.html'},
 {name:'oido-visual-guest',url:'https://dokarpov.github.io/oido-site/pilot-preview/guest.html?m=demo-la-curandera&test=1'}
];
await mkdir('artifacts/compare-kindtip',{recursive:true});
const profiles=[
 {name:'mobile-chromium',engine:chromium,viewport:{width:390,height:844},mobile:true},
 {name:'desktop-chromium',engine:chromium,viewport:{width:1440,height:900},mobile:false},
 {name:'iphone-webkit',engine:webkit,viewport:{width:390,height:844},mobile:true}
];
const audit=[];
for(const profile of profiles){
 const browser=await profile.engine.launch({headless:true});
 for(const t of targets){
 const ctx=await browser.newContext({viewport:profile.viewport,isMobile:profile.mobile,hasTouch:profile.mobile,ignoreHTTPSErrors:false,serviceWorkers:'block'});
 const page=await ctx.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message.slice(0,180)));
 const failed=[];page.on('requestfailed',r=>failed.push({url:r.url().split('?')[0],reason:r.failure()?.errorText}));
 const result={name:t.name,url:new URL(t.url).origin+new URL(t.url).pathname,profile:profile.name,source:t.name==='diego-original'?'external-live':'mock-preview'};
 try{
  const resp=await page.goto(t.url,{waitUntil:'domcontentloaded',timeout:23000});
  result.httpStatus=resp?.status();
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
   iframeSources:[...document.querySelectorAll('iframe')].map(x=>{try{const u=new URL(x.src);return u.origin+u.pathname;}catch{return '';}}).slice(0,4),
   backendSourceHints:{
    apiPHP:document.documentElement.outerHTML.includes('api.php'),
    fetchCalls:document.documentElement.outerHTML.split('fetch(').length-1,
    localStorage:document.documentElement.outerHTML.includes('localStorage'),
    paymentProviderNames:['stripe','paypal','mollie'].filter(x=>document.documentElement.outerHTML.toLowerCase().includes(x))
   },
   visibleInputFields:[...document.querySelectorAll('input,select')].filter(x=>x.getClientRects().length).map(x=>({type:x.type,id:x.id,placeholder:x.placeholder?.slice(0,75)})).slice(0,12),
   navigableVenueLinks:[...document.querySelectorAll('a[href]')].filter(x=>/Go|console/i.test(x.innerText||'') && x.href.startsWith(location.origin)).map(x=>({text:x.innerText,pathname:new URL(x.href).pathname,search:'[redacted]'})).slice(0,5)
  }));
  await page.screenshot({path:'artifacts/compare-kindtip/'+t.name+'-'+profile.name+'.png',fullPage:true,timeout:15000});
  if(t.name==='diego-original'&&profile.name==='mobile-chromium'){
   const directGo=page.getByRole('button',{name:'Go',exact:true}).first();
   if(await directGo.count()){
     await directGo.click();
     await page.waitForTimeout(450);
     const detail=()=>page.evaluate(()=>({url:location.pathname+location.search,title:document.title,visibleText:document.body.innerText?.slice(0,340),visibleInputs:[...document.querySelectorAll('input')].filter(x=>x.getClientRects().length).map(x=>({type:x.type,placeholder:x.placeholder})),horizontalOverflow:document.documentElement.scrollWidth>innerWidth+2}));
     const navigated=await detail();const dest=page.url();
     const safe=new URL(dest).origin===new URL(t.url).origin;
     if(safe){
       await page.reload({waitUntil:'domcontentloaded',timeout:18000});await page.waitForTimeout(400);
       result.directVenue={onClick:navigated,onReload:await detail()};
       await page.screenshot({path:'artifacts/compare-kindtip/diego-direct-venue-mobile-chromium.png',fullPage:true,timeout:15000});
     }
   }
  }
  const challenge=/(just a moment|checking your browser|verify you are human|captcha|access denied)/i.test((result.title||'')+' '+(result.ui?.titleText||'').slice(0,260));
  result.status=(result.httpStatus>=400||result.ui?.width>result.ui?.viewport+2||!result.ui?.titleText?.trim()||errors.length||challenge)?'FAIL':'PASS';
  if(challenge)result.challengeDetected=true;
  if(result.directVenue&&(!result.directVenue.onReload.visibleText?.trim()||result.directVenue.onReload.horizontalOverflow)){
    result.directRouteStatus='FAIL';
    result.status='FAIL';
  }else if(result.directVenue){result.directRouteStatus='PASS';}
 }catch(e){result.status='BLOCKED';result.error=String(e).slice(0,500);}
 result.jsErrors=errors.slice(0,8);
 result.failedRequests=failed.slice(0,8);
 audit.push(result);
 console.log('READ_ONLY_COMPARE '+JSON.stringify(result));
 await ctx.close();
}
 await browser.close();
}
const live=audit.filter(x=>x.source==='external-live');
const liveVerified=live.some(x=>x.status==='PASS');
const cleanError=value=>String(value||'').split('|').join('/').split(String.fromCharCode(10)).join(' ').slice(0,90);
const rows=audit.map(x=>'| '+x.name+' / '+x.profile+' | '+x.source+' | '+x.status+' | '+(x.httpStatus??'-')+' | '+(x.directRouteStatus||'-')+' | '+cleanError(x.error)+' |');
const report=[
 '# Diego deployment vs Oído mock visual audit',
 '',
 '**External live app visually loaded:** '+(liveVerified?'YES':'NOT VERIFIED'),
 '',
 '| Target | Source | Status | HTTP | Direct-route reload | Error |',
 '|---|---|---|---:|---|---|',
 ...rows,
 '',
 '**PASS** means public page was visible without an overflow or browser exception. It does not validate authenticated onboarding, persistence, tenant isolation, real transactions, or payments.',
 '',
 '**BLOCKED** means access was unavailable, not that QA passed. Oído pilot-preview uses mock data and is never evidence of Diego’s backend.',
 '',
 'Screenshots: see the uploaded workflow artifact (each viewport has a separate PNG). No form submissions, real orders or credentials were used.',
 ''
].join(String.fromCharCode(10));
await writeFile('artifacts/compare-kindtip/results.json',JSON.stringify({liveVerified,audit},null,2));
await writeFile('artifacts/compare-kindtip/REPORT.md',report);
if(process.env.GITHUB_STEP_SUMMARY)await writeFile(process.env.GITHUB_STEP_SUMMARY,report+String.fromCharCode(10),{flag:'a'});
console.log('LIVE_VISUAL_VERIFIED='+liveVerified+' PROFILES='+profiles.length+' RESULTS='+audit.length);
if(process.env.REQUIRE_LIVE==='true'&&!liveVerified){
 console.error('LIVE GATE FAILED: the external app could not be visually validated.');
 process.exitCode=1;
}
