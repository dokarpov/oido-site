
(function(){
var site = document.querySelector('.site');
window.dataLayer = window.dataLayer || [];
function track(n, p){ var o = Object.assign({event: n, industry: ind, theme: site.dataset.theme}, p || {}); window.dataLayer.push(o); if (typeof window.plausible === 'function') window.plausible(n, {props: o}); }
var $ = function(s, r){ return (r || site).querySelector(s); }, $$ = function(s, r){ return Array.prototype.slice.call((r || site).querySelectorAll(s)); };
var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, wide = function(){ return innerWidth >= 1000; };
function clamp(v){ return Math.max(0, Math.min(1, v)); }
function ease(t){ return 1 - Math.pow(1 - t, 4); }
function tap(el){ if (!el || reduce) return; el.classList.remove('tap'); requestAnimationFrame(function(){ el.classList.add('tap'); setTimeout(function(){ el.classList.remove('tap'); }, 320); }); }
function vis(sel){ return $('.i-' + ind + ' ' + sel) || $('.i-' + ind + sel); }
$$('[data-ev]').forEach(function(a){ a.addEventListener('click', function(){ track(a.dataset.ev, JSON.parse(a.dataset.p || '{}')); }); });
site.classList.remove('static');

// theme
try { var th = localStorage.getItem('oido_theme'); if (th === 'light' || th === 'dark') site.dataset.theme = th; } catch (e) {}
$('.thm').addEventListener('click', function(){ site.dataset.theme = site.dataset.theme === 'light' ? 'dark' : 'light'; try { localStorage.setItem('oido_theme', site.dataset.theme); } catch (e) {} track('theme_switch'); });

// industry: one choice re-targets every example; always reachable, never blocked
var ind = site.dataset.ind, PLAN = {rest: 'commerce', cafe: 'venue', salon: 'venue', studio: 'solo'};
try { var sv = localStorage.getItem('oido_ind'); if (sv && PLAN[sv]) ind = sv; } catch (e) {}
var manual = {}, last = {};
function setInd(k, place){ ind = k; site.dataset.ind = k;
  $$('button[data-ind]').forEach(function(b){ b.setAttribute('aria-pressed', b.dataset.ind === k); });
  $$('.pc').forEach(function(c){ c.classList.toggle('best', c.dataset.plan === PLAN[k]); });
  
  try { localStorage.setItem('oido_ind', k); } catch (e) {}
  manual = {}; last = {}; layout(); all();
  if (place) track('industry_select', {placement: place}); }
$$('button[data-ind]').forEach(function(b){ b.addEventListener('click', function(){ setInd(b.dataset.ind, b.closest('.isw-float') ? 'float' : 'header'); }); });

document.addEventListener('focusin', function(e){ if (e.target.matches('input,select,textarea')) site.classList.add('kb'); });
document.addEventListener('focusout', function(){ site.classList.remove('kb'); });

// scroll progress; a click wins until the reader scrolls on
var HD = function(){ return wide() ? 69 : 65; };
function prog(sec){ var r = sec.getBoundingClientRect(); return clamp((HD() - r.top) / Math.max(1, r.height - innerHeight + HD())); }
function seen(el, a, b){ var r = el.getBoundingClientRect(), vh = innerHeight; return clamp((vh * (a || .95) - r.top) / (vh * (b || .6))); }
var motionState = Object.create(null), motionSettling = false;
function forward(key, raw){
  raw = clamp(raw);
  if (reduce) return 1;
  var m = motionState[key] || (motionState[key] = {target:0,current:0});
  if (raw > m.target) m.target = raw;
  var d = m.target - m.current;
  if (d > .0008){
    m.current = Math.min(m.target, m.current + Math.max(.0015, d * .16));
    motionSettling = true;
  } else m.current = m.target;
  return m.current;
}
function pick(key, auto){ var m = manual[key]; if (m && Math.abs(scrollY - m.y) < Math.max(140, innerHeight * .3)) return m.i; delete manual[key]; return auto; }

// HERO: orders on the rail are stamped one by one
var tk = $$('.tkt');
function heroUpd(){ var p = reduce ? 1 : forward('hero', clamp(.34 + scrollY / (innerHeight * .7)));
  tk.forEach(function(t, i){ var s = $('.stamp', t), a = clamp((p * tk.length - i) / 1), e = ease(a);
    s.style.opacity = a > 0 ? 1 : 0; s.style.transform = 'rotate(-6deg) scale(' + (1.9 - .9 * e).toFixed(3) + ')'; s.style.opacity = (Math.min(1, a * 2.2)).toFixed(3); }); }

// SCAN: the list is read line by line into the storefront
var ssec = $('[data-sec="scan"]'), sst = Array.prototype.slice.call(site.querySelectorAll('.sc-steps li'));
function scanUpd(){ var s = vis('.sc-stage'); if (!s) return;
  var p = reduce ? 1 : prog(ssec);
  var lines = $$('.pp p:not(.pt)', s), rows = $$('.u-row', s).concat($$('.u-sug', s)), r = clamp((p - .12) / .62), n = Math.round(r * lines.length);
  lines.forEach(function(l, k){ l.classList.toggle('is-read', k < n); }); rows.forEach(function(x, k){ x.classList.toggle('is-in', k < n || n >= lines.length); });
  var b = $('.beam', s), h = $('.pp', s).offsetHeight; b.style.opacity = (r > 0 && r < 1) ? 1 : 0; b.style.transform = 'translateY(' + (r * h).toFixed(0) + 'px)';
  var st = p < .14 ? 0 : r < 1 ? 1 : 2; sst.forEach(function(li, k){ li.classList.toggle('is-on', k === st); }); }

// PAINS: what you hear becomes what Oído answers; the phone shows the answer
var psec = null;
function layout(){ var w = vis('.pa-g'); if (!w) return; var W = w.clientWidth;
  $$('.pa', w).forEach(function(it, i){ it._n = {x: [W * .05, -W * .06, W * .07, -W * .04][i], y: [26, 44, -36, -18][i], r: [-5, 4, 3, -4][i]}; }); }
function painsUpd(){ return; var w = vis('.pa-w'); if (!w) return; var its = $$('.pa', w), ans = $$('.ans', w), p = reduce ? 1 : prog(psec), o = clamp(p / .3);
  its.forEach(function(it, i){ var t = ease(clamp((o - i * .1) / .7)), n = it._n || {x: 0, y: 0, r: 0};
    it.style.transform = 'translate3d(' + (n.x * (1 - t)).toFixed(1) + 'px,' + (n.y * (1 - t)).toFixed(1) + 'px,0) rotate(' + (n.r * (1 - t)).toFixed(2) + 'deg)';
    it.children[0].style.opacity = (1 - clamp(t * 1.8)).toFixed(3); it.children[1].style.opacity = clamp(t * 1.8 - .7).toFixed(3);
    it.style.pointerEvents = t > .6 ? 'auto' : 'none'; });
  var a = pick('pains', Math.min(3, Math.floor(clamp((p - .3) / .66) * 4 * .999)));
  its.forEach(function(it, i){ it.classList.toggle('is-on', i === a && o >= 1); it.setAttribute('aria-pressed', i === a); });
  ans.forEach(function(x, i){ x.classList.toggle('is-on', i === a); }); }
[].forEach(function(it){ it.addEventListener('click', function(){ manual.pains = {i: +it.dataset.i, y: scrollY}; all(); track('pain_select', {item: +it.dataset.i + 1}); }); });

// SETUP: scroll only STARTS one smooth timeline; it never scrubs or rewinds
var usec = $('[data-sec="setup"]'), blr = $('.blr'), stps = Array.from(site.querySelectorAll('.stp'));
var setupCurrent = 0, setupStarted = false, setupCancelled = false, setupTimers = [], setupSwapTimers = [];
function clearSetupTimers(){ setupTimers.forEach(clearTimeout); setupTimers=[]; setupSwapTimers.forEach(clearTimeout); setupSwapTimers=[]; }
function setupLater(fn,ms){ var id=setTimeout(fn,ms); setupTimers.push(id); return id; }
function swapText(el,value){
  if(!el || el.textContent===value) return;
  if(reduce || !el.animate){ el.textContent=value; return; }
  try{
    if(el._oidoSwap) el._oidoSwap.cancel();
    var changed=false;
    el._oidoSwap=el.animate([
      {opacity:1,transform:'translate3d(0,0,0)',offset:0},
      {opacity:0,transform:'translate3d(0,-3px,0)',offset:.44},
      {opacity:0,transform:'translate3d(0,3px,0)',offset:.46},
      {opacity:1,transform:'translate3d(0,0,0)',offset:1}
    ],{duration:360,easing:'cubic-bezier(.22,.75,.18,1)'});
    var id=setTimeout(function(){ if(!changed){ changed=true; el.textContent=value; } },158);
    setupSwapTimers.push(id);
  }catch(e){ el.textContent=value; }
}
function setLang(l){
  var i={en:0,ca:1,es:2}[l];
  Array.from(blr.querySelectorAll('[data-l]')).forEach(function(e){
    if(e.dataset.l.indexOf('|')>0) swapText(e,e.dataset.l.split('|')[i]);
  });
  Array.from(blr.querySelectorAll('.lg span')).forEach(function(x){ x.classList.toggle('is-on',x.dataset.l===l); });
}
function fixed(on){
  blr.classList.toggle('fixed',on);
  var r=vis('.mflag'); if(!r) return;
  var em=$('em',r), flag=$('.flag',r);
  swapText(em,on?em.dataset.ok:em.dataset.bad);
  swapText(flag,on?'✓ Fixed':'Check');
}
function paintSetup(step){
  step=Math.max(0,Math.min(3,step));
  setupCurrent=step;
  stps.forEach(function(node,k){
    node.setAttribute('aria-pressed',k===step);
    node.style.opacity=k===step?'1':(k<step?'.76':'.52');
    node.style.transform='translateZ(0)';
    $('.sb',node).style.transform='scaleX('+(k<=step?1:0)+')';
  });
  var panel=vis('.bpanel')||blr, sides=Array.from(panel.querySelectorAll('.side'));
  sides.forEach(function(side,k){ side.classList.toggle('is-live',k===step); });
  blr.dataset.f=step;

  var rows=Array.from((vis('.mcard')||blr).querySelectorAll('.mr'));
  rows.forEach(function(r){ r.classList.toggle('rd',step>0); });

  if(step===0){
    fixed(false); setLang('en');
    rows.forEach(function(r,k){ setupLater(function(){ if(!setupCancelled) r.classList.add('rd'); },140+k*90); });
  }else if(step===1){
    fixed(false); setLang('en');
    setupLater(function(){ if(!setupCancelled) fixed(true); },300);
  }else if(step===2){
    fixed(true); setLang('en');
    setupLater(function(){ if(!setupCancelled) setLang('ca'); },320);
    setupLater(function(){ if(!setupCancelled) setLang('es'); },760);
  }else{
    fixed(true); setLang('es');
  }
}
function startSetup(){
  if(setupStarted) return;
  setupStarted=true; setupCancelled=false;
  clearSetupTimers();
  paintSetup(0);
  if(reduce){ paintSetup(3); return; }
  setupLater(function(){ if(!setupCancelled) paintSetup(1); },980);
  setupLater(function(){ if(!setupCancelled) paintSetup(2); },1960);
  setupLater(function(){ if(!setupCancelled) paintSetup(3); },3040);
}
function setupUpd(){
  if(setupStarted) return;
  var r=usec.getBoundingClientRect();
  // Trigger once when the scene is comfortably entering the viewport.
  if(r.top < innerHeight*.72 && r.bottom > 0) startSetup();
}
stps.forEach(function(step,k){
  step.addEventListener('click',function(){
    setupStarted=true; setupCancelled=true; clearSetupTimers(); paintSetup(k);
    track('setup_step',{step:k+1});
  });
});
paintSetup(0);

// MODULES: the tags fall into a pile
var tags = Array.prototype.slice.call(site.querySelectorAll('.tag')), pile = $('.pile');
tags.forEach(function(t){ t._oidoR = parseFloat(getComputedStyle(t).getPropertyValue('--r')) || 0; });
function modsUpd(){ var p = reduce ? 1 : forward('mods', seen(pile, .95, .7));
  tags.forEach(function(t, i){ var a = ease(clamp((p - i * .06) / .5)), r = t._oidoR;
    t.style.transform = 'translateY(' + (-(1 - a) * 260).toFixed(1) + 'px) rotate(' + (r + (1 - a) * (i % 2 ? 40 : -40)).toFixed(2) + 'deg)'; t.style.opacity = Math.min(1, a * 3).toFixed(3); }); }

// CTA: ¡OÍDO! is stamped letter by letter
var letters = [], big = $('.ctaw') || document.getElementById('try');
function ctaUpd(){ if (!big) return; var p = reduce ? 1 : forward('cta', seen(big, .9, .45));
  letters.forEach(function(l, i){ var a = ease(clamp((p - i * .08) / .45)); l.style.transform = 'translateY(' + ((1 - a) * -.5).toFixed(3) + 'em) scale(' + (1.25 - .25 * a).toFixed(3) + ')'; l.style.opacity = Math.min(1, a * 2).toFixed(3); }); }

var ticking = false;
function schedule(){ if (!ticking){ ticking = true; requestAnimationFrame(all); } }
/* Pinned product scenes MUST update on each scroll frame. Debouncing broke the
   narrative: only separate section entrances should wait for scroll idle. */
function all(){ ticking = false; motionSettling = false; heroUpd(); scanUpd(); painsUpd(); setupUpd(); modsUpd(); ctaUpd();
  site.classList.toggle('nofloat', document.getElementById('try').getBoundingClientRect().top < innerHeight - 80);
  if (motionSettling) schedule(); }
addEventListener('scroll', schedule, {passive: true});
addEventListener('resize', function(){ layout(); schedule(); });
setInd(ind);


$$('[data-choose]').forEach(function(b){ b.addEventListener('click', function(){ $$('.pk').forEach(function(c){ c.classList.toggle('is-on', c === b.closest('.pk')); }); }); });
})();

