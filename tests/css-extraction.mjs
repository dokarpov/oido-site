import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const stylesheet=readFileSync(new URL('../shared/oido-page.css',import.meta.url),'utf8');
const referenceBytes=831008; // pre-extraction index.html at audit baseline
const htmlBytes=Buffer.byteLength(html,'utf8');
const cssBytes=Buffer.byteLength(stylesheet,'utf8');

assert.match(html,/shared\/oido-page\.css\?v=20261106/,'page CSS must stay linked');
assert(!html.includes('<style>@font-face'),'large inline font stylesheet must not reappear');
assert(htmlBytes<200000, 'HTML should stay below 200 KB after CSS separation');
assert(cssBytes>1000, 'linked CSS must not be empty');
assert(stylesheet.includes('@font-face'),'page font rules must remain in extracted CSS');
assert(stylesheet.includes('html,body'),'page base styles must remain in extracted CSS');
for (const file of ['oido-page.js','oido-plans.js','oido-enquiry.js']) {
  const expected = './shared/'+file+'?v=20261109';
  assert(html.includes('src="'+expected+'"'),file+' must be loaded from document');
  const source=readFileSync(new URL('../shared/'+file,import.meta.url),'utf8');
  assert(source.trim().length>100,file+' extraction unexpectedly empty');
}
assert(!/<script(?![^>]*\bsrc=)[^>]*>/.test(html),'business page must not contain inline JS');
console.log(JSON.stringify({htmlBytes,cssBytes,previousHtmlBytes:referenceBytes,
  htmlReductionPct:+((1-htmlBytes/referenceBytes)*100).toFixed(1)},null,2));
