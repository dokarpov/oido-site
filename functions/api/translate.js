
const TRANSLATOR = '@cf/meta/m2m100-1.2b';
const FALLBACK_MODEL = '@cf/google/gemma-4-26b-a4b-it';
const MAX_ITEMS = 24;
const MAX_ITEM = 1200;
const MAX_TOTAL = 12000;

const safe = value => typeof value === 'string' ? value.trim() : '';
const lang = value => safe(value).toLowerCase().split('-')[0].replace(/[^a-z]/g,'').slice(0,8);

function numberTokens(text) {
  return text.match(/\d+(?:[.,]\d+)?%?/g) || [];
}
function preservesNumbers(source, translated) {
  return numberTokens(source).every(token => translated.includes(token));
}
function preserveBrand(source, translated) {
  if (source.includes('Oído') && !translated.includes('Oído')) return source;
  return translated;
}
async function translateOne(env, source, target, text) {
  try {
    const r = await env.AI.run(TRANSLATOR, {text, source_lang:source, target_lang:target});
    const out = safe(r?.translated_text || r?.translation || r?.response);
    if (out && preservesNumbers(text,out)) return preserveBrand(text,out);
  } catch {}

  const prompt = [
    'Translate the following website text from English to language code "' + target + '".',
    'Return only the translation, no quotes or commentary.',
    'Preserve exactly: Oído, URLs, email addresses, currency symbols, all numbers and percentages.',
    'Do not invent or soften factual claims.',
    '',
    text
  ].join('\n');
  try {
    const r = await env.AI.run(FALLBACK_MODEL, {messages:[
      {role:'system',content:'You are a precise website translator.'},
      {role:'user',content:prompt}
    ]});
    const out = safe(r?.response || r?.result?.response);
    if (out && preservesNumbers(text,out)) return preserveBrand(text,out);
  } catch {}
  return text;
}

export async function onRequestPost(context) {
  if (!context.env.AI) return Response.json({error:'AI binding not configured'}, {status:503});
  let body;
  try { body = await context.request.json(); }
  catch { return Response.json({error:'invalid_json'}, {status:400}); }

  const source = lang(body.source || 'en') || 'en';
  const target = lang(body.target);
  const items = Array.isArray(body.items) ? body.items.map(safe) : [];
  if (!target || !items.length || items.length > MAX_ITEMS) {
    return Response.json({error:'invalid_request'}, {status:400});
  }
  if (items.some(x => !x || x.length > MAX_ITEM) || items.reduce((n,x)=>n+x.length,0) > MAX_TOTAL) {
    return Response.json({error:'payload_too_large'}, {status:413});
  }
  if (target === source) return Response.json({translations:items, source, target});

  const cacheKey = new Request('https://i18n.oido.local/' + encodeURIComponent(body.version || 'v1') + '/' + target + '/' +
    Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(items)))))
      .map(b=>b.toString(16).padStart(2,'0')).join(''));
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const translations = [];
  for (const text of items) translations.push(await translateOne(context.env, source, target, text));

  const response = Response.json({translations, source, target}, {
    headers:{'cache-control':'public, max-age=604800, stale-while-revalidate=2592000'}
  });
  context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