(function(){
var site = document.querySelector('.site');
function $(s, r){ return (r || site).querySelector(s); } function $$(s, r){ return Array.prototype.slice.call((r || site).querySelectorAll(s)); }
var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, wide = function(){ return innerWidth >= 1000; };
function clamp(v){ return Math.max(0, Math.min(1, v)); }
function track(n, p){ window.dataLayer = window.dataLayer || []; window.dataLayer.push(Object.assign({event: n, industry: site.dataset.ind}, p || {})); }
function prog(sec){ var hd = wide() ? 69 : 65, r = sec.getBoundingClientRect(); return clamp((hd - r.top) / Math.max(1, r.height - innerHeight + hd)); }
// ---- pains: a scripted scenario per pain; the tap is shown before the next screen ----
var sec = $('[data-sec="pains"]'), man = null, lastKey = '';
var painTick = false;
function painSchedule(){ if (!painTick){ painTick = true; requestAnimationFrame(upd); } }
function cardHTML(w, i){ var b = Array.from(w.querySelectorAll('.pz'))[i]; return '<div class="pz-card" data-card="' + i + '" data-s="0"><span class="tqw"><span class="tq">' + $('.tq', b).innerHTML + '</span></span><div class="ans2"><b>' + $('.pz-a b', b).innerHTML + '</b><span>' + $('.pz-a span', b).innerHTML + '</span></div><span class="stp2">OÍDO ✓</span></div>'; }
function ensureCur(w){
  var c = $('.pz-cur', w);
  if (!c){ c = document.createElement('div'); c.className = 'pz-cur'; $('.pz-l', w).after(c); }
  if (c.querySelectorAll('.pz-card').length !== 4) c.innerHTML = [0,1,2,3].map(function(i){ return cardHTML(w,i); }).join('');
  return c;
}
function upd(){ painTick = false; var w = $('.i-' + site.dataset.ind + '.pz-w'); if (!w) return;
  var p = reduce ? .99 : prog(sec), q0 = clamp((p - .04) / .92) * 4;
  var base = Math.min(3, Math.floor(q0)), q = base === 3 ? clamp(q0 - 3) : q0 - base, manualStep = false;
  if (man && Math.abs(scrollY - man.y) < Math.max(160, innerHeight * .35)){ base = man.i; q = man.q; manualStep = true; } else man = null;
  var blendRaw = (!manualStep && base < 3) ? clamp((q - .78) / .22) : 0, blend = 1 - Math.pow(1 - blendRaw, 3);
  var visual = blend > .5 && base < 3 ? base + 1 : base;

  $$('.pz', w).forEach(function(b, i){
    b.classList.toggle('is-on', i === visual);
    b.classList.toggle('is-done', i < visual);
    b.classList.toggle('is-stamp', i === visual && (visual === base ? q > .55 : blend > .55));
    b.setAttribute('aria-pressed', i === visual);
  });

  var scn = $$('.scn', w);
  function renderScenario(index, localQ, weight){
    var scene = scn[index]; if (!scene) return null;
    scene.classList.toggle('is-on', weight > .002);
    scene.style.opacity = weight.toFixed(3);
    scene.style.visibility = weight > .002 ? 'visible' : 'hidden';
    scene.style.pointerEvents = weight > .65 ? 'auto' : 'none';
    var frames = $$('.fr', scene), n = frames.length, pos = clamp(localQ) * n;
    var frame = Math.min(n - 1, Math.floor(pos * .999)), lf = pos - frame;
    frames.forEach(function(x, i){ x.classList.toggle('is-on', i === frame); });
    return {scene:scene,frames:frames,frame:frame,lf:lf,node:frames[frame],n:n};
  }
  scn.forEach(function(scene){ scene.classList.remove('is-on'); scene.style.opacity='0'; scene.style.visibility='hidden'; scene.style.pointerEvents='none'; });
  var main = renderScenario(base, q, 1 - blend);
  var next = base < 3 ? renderScenario(base + 1, 0, blend) : null;

  var c = ensureCur(w), cards = $$('.pz-card', c);
  cards.forEach(function(card, i){
    var weight = i === base ? 1 - blend : (i === base + 1 ? blend : 0);
    if (base === 3 && i === 3) weight = 1;
    card.classList.toggle('is-card-on', weight > .002);
    card.style.opacity = weight.toFixed(3);
    card.style.visibility = weight > .002 ? 'visible' : 'hidden';
    card.style.transform = 'translate3d(0,' + ((1 - weight) * 6).toFixed(2) + 'px,0)';
    if (i === base) card.dataset.s = q > .3 ? '1' : '0';
    else if (i === base + 1) card.dataset.s = '0';
  });

  var active = blend > .5 && next ? next : main;
  var ring = $('.tapr', w);
  if (blend > .05 && blend < .95) ring.classList.remove('is-on','is-press');
  else if (active && active.node){
    var sel = active.node.dataset.tap, t = sel && $(sel.split(',')[0], active.node);
    if (t && active.lf > .45 && !reduce){
      var R = $('.dv-s', w).getBoundingClientRect(), r = t.getBoundingClientRect();
      ring.style.left = (r.left - R.left + r.width / 2) + 'px'; ring.style.top = (r.top - R.top + r.height / 2) + 'px';
      ring.classList.add('is-on'); ring.classList.toggle('is-press', active.lf > .75);
    } else ring.classList.remove('is-on','is-press');
  }

  var cap = $('.pz-cap', w);
  if (active && active.node){
    $('b', cap).textContent = '0' + (visual + 1) + ' · ' + (active.frame + 1) + '/' + active.n;
    $('span', cap).textContent = active.node.dataset.cap;
  }
}
Array.prototype.slice.call(site.querySelectorAll('.pz')).forEach(function(b){ b.addEventListener('click', function(){ man = {i: +b.dataset.i, q: .62, y: scrollY}; upd(); track('pain_select', {item: +b.dataset.i + 1}); }); });
/* Each scroll update renders the corresponding product frame; scrolling back reverses the story. */
addEventListener('scroll',painSchedule,{passive:true});
addEventListener('resize', painSchedule); Array.prototype.slice.call(site.querySelectorAll('button[data-ind]')).forEach(function(b){ b.addEventListener('click', function(){ lastKey = ''; man = null; setTimeout(painSchedule, 0); }); }); upd();

})();
