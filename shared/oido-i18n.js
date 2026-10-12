(() => {
  'use strict';

  const VERSION = '2026-10-12.2';
  const KEY = 'oido.locale';
  const MODE_KEY = 'oido.locale.mode';
  const MODE_VERSION_KEY = 'oido.locale.modeVersion';
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
    ['fil','Filipino'],['bg','Български'],['hr','Hrvatski'],['sr','Српски'],['sl','Slovenščina'],
    ['et','Eesti'],['lv','Latviešu'],['lt','Lietuvių'],['is','Íslenska'],['ga','Gaeilge'],
    ['af','Afrikaans'],['sw','Kiswahili'],['ta','தமிழ்'],['te','తెలుగు']
  ];
  const SUPPORTED = new Set(LANGUAGES.slice(1).map(([code]) => code));
  const GOOGLE_CODE = {he:'iw', zh:'zh-CN', fil:'tl'};
  const COUNTRY_LANGUAGE = {
    ES:'es',AD:'ca',PT:'pt',FR:'fr',DE:'de',AT:'de',IT:'it',PL:'pl',
    NL:'nl',BE:'nl',CZ:'cs',SK:'sk',RO:'ro',HU:'hu',GR:'el',SE:'sv',
    DK:'da',NO:'no',FI:'fi',RU:'ru',UA:'uk',TR:'tr',IL:'he',CN:'zh',
    JP:'ja',KR:'ko',IN:'hi',BD:'bn',ID:'id',MY:'ms',VN:'vi',TH:'th',
    BG:'bg',HR:'hr',RS:'sr',SI:'sl',EE:'et',LV:'lv',LT:'lt',IS:'is',
    IE:'en',GB:'en',US:'en',CA:'en',AU:'en',NZ:'en',ZA:'en'
  };
  const EDGE_STATIC_HOST = /(^|\.)github\.io$/i.test(location.hostname);
  const UI = {
    en:{menu:'Menu',language:'Language',automatic:'Automatic',manual:'Manual',theme:'Switch light / dark'},
    es:{menu:'Menú',language:'Idioma',automatic:'Automático',manual:'Manual',theme:'Cambiar tema'},
    ca:{menu:'Menú',language:'Idioma',automatic:'Automàtic',manual:'Manual',theme:'Canvia el tema'},
    fr:{menu:'Menu',language:'Langue',automatic:'Automatique',manual:'Manuel',theme:'Changer de thème'},
    de:{menu:'Menü',language:'Sprache',automatic:'Automatisch',manual:'Manuell',theme:'Design wechseln'},
    it:{menu:'Menu',language:'Lingua',automatic:'Automatico',manual:'Manuale',theme:'Cambia tema'},
    pt:{menu:'Menu',language:'Idioma',automatic:'Automático',manual:'Manual',theme:'Alternar tema'},
    nl:{menu:'Menu',language:'Taal',automatic:'Automatisch',manual:'Handmatig',theme:'Thema wisselen'},
    pl:{menu:'Menu',language:'Język',automatic:'Automatycznie',manual:'Ręcznie',theme:'Zmień motyw'},
    cs:{menu:'Nabídka',language:'Jazyk',automatic:'Automaticky',manual:'Ručně',theme:'Přepnout motiv'},
    sk:{menu:'Ponuka',language:'Jazyk',automatic:'Automaticky',manual:'Manuálne',theme:'Prepnúť motív'},
    ro:{menu:'Meniu',language:'Limbă',automatic:'Automat',manual:'Manual',theme:'Schimbă tema'},
    hu:{menu:'Menü',language:'Nyelv',automatic:'Automatikus',manual:'Kézi',theme:'Téma váltása'},
    el:{menu:'Μενού',language:'Γλώσσα',automatic:'Αυτόματα',manual:'Χειροκίνητα',theme:'Αλλαγή θέματος'},
    sv:{menu:'Meny',language:'Språk',automatic:'Automatiskt',manual:'Manuellt',theme:'Byt tema'},
    da:{menu:'Menu',language:'Sprog',automatic:'Automatisk',manual:'Manuel',theme:'Skift tema'},
    no:{menu:'Meny',language:'Språk',automatic:'Automatisk',manual:'Manuelt',theme:'Bytt tema'},
    fi:{menu:'Valikko',language:'Kieli',automatic:'Automaattinen',manual:'Manuaalinen',theme:'Vaihda teema'},
    ru:{menu:'Меню',language:'Язык',automatic:'Автоматически',manual:'Вручную',theme:'Сменить тему'},
    uk:{menu:'Меню',language:'Мова',automatic:'Автоматично',manual:'Вручну',theme:'Змінити тему'},
    tr:{menu:'Menü',language:'Dil',automatic:'Otomatik',manual:'Manuel',theme:'Temayı değiştir'},
    ar:{menu:'القائمة',language:'اللغة',automatic:'تلقائي',manual:'يدوي',theme:'تبديل السمة'},
    he:{menu:'תפריט',language:'שפה',automatic:'אוטומטי',manual:'ידני',theme:'החלפת ערכת נושא'},
    fa:{menu:'منو',language:'زبان',automatic:'خودکار',manual:'دستی',theme:'تغییر پوسته'},
    zh:{menu:'菜单',language:'语言',automatic:'自动',manual:'手动',theme:'切换主题'},
    ja:{menu:'メニュー',language:'言語',automatic:'自動',manual:'手動',theme:'テーマを切り替え'},
    ko:{menu:'메뉴',language:'언어',automatic:'자동',manual:'수동',theme:'테마 전환'},
    hi:{menu:'मेनू',language:'भाषा',automatic:'स्वचालित',manual:'मैन्युअल',theme:'थीम बदलें'},
    bn:{menu:'মেনু',language:'ভাষা',automatic:'স্বয়ংক্রিয়',manual:'ম্যানুয়াল',theme:'থিম বদলান'},
    ur:{menu:'مینو',language:'زبان',automatic:'خودکار',manual:'دستی',theme:'تھیم تبدیل کریں'},
    id:{menu:'Menu',language:'Bahasa',automatic:'Otomatis',manual:'Manual',theme:'Ganti tema'},
    ms:{menu:'Menu',language:'Bahasa',automatic:'Automatik',manual:'Manual',theme:'Tukar tema'},
    vi:{menu:'Menu',language:'Ngôn ngữ',automatic:'Tự động',manual:'Thủ công',theme:'Đổi giao diện'},
    th:{menu:'เมนู',language:'ภาษา',automatic:'อัตโนมัติ',manual:'ด้วยตนเอง',theme:'สลับธีม'},
    fil:{menu:'Menu',language:'Wika',automatic:'Awtomatiko',manual:'Manwal',theme:'Palitan ang tema'}
  };
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
      // Only an explicit manual choice may override automatic detection.
      // Older builds stored detected/test languages as if they were preferences;
      // ignore those legacy values so a stale "pl" cannot keep winning forever.
      if (localStorage.getItem(MODE_KEY) !== 'manual') return null;
      if (localStorage.getItem(MODE_VERSION_KEY) !== VERSION) return null;
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
    return null;
  }

  async function publicIpLocale() {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 1100);
      const res = await fetch('https://ipapi.co/country/', {
        signal:ctl.signal,
        credentials:'omit',
        referrerPolicy:'no-referrer',
        headers:{accept:'text/plain'}
      });
      clearTimeout(timer);
      if (!res.ok) return null;
      const country = String(await res.text()).trim().toUpperCase();
      const lang = COUNTRY_LANGUAGE[country];
      return lang && SUPPORTED.has(lang) ? lang : null;
    } catch { return null; }
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
    const explicit = explicitLocale();
    if (explicit) {
      try {
        localStorage.setItem(KEY, explicit);
        localStorage.setItem(MODE_KEY, 'manual');
        localStorage.setItem(MODE_VERSION_KEY, VERSION);
      } catch {}
      return explicit;
    }
    const forced = storedLocale();
    if (forced) return forced;

    // Automatic mode: device/browser preference first, then network/IP country
    // only as a fallback. We never access or store a Wi-Fi SSID (browsers do not expose it).
    const browser = browserLocale();
    if (browser) return browser;
    return (await edgeLocale()) || (await publicIpLocale()) || 'en';
  }

  function googleCode(locale) {
    const b = supportedBase(locale);
    return GOOGLE_CODE[b] || b;
  }

  function applyDirection(locale) {
    const target = supportedBase(locale);
    const dir = RTL.has(target) ? 'rtl' : 'ltr';
    document.documentElement.lang = target;
    document.documentElement.dir = dir;
    if (document.body) document.body.dir = dir;
  }

  function hideTranslateChrome() {
    const selectors = [
      '.goog-te-banner-frame',
      'iframe.goog-te-banner-frame',
      'iframe.skiptranslate',
      '.VIpgJd-ZVi9od-ORHb-OEVmcd',
      '.VIpgJd-ZVi9od-aZ2wEe-wOHMyf',
      '.VIpgJd-ZVi9od-aZ2wEe-OiiCO',
      '#goog-gt-tt',
      '.goog-te-balloon-frame',
      '.goog-te-menu-frame'
    ];
    document.querySelectorAll(selectors.join(',')).forEach(el => {
      el.style.setProperty('display','none','important');
      el.style.setProperty('visibility','hidden','important');
      el.style.setProperty('height','0','important');
    });
    document.documentElement.style.setProperty('top','0','important');
    if (document.body) document.body.style.setProperty('top','0','important');
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

  function preserveLocaleLinks(locale) {
    const target = supportedBase(locale);
    if (target === 'en') return;
    document.querySelectorAll('a[href]').forEach(a => {
      const raw = a.getAttribute('href');
      if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('javascript:')) return;
      try {
        const u = new URL(raw, location.href);
        if (u.origin !== location.origin) return;
        u.searchParams.set('lang', target);
        a.setAttribute('href', u.pathname + u.search + u.hash);
      } catch {}
    });
  }

  function installMenu(locale) {
    const header = document.querySelector('.hdi') || document.querySelector('header') || document.body;
    if (!header || header.querySelector('.oido-menu')) return null;

    const forced = explicitLocale() || storedLocale();
    const currentBase = supportedBase(locale);
    const ui = UI[currentBase] || UI.en;

    const root = document.createElement('div');
    root.className = 'oido-menu notranslate';
    root.dataset.i18nSkip = 'true';
    root.dataset.open = 'false';
    root.setAttribute('translate','no');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'oido-menu-btn';
    button.setAttribute('aria-label',ui.menu);
    button.setAttribute('aria-expanded','false');
    button.innerHTML = '<span aria-hidden="true"><i></i><i></i><i></i></span>';

    const panel = document.createElement('div');
    panel.className = 'oido-menu-panel';
    panel.setAttribute('role','dialog');
    panel.setAttribute('aria-label',ui.menu);

    const row = document.createElement('div');
    row.className = 'oido-menu-row';

    const label = document.createElement('div');
    label.className = 'oido-menu-label';
    const labelText = document.createElement('span');
    labelText.textContent = ui.language;
    const autoHint = document.createElement('span');
    autoHint.className = 'oido-menu-auto';
    autoHint.textContent = forced ? ui.manual + ' · ' + currentBase.toUpperCase() : ui.automatic + ' · ' + currentBase.toUpperCase();
    label.append(labelText,autoHint);

    const select = document.createElement('select');
    select.className = 'oido-lang';
    select.setAttribute('aria-label','Language');
    LANGUAGES.forEach(([value,text]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value === 'auto' ? ui.automatic : text;
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
      themeAction.textContent = ui.theme;
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
        if (chosen === 'auto') {
          localStorage.removeItem(KEY);
          localStorage.removeItem(MODE_KEY);
          localStorage.removeItem(MODE_VERSION_KEY);
        } else {
          localStorage.setItem(KEY, chosen);
          localStorage.setItem(MODE_KEY, 'manual');
          localStorage.setItem(MODE_VERSION_KEY, VERSION);
        }
      } catch {}

      if (chosen === 'auto') {
        clearGoogleCookie();
      } else {
        setGoogleCookie(chosen);
        applyDirection(chosen);
      }

      const u = new URL(location.href);
      if (chosen === 'auto') u.searchParams.delete('lang');
      else u.searchParams.set('lang', chosen);
      location.replace(u.toString());
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
    applyDirection('en');
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
    hideTranslateChrome();

    // Google Translate skips display:none branches. Oído keeps inactive industry
    // prototypes hidden, so expose them off-canvas while the translator walks
    // the DOM. They never become visible to the visitor.
    const prepHiddenVariants = () => document.querySelector('.site')?.classList.add('oido-translate-prep');
    const releaseHiddenVariants = () => document.querySelector('.site')?.classList.remove('oido-translate-prep');

    const retrigger = () => {
      prepHiddenVariants();
      combo.value = target;
      combo.dispatchEvent(new Event('change',{bubbles:true}));
      applyDirection(locale);
      hideTranslateChrome();
      clearTimeout(retrigger.releaseTimer);
      retrigger.releaseTimer = setTimeout(releaseHiddenVariants, 6500);
    };
    retrigger();

    let refreshTimer = 0;
    const scheduleRefresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(retrigger, 120);
    };
    const observer = new MutationObserver(mutations => {
      if (mutations.some(m => [...m.addedNodes].some(n => n.nodeType === 1 && !n.closest?.('#oido-google-translate,.goog-te-banner-frame')))) {
        scheduleRefresh();
      }
    });
    observer.observe(document.body,{childList:true,subtree:true});
    document.addEventListener('click', e => {
      if (e.target.closest && e.target.closest('button[data-ind],.pz,[data-choose]')) setTimeout(scheduleRefresh,80);
    });
    setTimeout(retrigger,700);
    setTimeout(retrigger,1800);
    setTimeout(retrigger,4200);

    applyDirection(locale);
    hideTranslateChrome();
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
        applyDirection(target);
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

  // On GitHub Pages there is no server-side translation runtime. Start the
  // browser translator as early as possible so a selected/device language
  // does not sit in English for several seconds before translation begins.
  // Remove stale cookies/preferences from earlier builds before Google Translate
  // gets a chance to apply the wrong language during first paint.
  try {
    var mode=localStorage.getItem(MODE_KEY), modeVersion=localStorage.getItem(MODE_VERSION_KEY);
    if ((mode!=='manual' || modeVersion!==VERSION) && localStorage.getItem(KEY)) localStorage.removeItem(KEY);
    if (mode==='manual' && modeVersion!==VERSION) {
      localStorage.removeItem(MODE_KEY);
      localStorage.removeItem(MODE_VERSION_KEY);
    }
  } catch {}
  const eagerLocale = explicitLocale() || storedLocale() || browserLocale();
  if (!eagerLocale || eagerLocale === 'en') clearGoogleCookie();
  if (EDGE_STATIC_HOST && eagerLocale && eagerLocale !== 'en') {
    setGoogleCookie(eagerLocale);
    loadGoogleTranslate().catch(() => {});
  }

  const translateChromeObserver = new MutationObserver(() => hideTranslateChrome());
  translateChromeObserver.observe(document.documentElement,{childList:true,subtree:true});

  document.addEventListener('DOMContentLoaded', async () => {
    protectBrandNames();
    hideTranslateChrome();
    const locale = await chooseLocale();
    applyDirection(locale);
    preserveLocaleLinks(locale);
    const status = installMenu(locale);
    await translate(locale,status);
  });
})();
