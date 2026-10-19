import {extractItems,checkItem,checkIdempotency,csvRequests} from '../../../pilot/core.js';

const BASE_HEADERS={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY'};
const now=()=>new Date().toISOString();
const id=()=>crypto.randomUUID();
const randomToken=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
const hash=async x=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(x))),b=>b.toString(16).padStart(2,'0')).join('');
function fail(status,message){return new Response(JSON.stringify({error:message}),{status,headers:{...BASE_HEADERS,'Content-Type':'application/json;charset=utf-8'}});}
function json(value,status=200){return new Response(JSON.stringify(value),{status,headers:{...BASE_HEADERS,'Content-Type':'application/json;charset=utf-8'}});}
async function body(req){
 if(!req.headers.get('content-type')?.includes('application/json'))throw new Error('Send JSON.');
 const t=await req.text();if(t.length>25000)throw new Error('Payload exceeds 25KB.');
 try { const b=JSON.parse(t);if(!b||typeof b!=='object'||Array.isArray(b))throw Error();return b; }catch{throw new Error('Invalid JSON.');}
}
function bearer(req){const x=req.headers.get('Authorization')||'';return x.startsWith('Bearer ')?x.slice(7):'';}
async function merchant(req,db){
 const token=bearer(req);if(!/^[a-f0-9]{64}$/.test(token))return null;
 return db.prepare('SELECT id,name,slug,published,accepting_requests,created_at FROM merchants WHERE token_hash=?').bind(await hash(token)).first();
}
function pathOf(c){return(Array.isArray(c.params.path)?c.params.path:[c.params.path||'']).filter(Boolean).join('/');}
const price=e=>e.price_cents===null?null:e.price_cents;
async function items(db,merchantId){const x=await db.prepare('SELECT id,label,price_cents,approved,review_reason,position FROM items WHERE merchant_id=? ORDER BY position').bind(merchantId).all();return(x.results||[]).map(e=>({id:e.id,label:e.label,priceCents:price(e),approved:!!e.approved,reviewReason:e.review_reason}));}
async function activity(db,merchantId){
 const list=await db.prepare('SELECT public_ref,status,is_test,item_label,price_cents,created_at FROM guest_requests WHERE merchant_id=? ORDER BY created_at DESC LIMIT 100').bind(merchantId).all();
 const counts=await db.prepare("SELECT is_test,status,COUNT(*) n FROM guest_requests WHERE merchant_id=? GROUP BY is_test,status").bind(merchantId).all();
 return {requests:list.results||[],counts:counts.results||[],eventDefinition:'Explicitly submitted guest requests only. No passive views, payments, sales, revenue or GMV.'};
}
async function requireMerchant(req,db){const m=await merchant(req,db);if(!m)throw Object.assign(new Error('Merchant access denied.'),{status:401});return m;}
async function admin(req,env){const secret=env.PILOT_ADMIN_TOKEN;const provided=bearer(req);if(!secret||secret.length<24||!provided)return false;
 const [a,b]=await Promise.all([hash(secret),hash(provided)]);let mismatch=0;for(let i=0;i<a.length;i++)mismatch|=a.charCodeAt(i)^b.charCodeAt(i);return mismatch===0;
}
export async function onRequest(context){
 const {request:req,env}=context,db=env.DB,url=new URL(req.url),route=pathOf(context);
 if(req.method==='OPTIONS')return fail(405,'Cross-origin access not supported.');
 if(!['GET','POST'].includes(req.method))return fail(405,'Method not allowed.');
 if(req.method==='POST'){
   const origin=req.headers.get('origin');
   if(origin&&origin!==url.origin)return fail(403,'Cross-origin submissions are disabled.');
 }
 if(route==='health'&&req.method==='GET'){
   if(!db)return json({ready:false,reason:'D1 binding DB missing',payments:'disabled',mode:'supervised pilot'},503);
   try{await db.prepare('SELECT 1').first();return json({ready:true,inviteConfiguration:!!env.PILOT_ADMIN_TOKEN,payments:'disabled',mode:'supervised pilot'});}
   catch{return json({ready:false,reason:'D1 database not initialized',payments:'disabled'},503);}
 }
 if(!db)return fail(503,'Pilot database is not configured.');
 try{
  if(route==='invite'&&req.method==='POST'){
   if(!await admin(req,env))return fail(401,'Admin access denied.');
   const b=await body(req);const name=String(b.name||'').trim();
   if(name.length<2||name.length>100)throw new Error('Merchant name must be 2–100 characters.');
   const merchantId=id(),slug=(name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').slice(0,35).replace(/^-|-$/g,'')||'merchant')+'-'+randomToken().slice(0,6);
   const token=randomToken();
   await db.prepare('INSERT INTO merchants(id,name,slug,token_hash,created_at) VALUES(?,?,?,?,?)').bind(merchantId,name,slug,await hash(token),now()).run();
   return json({name,slug,merchantToken:token,warning:'Show this token once to the merchant over a secure channel. Do not store in a URL.'},201);
  }
  if(route==='merchant'&&req.method==='GET'){
   const m=await requireMerchant(req,db);
   return json({merchant:m,items:await items(db,m.id),activity:await activity(db,m.id),paymentStatus:'not integrated'});
  }
  if(route==='import'&&req.method==='POST'){
   const m=await requireMerchant(req,db),b=await body(req),data=extractItems(b.text);
   const statements=[
     db.prepare('UPDATE merchants SET published=0,accepting_requests=0 WHERE id=?').bind(m.id),
     db.prepare('DELETE FROM items WHERE merchant_id=?').bind(m.id),
     ...data.map(x=>db.prepare('INSERT INTO items(id,merchant_id,label,price_cents,approved,review_reason,position) VALUES(?,?,?,?,0,?,?)').bind(id(),m.id,x.label,x.priceCents,x.reason,x.position))
   ];
   await db.batch(statements);
   return json({imported:data.length,requiresReview:data.length,items:await items(db,m.id),warning:'Import replaces the draft, unpublishes the storefront and stops new guest requests.'});
  }
  if(route==='review'&&req.method==='POST'){
   const m=await requireMerchant(req,db),b=await body(req),existing=await items(db,m.id);
   if(!Array.isArray(b.items)||b.items.length!==existing.length||!existing.length)throw new Error('Review all imported items before publishing.');
   const own=new Set(existing.map(x=>x.id)),used=new Set(),stmts=[];
   for(const item of b.items){
     if(!own.has(item.id)||used.has(item.id))throw new Error('Unknown or repeated item.');
     used.add(item.id);
     if(item.approved!==true)throw new Error('Each item requires explicit approval.');
     const v=checkItem(item);
     stmts.push(db.prepare('UPDATE items SET label=?,price_cents=?,approved=1,review_reason=? WHERE merchant_id=? AND id=?').bind(v.label,v.priceCents,'Approved by merchant',m.id,item.id));
   }
   await db.batch(stmts);return json({approved:stmts.length,items:await items(db,m.id)});
  }
  if(route==='publish'&&req.method==='POST'){
   const m=await requireMerchant(req,db);
   const x=await db.prepare('SELECT COUNT(*) count,SUM(CASE WHEN approved=0 THEN 1 ELSE 0 END) pending FROM items WHERE merchant_id=?').bind(m.id).first();
   if(!x?.count||x.pending)throw new Error('Approve every imported item before publishing.');
   await db.prepare('UPDATE merchants SET published=1 WHERE id=?').bind(m.id).run();
   return json({published:true,slug:m.slug,link:url.origin+'/pilot/guest.html?m='+encodeURIComponent(m.slug),acceptingRequests:!!m.accepting_requests});
  }
  if(route==='settings'&&req.method==='POST'){
   const m=await requireMerchant(req,db),b=await body(req);
   if(typeof b.acceptingRequests!=='boolean')throw new Error('Specify acceptingRequests true or false.');
   if(b.acceptingRequests&&(m.published!==1||b.staffReady!==true))throw new Error('Publish first and explicitly confirm an attending staff member.');
   await db.prepare('UPDATE merchants SET accepting_requests=? WHERE id=?').bind(b.acceptingRequests?1:0,m.id).run();
   return json({acceptingRequests:b.acceptingRequests,staffRequired:true});
  }
  if(route==='public'&&req.method==='GET'){
   const slug=url.searchParams.get('m')||'';
   if(!/^[a-z0-9-]{2,70}$/.test(slug))return fail(404,'Storefront not found.');
   const m=await db.prepare('SELECT id,name,slug,accepting_requests FROM merchants WHERE slug=? AND published=1').bind(slug).first();
   if(!m)return fail(404,'Storefront not available.');
   const list=await items(db,m.id);
   return json({merchant:{name:m.name,slug:m.slug,acceptingRequests:!!m.accepting_requests},items:list.filter(x=>x.approved).map(x=>({id:x.id,label:x.label,priceCents:x.priceCents})),paymentStatus:'offline only'});
  }
  if(route==='request'&&req.method==='POST'){
   const b=await body(req),slug=String(b.slug||''),key=checkIdempotency(b.idempotencyKey),test=b.isTest===true;
   if(!/^[a-z0-9-]{2,70}$/.test(slug))throw new Error('Invalid storefront.');
   const m=await db.prepare('SELECT id,accepting_requests FROM merchants WHERE slug=? AND published=1').bind(slug).first();
   if(!m)return fail(404,'Storefront not found.');
   if(b.acknowledged!==true)throw new Error('Confirm that this is a request, not a paid or confirmed order.');
   const old=await db.prepare('SELECT public_ref,status,is_test FROM guest_requests WHERE merchant_id=? AND idempotency_key=?').bind(m.id,key).first();
   if(old)return json({reference:old.public_ref,status:old.status,isTest:!!old.is_test,idempotent:true});
   if(!test&&!m.accepting_requests)return fail(409,'Merchant is not accepting requests. This is not a live ordering channel.');
   const item=await db.prepare('SELECT id,label,price_cents FROM items WHERE merchant_id=? AND id=? AND approved=1').bind(m.id,b.itemId).first();
   if(!item)return fail(404,'Selected item is not available.');
   const since=new Date(Date.now()-86400000).toISOString();const limit=await db.prepare("SELECT COUNT(*) n FROM guest_requests WHERE merchant_id=? AND created_at>=?").bind(m.id,since).first();
   if(limit?.n>=250)return fail(429,'Supervised pilot request limit reached.');
   const ref=randomToken().slice(0,24),t=now();
   try{await db.prepare('INSERT INTO guest_requests(id,public_ref,merchant_id,item_id,item_label,price_cents,idempotency_key,is_test,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id(),ref,m.id,item.id,item.label,item.price_cents,key,test?1:0,t,t).run();}
   catch(e){
     const duplicate=await db.prepare('SELECT public_ref,status,is_test FROM guest_requests WHERE merchant_id=? AND idempotency_key=?').bind(m.id,key).first();
     if(duplicate)return json({reference:duplicate.public_ref,status:duplicate.status,isTest:!!duplicate.is_test,idempotent:true});
     throw e;
   }
   return json({reference:ref,status:'submitted',isTest:test,paymentStatus:'No payment was taken; staff must accept any real request.'},201);
  }
  if(route==='request-status'&&req.method==='GET'){
   const ref=url.searchParams.get('ref')||'';
   if(!/^[a-f0-9]{24}$/.test(ref))return fail(404,'Not found.');
   const x=await db.prepare('SELECT status,is_test FROM guest_requests WHERE public_ref=?').bind(ref).first();
   if(!x)return fail(404,'Not found.');
   return json({status:x.status,isTest:!!x.is_test,noPayment:true});
  }
  if(route==='activity'&&req.method==='GET'){
   const m=await requireMerchant(req,db);return json(await activity(db,m.id));
  }
  if(route==='status'&&req.method==='POST'){
   const m=await requireMerchant(req,db),b=await body(req);
   const x=await db.prepare('SELECT status FROM guest_requests WHERE merchant_id=? AND public_ref=?').bind(m.id,b.reference).first();
   if(!x)return fail(404,'Request not found.');
   const to=String(b.status||'');
   const allowed={submitted:['accepted','declined'],accepted:['fulfilled','declined'],fulfilled:[],declined:[]};
   if(!allowed[x.status]?.includes(to))return fail(409,'Invalid status transition.');
   const out=await db.prepare('UPDATE guest_requests SET status=?,updated_at=? WHERE merchant_id=? AND public_ref=? AND status=?').bind(to,now(),m.id,b.reference,x.status).run();
   if(!out.meta?.changes)return fail(409,'Request changed; refresh before acting.');
   return json({reference:b.reference,status:to});
  }
  if(route==='export'&&req.method==='GET'){
   const m=await requireMerchant(req,db);
   const x=await db.prepare('SELECT public_ref,status,is_test,item_label,price_cents,created_at FROM guest_requests WHERE merchant_id=? ORDER BY created_at DESC LIMIT 5000').bind(m.id).all();
   return new Response(csvRequests(x.results||[]),{headers:{...BASE_HEADERS,'Content-Type':'text/csv;charset=utf-8','Content-Disposition':'attachment;filename="oido-pilot-requests.csv"'}});
  }
  return fail(404,'Unknown pilot endpoint.');
 }catch(e){
  const code=e.status||(e.message&&(/not configured/i.test(e.message)?503:400));
  if(!e.status&&!(e instanceof Error))return fail(500,'Unexpected server error.');
  if(!e.status&&/D1_|SQLITE|database|no such table/i.test(String(e.message)))return fail(503,'Pilot database unavailable; contact operator.');
  return fail(code,e.message||'Could not complete request.');
 }
}
