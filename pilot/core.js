/* Domain logic shared by Cloudflare Pages Function and deterministic unit tests. */
export function parsePrice(input) {
  const raw=String(input ?? '').trim().replace(/[€$£\s]/g,'');
  if(!/^\d{1,5}(?:[.,]\d{1,2})?$/.test(raw)) return null;
  const [whole, cents='']=raw.replace(',','.').split('.');
  const value=Number(whole)*100+Number((cents+'00').slice(0,2));
  return Number.isSafeInteger(value)&&value>=0&&value<=500000?value:null;
}
export function extractItems(input){
  if(typeof input!=='string'||!input.trim()||input.length>24000) throw new Error('Menu text must contain 1–24,000 characters.');
  const lines=input.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(lines.length>80) throw new Error('Import at most 80 lines at a time.');
  return lines.map((line,i)=>{
    let label=line, value=null,reason='';
    const m=line.match(/^(.*?)(?:\s{2,}|[;|\t]|\s+[-–]\s+|\s+)([€$£]?\s*\d{1,5}(?:[.,]\d{1,2})?\s*[€$£]?)\s*$/);
    if(m){label=m[1].trim();value=parsePrice(m[2]);}
    if(!label||label.length>110){reason='Unclear item name';label=label.slice(0,110)||'Unclear item';}
    if(value===null)reason=reason||'Missing or ambiguous price';
    // All rows need explicit merchant approval, even if parsing seems clear.
    return {label,priceCents:value,reviewRequired:true,reason:reason||'Confirm item and price',position:i};
  });
}
export function checkItem(x){
  const label=String(x.label||'').trim();
  if(label.length<2||label.length>110) throw new Error('Item names must be 2–110 characters.');
  if(!Number.isSafeInteger(x.priceCents)||x.priceCents<0||x.priceCents>500000) throw new Error('Price must be €0–€5,000.');
  return {label,priceCents:x.priceCents};
}
export function checkIdempotency(v){
  if(typeof v!=='string'||!/^[a-zA-Z0-9_-]{12,100}$/.test(v)) throw new Error('An idempotency key is required.');
  return v;
}
export function csvEscape(v){return '"'+String(v??'').replace(/"/g,'""').replace(/[\r\n]/g,' ')+'"';}
export function csvRequests(rows){
  return ['reference,status,kind,item,price_eur,created_at',
    ...rows.map(r=>[r.public_ref,r.status,r.is_test?'test':'pilot',r.item_label,(r.price_cents/100).toFixed(2),r.created_at].map(csvEscape).join(','))].join('\r\n');
}
