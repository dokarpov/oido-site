const $=id=>document.getElementById(id);
const state={token:sessionStorage.getItem('oido.pilot.token')||'',merchant:null,items:[],requests:[],timer:null};
const api='/api/pilot/';
function say(message,error=false){const e=$('status');e.textContent=message;e.classList.toggle('error',error);e.hidden=false;e.scrollIntoView({block:'nearest'});}
function money(c){return Number.isInteger(c)?(c/100).toFixed(2):'';}
async function call(path,{method='GET',payload,download=false}={}){
 const headers={'Accept':download?'text/csv':'application/json'};
 if(payload!==undefined)headers['Content-Type']='application/json';
 if(state.token)headers.Authorization='Bearer '+state.token;
 let response;
 try{response=await fetch(api+path,{method,headers,body:payload!==undefined?JSON.stringify(payload):undefined,cache:'no-store'});}
 catch{throw new Error('Pilot API is unavailable on this host. Cloudflare Pages + D1 is required, not GitHub Pages.');}
 if(!response.ok){let detail={};try{detail=await response.json();}catch{}throw new Error(detail.error||'Request failed ('+response.status+').');}
 return download?response.blob():response.json();
}
function setWorkspace(data){
 state.merchant=data.merchant;state.items=data.items||[];state.requests=data.activity?.requests||[];
 $('access').hidden=true;$('workspace').hidden=false;$('merchant-title').textContent=data.merchant.name+' · '+data.merchant.slug;
 $('publish-detail').textContent=data.merchant.published?'Storefront is published.':'Publishing requires explicit approval of every item.';
 renderReview();renderPublish();renderActivity(data.activity);setProgress();
}
function setProgress(){
 const steps=[true,state.items.length>0&&state.items.every(x=>x.approved),!!state.merchant?.published,!!state.merchant?.published,state.requests.length>0];
 [...document.querySelectorAll('.progress span')].forEach((x,i)=>x.classList.toggle('done',steps[i]));
}
async function refresh(){const x=await call('merchant');setWorkspace(x);}
function renderReview(){
 const host=$('review-area');host.replaceChildren();
 if(!state.items.length){let p=document.createElement('p');p.className='zero';p.textContent='No items imported yet. Add a menu or service list first.';host.append(p);$('approve').disabled=true;return;}
 const table=document.createElement('table'),thead=document.createElement('thead'),header=document.createElement('tr');
 for(const t of ['Item','Price (EUR)','Approval']){const c=document.createElement('th');c.textContent=t;header.append(c);}thead.append(header);table.append(thead);
 const body=document.createElement('tbody');
 for(const item of state.items){
  const tr=document.createElement('tr');tr.dataset.id=item.id;
  const col=document.createElement('td'),name=document.createElement('input');name.type='text';name.maxLength=110;name.value=item.label;name.setAttribute('aria-label','Item name');col.append(name);
  const priceCol=document.createElement('td');priceCol.className='price';const amount=document.createElement('input');amount.type='number';amount.step='.01';amount.min='0';amount.max='5000';amount.value=money(item.priceCents);amount.setAttribute('aria-label','Price in euros');priceCol.append(amount);
  const approveCol=document.createElement('td');approveCol.className='check';const approved=document.createElement('input');approved.type='checkbox';approved.checked=!!item.approved;approved.setAttribute('aria-label','Approve '+item.label);approveCol.append(approved);
  if(item.reviewReason){const hint=document.createElement('div');hint.className='small';hint.textContent=item.reviewReason;col.append(hint);}
  tr.append(col,priceCol,approveCol);body.append(tr);
 }
 table.append(body);host.append(table);$('approve').disabled=false;
 $('review-info').textContent=state.items.filter(x=>x.approved).length+' of '+state.items.length+' approved on server';
}
function renderPublish(){
 const enabled=!!state.merchant?.published,link=new URL('./guest.html?m='+encodeURIComponent(state.merchant?.slug||'')+'&test=1',location.href).href;
 $('publish').disabled=!state.items.length||state.items.some(x=>!x.approved);
 $('copy').hidden=!enabled;$('share').hidden=!enabled;$('test-link').href=enabled?link+'&test=1':'#';
 $('test-link').setAttribute('aria-disabled',String(!enabled));$('test-link').style.pointerEvents=enabled?'':'none';
 if(enabled){$('guest-url').href=link;$('guest-url').textContent=link;
 const img=$('qr');img.src='https://api.qrserver.com/v1/create-qr-code/?size=156x156&data='+encodeURIComponent(link);}
 $('live-state').textContent=state.merchant?.accepting_requests?'Real requests enabled: keep this page open and monitor.':'Real requests paused. Guest tests remain possible.';
 $('enable').disabled=!enabled||!$('staff-ready').checked||!!state.merchant?.accepting_requests;
 $('disable').disabled=!state.merchant?.accepting_requests;
}
function renderActivity(a){
 const stats=a?.counts||[];
 const count=(isTest,states)=>stats.filter(x=>Number(x.is_test)===isTest&&states.includes(x.status)).reduce((n,x)=>n+Number(x.n||0),0);
 $('real-count').textContent=String(count(0,['submitted','accepted','fulfilled','declined']));
 $('test-count').textContent=String(count(1,['submitted','accepted','fulfilled','declined']));
 $('accepted-count').textContent=String(count(0,['accepted','fulfilled']));
 const host=$('activity-table');host.replaceChildren();
 const list=a?.requests||[];state.requests=list;
 if(!list.length){let p=document.createElement('p');p.className='zero';p.textContent='No guest requests recorded. Open the test link and complete a guest request to check the full flow.';host.append(p);setProgress();return;}
 const table=document.createElement('table'),head=document.createElement('thead'),tr=document.createElement('tr');
 for(const title of ['Reference / time','Item','Type / status','Action']){const th=document.createElement('th');th.textContent=title;tr.append(th);}head.append(tr);table.append(head);
 const body=document.createElement('tbody');
 for(const request of list){
  const row=document.createElement('tr'),ref=document.createElement('td'),item=document.createElement('td'),type=document.createElement('td'),action=document.createElement('td');
  ref.textContent=request.public_ref.slice(0,10)+'…';const time=document.createElement('div');time.className='small';time.textContent=request.created_at;ref.append(time);
  item.textContent=request.item_label+' · €'+money(request.price_cents);
  const badge=document.createElement('span');badge.className='badge'+(request.is_test?' test':'');badge.textContent=request.is_test?'TEST':'REAL PILOT';type.append(badge);
  const status=document.createElement('div');status.textContent=request.status;type.append(status);
  const statuses=request.status==='submitted'?['accepted','declined']:request.status==='accepted'?['fulfilled','declined']:[];
  if(!statuses.length)action.textContent='Closed';
  else{
    const select=document.createElement('select');select.setAttribute('aria-label','Status for '+request.public_ref);
    for(const val of ['',...statuses]){const o=document.createElement('option');o.value=val;o.textContent=val||'Choose status';select.append(o);}
    select.addEventListener('change',async()=>{if(!select.value)return;select.disabled=true;try{await call('status',{method:'POST',payload:{reference:request.public_ref,status:select.value}});await refresh();}catch(e){say(e.message,true);select.disabled=false;}});
    action.append(select);
  }
  row.append(ref,item,type,action);body.append(row);
 }
 table.append(body);host.append(table);setProgress();
}
async function run(fn){try{await fn();}catch(e){say(e.message||String(e),true);}}
$('login').addEventListener('click',()=>run(async()=>{
 state.token=$('token').value.trim();if(!state.token)throw new Error('Enter the merchant access token.');
 const result=await call('merchant');sessionStorage.setItem('oido.pilot.token',state.token);setWorkspace(result);
 $('token').value='';say('Merchant workspace loaded. Begin with the actual menu or service list.');
}));
$('file').addEventListener('change',()=>run(async()=>{
 const f=$('file').files[0];if(!f)return;
 if(!/\.(csv|txt)$/i.test(f.name)||f.size>24000)throw new Error('Use TXT or CSV no larger than 24KB.');
 $('menu-text').value=await f.text();
}));
$('import').addEventListener('click',()=>run(async()=>{
 if(!confirm('Import this list? This will replace the draft and pause new real requests.'))return;
 const r=await call('import',{method:'POST',payload:{text:$('menu-text').value}});
 await refresh();say('Imported '+r.imported+' items. All require explicit review.');
}));
$('approve').addEventListener('click',()=>run(async()=>{
 const rows=[...$('review-area').querySelectorAll('tbody tr')];
 const items=rows.map(tr=>{
 const fields=tr.querySelectorAll('input'),value=fields[1].value.trim();
 if(!/^\d{1,4}(?:\.\d{1,2})?$/.test(value))throw new Error('Enter a valid price for each item, with up to 2 decimals.');
 return {id:tr.dataset.id,label:fields[0].value.trim(),priceCents:Math.round(Number(value)*100),approved:fields[2].checked};
 });
 if(items.some(x=>!x.approved))throw new Error('Every item needs merchant approval.');
 await call('review',{method:'POST',payload:{items}});await refresh();say('Reviewed items saved. Ready to publish.');
}));
$('publish').addEventListener('click',()=>run(async()=>{await call('publish',{method:'POST',payload:{}});await refresh();say('Customer storefront published. Run a test request before opening the live pilot.');}));
$('copy').addEventListener('click',()=>run(async()=>{await navigator.clipboard.writeText($('guest-url').href);say('Customer link copied.');}));
$('staff-ready').addEventListener('change',renderPublish);
$('enable').addEventListener('click',()=>run(async()=>{await call('settings',{method:'POST',payload:{acceptingRequests:true,staffReady:$('staff-ready').checked}});await refresh();say('Real requests enabled. Attend this dashboard and respond to submitted requests.');}));
$('disable').addEventListener('click',()=>run(async()=>{await call('settings',{method:'POST',payload:{acceptingRequests:false}});await refresh();say('Real requests paused.');}));
$('refresh').addEventListener('click',()=>run(refresh));
$('export').addEventListener('click',()=>run(async()=>{
 const blob=await call('export',{download:true}),href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download='oido-pilot-evidence.csv';a.click();setTimeout(()=>URL.revokeObjectURL(href),4000);
}));
$('logout').addEventListener('click',()=>{sessionStorage.removeItem('oido.pilot.token');state.token='';$('workspace').hidden=true;$('access').hidden=false;clearInterval(state.timer);$('status').hidden=true;});
if(state.token)run(refresh);
state.timer=setInterval(()=>{if(!document.hidden&&state.token&&state.merchant)run(async()=>{const a=await call('activity');renderActivity(a);});},15000);
