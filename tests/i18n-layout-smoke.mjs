import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';

const base=process.env.BASE_URL||'http://127.0.0.1:4173';
const i18n=await readFile('shared/oido-i18n.js','utf8');
const b=i18n.indexOf('const LANGUAGES = [');
const e=i18n.indexOf('];',b);
if(b<0||e<0)throw new Error('Language catalogue missing');
const langs=[...i18n.slice(b,e).matchAll(/\['([a-z]{2,3})','[^']+'\]/g)]
 .map(m=>m[1]).filter(s=>s!=='auto');
if(langs.length<40)throw new Error('Expected the full localization catalogue, got '+langs.length);
const rtl=new Set(['ar','he','fa','ur']);
const samples={
 en:'Every order, heard.',
 ru:'Каждый заказ будет услышан, а каждое меню сможет работать на вас.',
 uk:'Кожне замовлення буде почуте, а кожне меню працюватиме для вас.',
 de:'Jede Bestellung zählt: Ihr mehrsprachiges mobiles Schaufenster für Gastronomie.',
 es:'Cada pedido cuenta: una carta para comercios y restaurantes independientes.',
 ca:'Cada comanda compta: un aparador mòbil per a cada establiment.',
 fr:'Chaque commande compte, et votre carte devient une vitrine mobile.',
 pl:'Każde zamówienie się liczy. Wielojęzyczna wizytówka dla małych firm.',
 ar:'كل طلب مهم، وتتحول قائمة الطعام الخاصة بك إلى متجر محمول متعدد اللغات.',
 he:'כל הזמנה חשובה והתפריט שלך הופך לחנות ניידת רב־לשונית.',
 fa:'هر سفارش مهم است و فهرست خدمات شما به یک فروشگاه چندزبانه تبدیل می‌شود.',
 ur:'ہر آرڈر اہم ہے، اور آپ کا مینو ایک موبائل دکان میں تبدیل ہو جاتا ہے۔',
 zh:'让每一笔订单都有回应，让每一份菜单变成多语言移动店面。',
 ja:'すべての注文に応える、店舗のための多言語モバイルメニュー。',
 ko:'모든 주문이 중요합니다. 메뉴를 다국어 모바일 스토어로 전환하세요.',
 hi:'हर ऑर्डर ज़रूरी है: अपना मेनू कई भाषाओं वाले मोबाइल स्टोर में बदलें।',
 bn:'প্রতিটি অর্ডার গুরুত্বপূর্ণ: আপনার মেনুকে বহুভাষিক মোবাইল স্টোরে বদলে দিন।',
 ta:'ஒவ்வொரு ஆர்டரும் முக்கியம்: உங்கள் மெனுவை பன்மொழி மொபைல் கடையாக மாற்றுங்கள்.',
 te:'ప్రతి ఆర్డర్ ముఖ్యమే: మీ మెనూను బహుభాషా మొబైల్ దుకాణంగా మార్చండి.',
 th:'ทุกคำสั่งซื้อมีความหมาย เปลี่ยนเมนูของคุณเป็นร้านค้าบนมือถือหลายภาษา'
};
const description='Independent restaurants, cafés, studios and other small businesses can offer their customers a multilingual, browser-first commerce experience without replacing their existing point-of-sale systems.';
const viewportSizes=[
 {name:'mobile',width:390,height:844},
 {name:'tablet',width:768,height:1024},
 {name:'desktop',width:1280,height:850}
];
const pages=[{name:'business',path:'/index.html?lang=en'},{name:'investor',path:'/investors/index.html?lang=en'}];
const browser=await chromium.launch({headless:true});
let total=0,problems=[];
for(const size of viewportSizes){
 const context=await browser.newContext({viewport:{width:size.width,height:size.height},locale:'en-GB'});
 const page=await context.newPage();
 for(const site of pages){
  const errors=[];const listener=e=>errors.push(String(e));
  page.on('pageerror',listener);
  await page.goto(base+site.path,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(260);
  for(const lang of langs){
   const result=await page.evaluate(({lang,rtl,sample,description,site})=>{
    document.documentElement.lang=lang;
    document.documentElement.dir=rtl?'rtl':'ltr';
    document.body.dir=rtl?'rtl':'ltr';
    const title=document.querySelector(site==='business'?'.hero .h-xl':'.pitch-hero h1');
    const text=document.querySelector(site==='business'?'.hero .hs .lead':'.pitch-hero-lead');
    const companion=document.querySelector(site==='business'?'.hero .hs':'.pitch-proof');
    if(!title||!text||!companion)return {missing:'hero elements'};
    title.textContent=sample;
    text.textContent=description;
    const r=title.getBoundingClientRect(),c=companion.getBoundingClientRect();
    const intersection=Math.max(0,Math.min(r.right,c.right)-Math.max(r.left,c.left))*
      Math.max(0,Math.min(r.bottom,c.bottom)-Math.max(r.top,c.top));
    const documentWidth=document.documentElement.scrollWidth;
    const horizontalOverflow=documentWidth>innerWidth+3;
    const titleOverflows=title.scrollWidth>title.clientWidth+3;
    const textOverflows=text.scrollWidth>text.clientWidth+3;
    const badGeometry=[r.width,r.height,c.width,c.height].some(v=>!Number.isFinite(v)||v<1);
    const headingFont=getComputedStyle(title).fontSize;
    const header=document.querySelector('.hdi');
    const hr=header?.getBoundingClientRect();
    return {intersection:Math.round(intersection),horizontalOverflow,titleOverflows,textOverflows,
      badGeometry,headingFont,titleWidth:Math.round(r.width),descriptionWidth:Math.round(c.width),
      headerBeyond:hr?hr.left<-1||hr.right>innerWidth+1:false,viewport:innerWidth,documentWidth};
   },{lang,rtl:rtl.has(lang),sample:samples[lang]||description+' '+description,description:description+' '+description,site:site.name});
   const issue=Object.entries(result).filter(([k,v])=>[
    'missing','horizontalOverflow','titleOverflows','textOverflows','badGeometry','headerBeyond'
   ].includes(k)&&!!v);
   if(result.intersection>4)issue.push(['intersection',result.intersection]);
   if(issue.length)problems.push({site:site.name,size:size.name,lang,result,issues:issue});
   total++;
  }
  if(errors.length)problems.push({site:site.name,size:size.name,errors:errors.slice(0,8)});
  page.off('pageerror',listener);
 }
 await context.close();
}
await browser.close();
if(problems.length){
 console.error('LOCALIZATION LAYOUT FAILURES:',JSON.stringify(problems.slice(0,25),null,2));
 throw new Error(problems.length+' localization layout problems / '+total+' combinations');
}
console.log('PASS '+total+' layout stress combinations ('+langs.length+' languages × '+pages.length+' pages × '+viewportSizes.length+' viewports); language strings are stress fixtures, not editorial translation certification.');
