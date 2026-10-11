
import assert from 'node:assert/strict';
import { onRequestGet } from '../functions/api/locale.js';

async function locale({country, acceptLanguage}) {
  const response = await onRequestGet({
    request:{
      cf: country ? {country} : {},
      headers:new Headers(acceptLanguage ? {'accept-language':acceptLanguage} : {})
    }
  });
  return response.json();
}

let r = await locale({country:'ES',acceptLanguage:'ca-ES,es;q=0.9,en;q=0.7'});
assert.equal(r.language,'ca-ES');
assert.equal(r.source,'accept-language');

r = await locale({country:'ES'});
assert.equal(r.language,'es');
assert.equal(r.source,'edge-country');

r = await locale({});
assert.equal(r.language,'en');
assert.equal(r.source,'fallback');

console.log('PASS locale precedence and fallbacks');
