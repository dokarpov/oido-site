const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search),slug=params.get('m')||'',isTest=params.get('test')==='1';
let merchant=null,items=[],selected=null,reference=null,sentKey=null,lang='en';
const t={
 en:{offer:'Choose an item',request:'Request an item',ack:'I understand this is an unconfirmed request, not a paid order.',send:'Send request',cancel:'Cancel',received:'Request recorded',check:'Check staff status',disabled:'Real guest requests are paused. A test is available to staff.',ready:'Staff is monitoring requests. Request acceptance is not instant.',test:'TEST MODE — no live service or payment; your action creates a test record.',notice:'Supervised pilot. No online payment, tips or instant confirmation. Merchant item names are not automatically translated.',statuses:{submitted:'Waiting for staff to acknowledge',accepted:'Staff accepted your request',declined:'Staff declined your request',fulfilled:'Staff marked request as fulfilled'}},
 es:{offer:'Elige un artículo',request:'Solicitar un artículo',ack:'Entiendo que es una solicitud pendiente, no un pedido pagado ni confirmado.',send:'Enviar solicitud',cancel:'Cancelar',received:'Solicitud registrada',check:'Consultar estado',disabled:'Las solicitudes reales están pausadas. El personal puede hacer una prueba.',ready:'El personal está pendiente. La aceptación no es instantánea.',test:'MODO PRUEBA — sin servicio ni pago; esta acción crea un registro de prueba.',notice:'Piloto supervisado. Sin pago online, propinas ni confirmación inmediata. Los nombres del comerciante no se traducen automáticamente.',statuses:{submitted:'Pendiente de revisión',accepted:'Aceptada por el personal',declined:'Rechazada por el personal',fulfilled:'Marcada como completada'}},
 ca:{offer:'Tria un article',request:'Sol·licita un article',ack:'Entenc que és una sol·licitud pendent, no una comanda pagada ni confirmada.',send:'Envia la sol·licitud',cancel:'Cancel·la',received:'Sol·licitud registrada',check:'Consulta l’estat',disabled:'Les sol·licituds reals estan en pausa. El personal pot fer una prova.',ready:'El personal supervisa les sol·licituds. L’acceptació no és immediata.',test:'MODE PROVA — sense servei ni pagament; aquesta acció crea un registre de prova.',notice:'Pilot supervisat. Sense pagament en línia, propines ni confirmació immediata. Els noms dels articles no es tradueixen automàticament.',statuses:{submitted:'Pendent de revisió',accepted:'Acceptada pel personal',declined:'Rebutjada pel personal',fulfilled:'Marcada com a completada'}}
};
function say(s,error=false){const el=$('message');el.hidden=false;el.classList.toggle('error',error);el.textContent=s;}
async function call(route,{method='GET',payload}={}){
 let resp;try{resp=await fetch('/api/pilot/'+route,{method,headers:{'Accept':'application/json',...(payload?{'Content-Type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined,cache:'no-store'});}catch{throw new Error('Pilot API is unavailable here.');}
 const data=await resp.json().catch(()=>({}));
 if(!resp.ok)throw new Error(data.error||'Request failed');return data;
}
function localize(){
 const x=t[lang];document.documentElement.lang=lang;
 document.querySelectorAll('[data-lang]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lang===lang)));
 $('offer-title').textContent=x.offer;$('request-title').textContent=x.request;$('ack-label').textContent=x.ack;$('send').textContent=x.send;$('cancel').textContent=x.cancel;$('receipt-title').textContent=x.received;$('check').textContent=x.check;$('notice').textContent=isTest?x.test:x.notice;
 $('availability').textContent=merchant?(merchant.acceptingRequests||isTest?x.ready:x.disabled):'';
}
function money(c){return new Intl.NumberFormat(lang==='en'?'en-GB':lang==='ca'?'ca-ES':'es-ES',{style:'currency',currency:'EUR'}).format(c/100);}
function show(items){
 const host=$('catalog');host.replaceChildren();
 if(!items.length){say('No published items.',true);return;}
 for(const item of items){
  const article=document.createElement('article'),name=document.createElement('div'),price=document.createElement('div'),btn=document.createElement('button');
  name.className='item-name';name.textContent=item.label;price.className='cost';price.textContent=money(item.priceCents);
  btn.className='btn';btn.textContent=t[lang].request;btn.disabled=!(isTest||merchant.acceptingRequests);
  btn.addEventListener('click',()=>{selected=item;sentKey=null;$('request-panel').hidden=false;$('receipt').hidden=true;$('chosen').textContent=item.label+' · '+money(item.priceCents);$('ack').checked=false;$('send').disabled=true;$('request-panel').scrollIntoView({block:'start'});});
  article.append(name,price,btn);host.append(article);
 }
}
document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>{lang=b.dataset.lang;localize();if(merchant)show(items);}));
$('ack').addEventListener('change',()=>{$('send').disabled=!$('ack').checked;});
$('cancel').addEventListener('click',()=>{$('request-panel').hidden=true;selected=null;sentKey=null;});
$('send').addEventListener('click',async()=>{
 if(!selected||!$('ack').checked||$('send').disabled)return;
 $('send').disabled=true;
 if(!sentKey)sentKey=crypto.randomUUID().replace(/-/g,'');
 try{
  const r=await call('request',{method:'POST',payload:{slug,itemId:selected.id,idempotencyKey:sentKey,isTest,acknowledged:true}});
  reference=r.reference;$('request-panel').hidden=true;$('receipt').hidden=false;
  $('reference').textContent='Reference: '+reference.slice(0,12)+'… · '+(r.isTest?'TEST':'PILOT');
  $('request-state').textContent=t[lang].statuses[r.status]||r.status;
  $('receipt').scrollIntoView({block:'start'});
 }catch(e){say(e.message,true);$('send').disabled=false;}
});
$('check').addEventListener('click',async()=>{if(!reference)return;try{const r=await call('request-status?ref='+encodeURIComponent(reference));$('request-state').textContent=t[lang].statuses[r.status]||r.status;}catch(e){say(e.message,true);}});
async function init(){
 if(!/^[a-z0-9-]{2,70}$/.test(slug)){say('Missing valid merchant link.',true);return;}
 try{
  const p=await call('public?m='+encodeURIComponent(slug));merchant=p.merchant;items=p.items||[];
  $('name').textContent=merchant.name;localize();show(items);
 }catch(e){say(e.message,true);$('availability').textContent='Storefront unavailable.';}
}
init();
