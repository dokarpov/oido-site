(() => {
  'use strict';

  const VERSION = '2026-10-11.5';
  const KEY = 'oido.locale';
  const GOOGLE_SCRIPT = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  const RTL = new Set(['ar','fa','he','ur']);
  const LANGUAGES = [
    ['auto','Automatic'],
    ['en','English'],['es','Español'],['ca','Català'],['fr','Français'],['de','Deutsch'],
    ['it','Italiano'],['pt','Português'],['nl','Nederlands'],['pl','Polski'],['cs','Čeština'],
    ['sk','Slovenčina'],['ro','Română'],['hu','Magyar'],['el','Ελληνικά'],['sv','Svenska'],
    ['da','Dansk'],['no','Norsk'],['fi','Suomi'],['ru','Русский'],['uk','Українська'],
    ['tr','Türkçe'],['ar','العربية'],['he','עברית'],['fa','فارسی'],['zh','中文'],
    ['ja','日本語'],['ko','한국어'],['hi','हिन्दी'],['bn','বাংলা'],['ur','اردو'],
    ['id','Bahasa Indonesia'],['ms','Bahasa Melayu'],['vi','Tiếng Việt'],['th','ไทย'],
    ['fil','Filipino']
  ];
  const SUPPORTED = new Set(LANGUAGES.slice(1).map(([code]) => code));
  const GOOGLE_CODE = {he:'iw', zh:'zh-CN', fil:'tl'};
  const EDGE_STATIC_HOST = /(^|\.)github\.io$/i.test(location.hostname);
  const originals = new WeakMap();

  const norm = value => String(value || '').trim().replace('_','-').toLowerCase();
  const base = value => norm(value).split('-')[0] || 'en';
  const supportedBase = value => {
    const b = base(value);
    return SUPPORTED.has(b) ? b : 'en';
  };

  function explicitLocale() {
    const p = new URLSearchParams(location.search).get('lang');
    return p && p !== 'auto' ? supportedBase(p) : null;
  }

  function storedLocale() {
    try {
      const v = localStorage.getItem(KEY);
      return v && v !== 'auto' ? supportedBase(v) : null;
    } catch { return null; }
  }

  function browserLocale() {
    const langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]).filter(Boolean);
    for (const lang of langs) {
      const b = base(lang);
      if (SUPPORTED.has(b)) return b;
    }
    return 'en';
  }

  async function edgeLocale() {
    if (EDGE_STATIC_HOST) return null;
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 900);
      const res = await fetch('/api/locale', {
        signal: ctl.signal,
        credentials:'omit',
        headers:{accept:'application/json'}
      });
      clearTimeout(timer);
      if (!res.ok) return null;
      const data = await res.json();
      return supportedBase(data.language || '');
    } catch { return null; }
  }

  async function chooseLocale() {
    const forced = explicitLocale() || storedLocale();
    if (forced) return forced;
    const browser = browserLocale();
    if (browser && browser !== 'en') return browser;
    return (await edgeLocale()) || browser || 'en';
  }

  function googleCode(locale) {
    const b = supportedBase(locale);
    return GOOGLE_CODE[b] || b;
  }

  function clearGoogleCookie() {
    const expires = 'Thu, 01 Jan 1970 00:00:00 GMT';
    ['/', '/oido-site/'].forEach(path => {
      document.cookie = 'googtrans=;expires=' + expires + ';path=' + path + ';SameSite=Lax';
    });
  }

  function setGoogleCookie(locale) {
    const code = googleCode(locale);
    clearGoogleCookie();
    document.cookie = 'googtrans=/en/' + code + ';path=/;SameSite=Lax';
  }

  function protectBrandNames() {
    document.querySelectorAll('.oido-brand-spot,[data-i18n-skip],code,pre').forEach(el => {
      el.classList.add('notranslate');
      el.setAttribute('translate','no');
    });

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const targets = [];
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent || parent.closest('script,style,noscript,textarea,.notranslate,[translate="no"]')) continue;
      if (/Oído|OÍDO|oído/.test(node.nodeValue)) targets.push(node);
    }

    targets.forEach(node => {
      const bits = node.nodeValue.split(/(Oído|OÍDO|oído)/g);
      if (bits.length < 2) return;
      const frag = document.createDocumentFragment();
      bits.forEach(bit => {
        if (/^(Oído|OÍDO|oído)$/.test(bit)) {
          const span = document.createElement('span');
          span.className = 'notranslate oido-product-name';
          span.setAttribute('translate','no');
          span.textContent = bit;
          frag.appendChild(span);
        } else if (bit) {
          frag.appendChild(document.createTextNode(bit));
        }
      });
      node.replaceWith(frag);
    });
  }

  function installMenu(locale) {
    const header = document.querySelector('.hdi') || document.querySelector('header') || document.body;
    if (!header || header.querySelector('.oido-menu')) return null;

    const forced = explicitLocale() || storedLocale();
    const currentBase = supportedBase(locale);

    const root = document.createElement('div');
    root.className = 'oido-menu notranslate';
    root.dataset.i18nSkip = 'true';
    root.dataset.open = 'false';
    root.setAttribute('translate','no');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'oido-menu-btn';
    button.setAttribute('aria-label','Menu');
    button.setAttribute('aria-expanded','false');
    button.innerHTML = '<span aria-hidden="true"><i></i><i></i><i></i></span>';

    const panel = document.createElement('div');
    panel.className = 'oido-menu-panel';
    panel.setAttribute('role','dialog');
    panel.setAttribute('aria-label','Site settings');

    const row = document.createElement('div');
    row.className = 'oido-menu-row';

    const label = document.createElement('div');
    label.className = 'oido-menu-label';
    const labelText = document.createElement('span');
    labelText.textContent = 'Language';
    const autoHint = document.createElement('span');
    autoHint.className = 'oido-menu-auto';
    autoHint.textContent = forced ? 'Manual · ' + currentBase.toUpperCase() : 'Automatic · ' + currentBase.toUpperCase();
    label.append(labelText,autoHint);

    const select = document.createElement('select');
    select.className = 'oido-lang';
    select.setAttribute('aria-label','Language');
    LANGUAGES.forEach(([value,text]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      select.appendChild(option);
    });
    select.value = forced ? currentBase : 'auto';

    const status = document.createElement('span');
    status.className = 'oido-lang-status';
    status.setAttribute('aria-live','polite');

    row.append(label,select,status);
    panel.appendChild(row);

    const theme = header.querySelector('.thm');
    if (theme) {
      const themeAction = document.createElement('button');
      themeAction.type = 'button';
      themeAction.className = 'oido-menu-action';
      themeAction.textContent = 'Switch light / dark';
      themeAction.addEventListener('click', () => {
        theme.click();
        close();
      });
      panel.appendChild(themeAction);
    }

    function close() {
      root.dataset.open = 'false';
      button.setAttribute('aria-expanded','false');
    }
    function open() {
      root.dataset.open = 'true';
      button.setAttribute('aria-expanded','true');
      requestAnimationFrame(() => select.focus());
    }

    button.addEventListener('click', e => {
      e.stopPropagation();
      root.dataset.open === 'true' ? close() : open();
    });
    panel.addEventListener('click', e => e.stopPropagation());
    document.addEventListener('click', close);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        close();
        button.focus();
      }
    });

    select.addEventListener('change', () => {
      const chosen = select.value;
      try {
        if (chosen === 'auto') localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, chosen);
      } catch {}
      clearGoogleCookie();
      const u = new URL(location.href);
      if (chosen === 'auto') u.searchParams.delete('lang');
      else u.searchParams.set('lang', chosen);
      location.href = u.toString();
    });

    root.append(button,panel);
    const themeNode = header.querySelector('.thm');
    const actions = header.querySelector('.hda');
    const primaryCta = header.querySelector('a.btn,button.btn');
    if (themeNode) header.insertBefore(root,themeNode);
    else if (actions) header.insertBefore(root,actions);
    else if (primaryCta) header.insertBefore(root,primaryCta);
    else header.appendChild(root);

    return status;
  }

  function shouldSkip(node) {
    const el = node.parentElement;
    if (!el) return true;
    return !!el.closest('[data-i18n-skip],.notranslate,[translate="no"],script,style,noscript,svg,code,pre,textarea');
  }

  function collectTextNodes() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const out = [];
    let n;
    while ((n = walker.nextNode())) {
      if (shouldSkip(n)) continue;
      const text = n.nodeValue.replace(/\s+/g,' ').trim();
      if (!text || text.length < 2 || /^[\d\s€$£¥.,:;()+\-–—/%]+$/.test(text)) continue;
      if (!originals.has(n)) originals.set(n,n.nodeValue);
      out.push({node:n,text});
    }
    return out;
  }

  function restoreEnglish() {
    for (const {node} of collectTextNodes()) {
      if (originals.has(node)) node.nodeValue = originals.get(node);
    }
    clearGoogleCookie();
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
  }

  async function translateWithEdge(locale) {
    if (EDGE_STATIC_HOST) return false;
    const target = supportedBase(locale);
    const nodes = collectTextNodes();
    const unique = [...new Set(nodes.map(x => x.text))];
    const translated = new Map();

    for (let i=0;i<unique.length;i+=24) {
      const items = unique.slice(i,i+24);
      const res = await fetch('/api/translate', {
        method:'POST',
        headers:{'content-type':'application/json','accept':'application/json'},
        body:JSON.stringify({source:'en',target,items,version:VERSION})
      });
      if (!res.ok) throw new Error('edge translation unavailable');
      const data = await res.json();
      (data.translations || []).forEach((value,index) => {
        if (typeof value === 'string' && value.trim()) translated.set(items[index],value);
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
    return translated.size > 0;
  }

  let googlePromise = null;
  function loadGoogleTranslate() {
    if (googlePromise) return googlePromise;

    googlePromise = new Promise((resolve,reject) => {
      let holder = document.getElementById('oido-google-translate');
      if (!holder) {
        holder = document.createElement('div');
        holder.id = 'oido-google-translate';
        holder.className = 'notranslate';
        holder.setAttribute('translate','no');
        holder.setAttribute('aria-hidden','true');
        document.body.appendChild(holder);
      }

      const finish = () => {
        const started = performance.now();
        const poll = () => {
          const combo = document.querySelector('#oido-google-translate .goog-te-combo, .goog-te-combo');
          if (combo) return resolve(combo);
          if (performance.now() - started > 6500) return reject(new Error('Google Translate selector unavailable'));
          setTimeout(poll,80);
        };
        poll();
      };

      window.googleTranslateElementInit = function() {
        try {
          if (!window.google || !google.translate || !google.translate.TranslateElement) {
            throw new Error('Google Translate unavailable');
          }
          new google.translate.TranslateElement({
            pageLanguage:'en',
            includedLanguages:[...SUPPORTED].map(googleCode).join(','),
            autoDisplay:false,
            multilanguagePage:false
          }, 'oido-google-translate');
          finish();
        } catch (err) {
          reject(err);
        }
      };

      if (window.google && google.translate && google.translate.TranslateElement) {
        window.googleTranslateElementInit();
        return;
      }

      const existing = document.querySelector('script[data-oido-google-translate]');
      if (existing) {
        existing.addEventListener('error', () => reject(new Error('Google Translate failed to load')), {once:true});
        finish();
        return;
      }

      const script = document.createElement('script');
      script.src = GOOGLE_SCRIPT;
      script.async = true;
      script.defer = true;
      script.dataset.oidoGoogleTranslate = '1';
      script.onerror = () => reject(new Error('Google Translate failed to load'));
      document.head.appendChild(script);
    });

    return googlePromise;
  }

  async function translateWithGoogle(locale) {
    const target = googleCode(locale);
    protectBrandNames();
    setGoogleCookie(locale);
    const combo = await loadGoogleTranslate();
    if (combo.value !== target) {
      combo.value = target;
      combo.dispatchEvent(new Event('change',{bubbles:true}));
    } else {
      combo.dispatchEvent(new Event('change',{bubbles:true}));
    }
    document.documentElement.lang = supportedBase(locale);
    document.documentElement.dir = RTL.has(supportedBase(locale)) ? 'rtl' : 'ltr';
    return true;
  }

  async function translate(locale,status) {
    const target = supportedBase(locale);
    window.__oidoI18n = {locale:target,provider:'none',supported:[...SUPPORTED],version:VERSION};

    if (target === 'en') {
      restoreEnglish();
      if (status) status.textContent = 'English';
      return;
    }

    try {
      if (await translateWithEdge(target)) {
        window.__oidoI18n.provider = 'edge';
        document.documentElement.lang = target;
        document.documentElement.dir = RTL.has(target) ? 'rtl' : 'ltr';
        if (status) status.textContent = 'Language: ' + target;
        return;
      }
    } catch {}

    try {
      await translateWithGoogle(target);
      window.__oidoI18n.provider = 'google';
      if (status) status.textContent = 'Language: ' + target;
    } catch (err) {
      window.__oidoI18n.provider = 'error';
      if (status) status.textContent = 'Translation unavailable; showing English';
      restoreEnglish();
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    protectBrandNames();
    const locale = await chooseLocale();
    const status = installMenu(locale);
    await translate(locale,status);
  });
})();
