
(() => {
  'use strict';

  const VERSION = '2026-10-11.1';
  const KEY = 'oido.locale';
  const EN = new Set(['en','en-us','en-gb']);
  const RTL = new Set(['ar','fa','he','ur']);
  const POPULAR = [
    ['auto','Auto'],['en','English'],['es','Español'],['ca','Català'],['fr','Français'],
    ['de','Deutsch'],['it','Italiano'],['pt','Português'],['nl','Nederlands'],['pl','Polski'],
    ['ru','Русский'],['uk','Українська'],['tr','Türkçe'],['ar','العربية'],['he','עברית'],
    ['zh','中文'],['ja','日本語'],['ko','한국어'],['hi','हिन्दी']
  ];
  const COUNTRY_HINT = {
    ES:'es',AD:'ca',FR:'fr',DE:'de',AT:'de',CH:'de',IT:'it',PT:'pt',BR:'pt',NL:'nl',
    BE:'nl',PL:'pl',RU:'ru',UA:'uk',TR:'tr',SA:'ar',AE:'ar',IL:'he',CN:'zh',TW:'zh',
    JP:'ja',KR:'ko',IN:'hi',MX:'es',AR:'es',CL:'es',CO:'es',PE:'es'
  };

  const originals = new WeakMap();

  const norm = (value) => String(value || '').trim().replace('_','-').toLowerCase();
  const base = (value) => norm(value).split('-')[0] || 'en';

  function explicitLocale() {
    const p = new URLSearchParams(location.search).get('lang');
    return p && p !== 'auto' ? norm(p) : null;
  }

  function storedLocale() {
    try {
      const v = localStorage.getItem(KEY);
      return v && v !== 'auto' ? norm(v) : null;
    } catch { return null; }
  }

  function browserLocale() {
    return norm((navigator.languages && navigator.languages[0]) || navigator.language || 'en');
  }

  async function edgeLocale() {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 900);
      const res = await fetch('/api/locale', {signal: ctl.signal, credentials:'omit', headers:{accept:'application/json'}});
      clearTimeout(timer);
      if (!res.ok) return null;
      const data = await res.json();
      return norm(data.language || COUNTRY_HINT[data.country] || '');
    } catch { return null; }
  }

  async function chooseLocale() {
    const forced = explicitLocale() || storedLocale();
    if (forced) return forced;
    const browser = browserLocale();
    if (browser && browser !== 'und') return browser;
    const edge = await edgeLocale();
    return edge || 'en';
  }

  function installPicker(locale) {
    const header = document.querySelector('.hdi') || document.querySelector('header') || document.body;
    if (!header || header.querySelector('.oido-lang-wrap')) return;

    const wrap = document.createElement('div');
    wrap.className = 'oido-lang-wrap';
    wrap.dataset.i18nSkip = 'true';

    const select = document.createElement('select');
    select.className = 'oido-lang';
    select.setAttribute('aria-label','Language');
    const currentBase = base(locale);
    const options = POPULAR.slice();
    if (!options.some(([v]) => v === currentBase)) options.splice(1,0,[currentBase, currentBase.toUpperCase()]);
    for (const [value,label] of options) {
      const o = document.createElement('option');
      o.value = value; o.textContent = label;
      select.appendChild(o);
    }
    select.value = explicitLocale() || storedLocale() ? currentBase : 'auto';

    const status = document.createElement('span');
    status.className = 'oido-lang-status';
    status.setAttribute('aria-live','polite');

    select.addEventListener('change', () => {
      const chosen = select.value;
      try {
        if (chosen === 'auto') localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, chosen);
      } catch {}
      const u = new URL(location.href);
      if (chosen === 'auto') u.searchParams.delete('lang');
      else u.searchParams.set('lang', chosen);
      location.href = u.toString();
    });

    wrap.append(select,status);
    const actions = header.querySelector('.hda');
    if (actions) header.insertBefore(wrap, actions);
    else header.appendChild(wrap);
    return status;
  }

  function shouldSkip(node) {
    const el = node.parentElement;
    if (!el) return true;
    if (el.closest('[data-i18n-skip],script,style,noscript,svg,code,pre,textarea')) return true;
    if (el.closest('.oido-lang-wrap')) return true;
    return false;
  }

  function collectTextNodes() {
    const root = document.body;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const out = [];
    let n;
    while ((n = walker.nextNode())) {
      if (shouldSkip(n)) continue;
      const text = n.nodeValue.replace(/\s+/g,' ').trim();
      if (!text || text.length < 2 || /^[\d\s€$£¥.,:;()+\-–—/%]+$/.test(text)) continue;
      if (!originals.has(n)) originals.set(n, n.nodeValue);
      out.push({node:n, text});
    }
    return out;
  }

  function restoreEnglish() {
    for (const {node} of collectTextNodes()) {
      if (originals.has(node)) node.nodeValue = originals.get(node);
    }
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
  }

  async function translate(locale, status) {
    const target = base(locale);
    if (EN.has(norm(locale)) || target === 'en') {
      restoreEnglish();
      if (status) status.textContent = 'English';
      return;
    }

    const nodes = collectTextNodes();
    const unique = [...new Set(nodes.map(x => x.text))];
    const translated = new Map();

    for (let i=0; i<unique.length; i+=24) {
      const items = unique.slice(i,i+24);
      let data;
      try {
        const res = await fetch('/api/translate', {
          method:'POST',
          headers:{'content-type':'application/json','accept':'application/json'},
          body:JSON.stringify({source:'en', target, items, version:VERSION})
        });
        if (!res.ok) throw new Error('translation unavailable');
        data = await res.json();
      } catch {
        if (status) status.textContent = 'Translation service unavailable; showing English';
        return;
      }
      (data.translations || []).forEach((value,index) => {
        if (typeof value === 'string' && value.trim()) translated.set(items[index], value);
      });
    }

    for (const item of nodes) {
      const value = translated.get(item.text);
      if (!value) continue;
      const original = originals.get(item.node) || item.node.nodeValue;
      const lead = original.match(/^\s*/)?.[0] || '';
      const tail = original.match(/\s*$/)?.[0] || '';
      item.node.nodeValue = lead + value + tail;
    }

    document.documentElement.lang = locale;
    document.documentElement.dir = RTL.has(target) ? 'rtl' : 'ltr';
    if (status) status.textContent = 'Language: ' + locale;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const locale = await chooseLocale();
    const status = installPicker(locale);
    await translate(locale,status);
  });
})();
