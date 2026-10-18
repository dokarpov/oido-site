/* Oído visual-review transport. This is NOT the Cloudflare D1 API.
   All entities are synthetic and remain in this browser's localStorage. */
(function(){
'use strict';
const KEY='oido.visual.review.v1', SLUG='demo-la-curandera';
const nativeFetch=window.fetch.bind(window);
const iso=()=>new Date().toISOString();
const uid=()=>Math.random().toString(36).slice(2,14)+Date.now().toString(36);
function seed(){
 const labels=[['Patatas bravas',580],['Croquetas de setas',720],['Pan con tomate',420],['Ensalada de la casa',950],['Café con leche',280],['Agua mineral',220]];
 const items=labels.map(([label,priceCents],i)=>({id:'sample-item-'+(i+1),label,priceCents,approved:true,reviewReason:'Merchant-reviewed sample item'}));
 const time=iso();
 return {merchant:{id:'sample-only',name:'La Curandera · sample venue',slug:SLUG,published:true,accepting_requests:false,created_at:time},
 items, requests:[
 {public_ref:'synthetic-test-000001',status:'fulfilled',is_test:1,item_label:'Patatas bravas',price_cents:580,created_at:time},
 {public_ref:'synthetic-test-000002',status:'submitted',is_test:1,item_label:'Café con leche',price_cents:280,created_at:time}
 ]};
}
let state;
function getState(){
 try{
  const parsed=JSON.parse(localStorage.getItem(KEY)||'null');
  if(parsed&&parsed.merchant&&Array.isArray(parsed.items)&&Array.isArray(parsed.requests))return parsed;
 }catch{}
 const initial=seed();save(initial);return initial;
}
function save(x){state=x;try{localStorage.setItem(KEY,JSON.stringify(x));}catch{}}
state=getState();
try{sessionStorage.setItem('oido.pilot.token','visual-review-sample-token');}catch{}
window.OidoPilotPreview={
 reset(){try{localStorage.removeItem(KEY);sessionStorage.setItem('oido.pilot.token','visual-review-sample-token');}catch{}location.href='./index.html';},
 mode:'synthetic-local-browser-data'
};
function answer(data,status=200,headers={}){
 return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}});
}
function issue(status,error){return answer({error},status);}
function counts(){
 const map=new Map();
 for(const r of state.requests){const key=r.is_test+'|'+r.status;map.set(key,(map.get(key)||0)+1);}
 return [...map].map(([k,n])=>({is_test:Number(k.split('|')[0]),status:k.split('|')[1],n}));
}
function activity(){return{counts:counts(),requests:[...state.requests].reverse(),eventDefinition:'SIMULATED test requests only. No real users, payments, revenue, or staff integration.'};}
function euro(raw){const t=String(raw).trim().replace(/[€$£\s]/g,'').replace(',','.');if(!/^\d{1,5}(\.\d{1,2})?$/.test(t))return null;const n=Number(t);return Number.isFinite(n)&&n<=5000?Math.round(n*100):null;}
function parse(text){
 return String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean).slice(0,80).map((line,i)=>{
 const m=line.match(/^(.*?)(?:\s{2,}|[;|\t]|\s+[-–]\s+|\s+)([€$£]?\s*\d{1,5}(?:[.,]\d{1,2})?\s*[€$£]?)\s*$/);
 const label=m?m[1].trim():line;const price=m?euro(m[2]):null;
 return{id:'local-'+uid(),label:label.slice(0,110),priceCents:price,approved:false,reviewReason:price===null?'Missing or uncertain price':'Confirm item name and price'};
 });
}
function checkBody(options){try{return JSON.parse(options?.body||'{}')}catch{return{}}}
function handle(route,query,options){
 const method=(options?.method||'GET').toUpperCase(),payload=checkBody(options);
 switch(route){
 case 'health':return answer({ready:true,mode:'simulated browser review',payments:'disabled',warning:'There is no live API or persistent database behind this preview.'});
 case 'merchant':return answer({merchant:state.merchant,items:state.items,activity:activity(),paymentStatus:'disabled'});
 case 'import':{
  if(method!=='POST')return issue(405,'Use POST.');
  const value=String(payload.text||'');if(!value.trim()||value.length>24000)return issue(400,'Enter a non-empty list up to 24,000 characters.');
  const list=parse(value);if(!list.length)return issue(400,'No items could be read.');
  state.items=list;state.merchant.published=false;state.merchant.accepting_requests=false;save(state);
  return answer({imported:list.length,requiresReview:list.length,items:list,warning:'New draft: sample storefront unpublished.'});
 }
 case 'review':{
  const list=payload.items;if(!Array.isArray(list)||list.length!==state.items.length||!list.length)return issue(400,'Review all items.');
  const ids=new Set(state.items.map(x=>x.id)),used=new Set(),approved=[];
  for(const x of list){
    if(!ids.has(x.id)||used.has(x.id)||x.approved!==true)return issue(400,'Explicitly approve each unique item.');
    used.add(x.id);
    const label=String(x.label||'').trim(),p=x.priceCents;
    if(label.length<2||label.length>110||!Number.isInteger(p)||p<0||p>500000)return issue(400,'Correct every item name and price before approval.');
    approved.push({id:x.id,label,priceCents:p,approved:true,reviewReason:'Reviewed in this sample browser'});
  }
  state.items=approved;save(state);return answer({approved:approved.length,items:approved});
 }
 case 'publish':{
  if(!state.items.length||state.items.some(x=>!x.approved))return issue(400,'Approve all items first.');
  state.merchant.published=true;save(state);
  return answer({published:true,slug:SLUG,link:new URL('./guest.html?m='+SLUG+'&test=1',location.href).href,acceptingRequests:false,simulation:true});
 }
 case 'public':{
  if(!state.merchant.published||query.get('m')!==SLUG)return issue(404,'The sample storefront is not published. Return to merchant review to approve and publish.');
  return answer({merchant:{name:state.merchant.name,slug:SLUG,acceptingRequests:false},items:state.items.map(x=>({id:x.id,label:x.label,priceCents:x.priceCents})),paymentStatus:'No payment processing: sample only'});
 }
 case 'request':{
  if(method!=='POST')return issue(405,'Use POST.');
  if(!payload.isTest)return issue(409,'Live guest requests are disabled in the visual preview.');
  if(payload.acknowledged!==true)return issue(400,'Confirm the sample-only status.');
  if(query.get('m')&&query.get('m')!==SLUG)return issue(404,'Merchant not found.');
  const key=String(payload.idempotencyKey||'');
  if(key.length<12)return issue(400,'Invalid retry key.');
  const existing=state.requests.find(x=>x.key===key);
  if(existing)return answer({reference:existing.public_ref,status:existing.status,isTest:true,idempotent:true});
  const item=state.items.find(x=>x.id===payload.itemId&&x.approved);
  if(!item||!state.merchant.published)return issue(404,'Item is not available.');
  const ref='sample-'+uid();
  state.requests.push({public_ref:ref,key,status:'submitted',is_test:1,item_label:item.label,price_cents:item.priceCents,created_at:iso()});
  save(state);
  return answer({reference:ref,status:'submitted',isTest:true,paymentStatus:'No real payment or service. Stored in this browser only.'},201);
 }
 case 'request-status':{
  const found=state.requests.find(x=>x.public_ref===query.get('ref'));
  return found?answer({status:found.status,isTest:true,noPayment:true}):issue(404,'Sample request not found.');
 }
 case 'activity':return answer(activity());
 case 'status':{
  const r=state.requests.find(x=>x.public_ref===payload.reference);
  if(!r)return issue(404,'Unknown sample reference.');
  const allowed={submitted:['accepted','declined'],accepted:['fulfilled','declined'],declined:[],fulfilled:[]};
  if(!allowed[r.status].includes(payload.status))return issue(409,'Invalid status transition.');
  r.status=payload.status;save(state);return answer({reference:r.public_ref,status:r.status});
 }
 case 'settings':
  if(payload.acceptingRequests===true)return issue(403,'Live guest requests cannot be enabled in a visual demo. The production backend is not connected.');
  state.merchant.accepting_requests=false;save(state);return answer({acceptingRequests:false,preview:true});
 case 'export':{
  const lines=['reference,status,kind,item,price_eur,created_at',...state.requests.map(x=>[x.public_ref,x.status,'SYNTHETIC_TEST',x.item_label,(x.price_cents/100).toFixed(2),x.created_at].map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(','))];
  return new Response(lines.join('\r\n'),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="oido-SYNTHETIC-visual-review.csv"'}});
 }
 default:return issue(404,'Preview endpoint is not implemented: '+route);
 }
}
window.fetch=function(input,options){
 let url;
 try{url=new URL(typeof input==='string'?input:input.url,location.href);}catch{return nativeFetch(input,options);}
 const marker='/api/pilot/';
 if(url.origin===location.origin&&url.pathname.includes(marker)){
  const route=url.pathname.slice(url.pathname.lastIndexOf(marker)+marker.length);
  return Promise.resolve(handle(route,url.searchParams,options||{}));
 }
 return nativeFetch(input,options);
};
})();
