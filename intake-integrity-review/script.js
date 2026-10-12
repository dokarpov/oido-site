/**
 * Intake Integrity — editorial site interactions.
 * No trackers, no external runtime dependencies, no customer data.
 * All demo records and states are synthetic and never sent anywhere.
 */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const lerp = (from, to, progress) => from + (to - from) * progress;

  // A single global scroll listener feeds the progress indicator, scene, and header.
  const scrollBar = $('#progress');
  const header = $('#siteHeader');
  const story = $('.transition-story');
  const sceneSignal = $('#sceneSignal');
  const sceneQuestion = $('#sceneQuestion');
  const sceneVisual = $('#sceneVisual');
  const recordShell = $('#recordShell');
  const sceneCaption = $('#sceneCaption');
  const storySteps = $$('.story-step');
  const phaseNum = $('#phaseNum');
  const miniRailFill = $('#miniRailFill');
  let ticking = false;
  let currentStoryStep = -1;
  let desiredProgress = 0;
  let drawnProgress = 0;
  let sceneAnimating = false;
  let lastFrame = 0;
  const smooth = (a,b,x) => {const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY || document.documentElement.scrollTop;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      if (scrollBar) scrollBar.style.transform = `scaleX(${clamp(y / max, 0, 1)})`;
      header?.classList.toggle('is-scrolled', y > 40);
      updateStoryTarget();
      ticking = false;
    });
  }

  function updateStoryTarget() {
    if (!story) return;
    const rect = story.getBoundingClientRect();
    const distance = Math.max(1, story.offsetHeight - window.innerHeight);
    desiredProgress = clamp(-rect.top / distance, 0, 1);
    const step = desiredProgress < .34 ? 0 : desiredProgress < .69 ? 1 : 2;
    if (step !== currentStoryStep) {
      currentStoryStep = step;
      storySteps.forEach((node,index) => node.classList.toggle('is-active', index === step));
      if (phaseNum) phaseNum.textContent = String(step + 1).padStart(2,'0');
      if (sceneCaption) sceneCaption.textContent = ['An incoming signal / 001','A question of identity / 002','A defensible record / 003'][step];
    }
    if (!sceneAnimating) {sceneAnimating = true;requestAnimationFrame(animateScene)}
  }

  function paintScene(p) {
    const pivot = smooth(.20,.53,p);
    const reveal = smooth(.58,.86,p);
    if (sceneSignal) {
      sceneSignal.style.opacity = String(1-pivot);
      sceneSignal.style.transform = `scale(${1.055 + .04 * pivot}) translate3d(${-2 * pivot}%, ${-1 * pivot}%, 0)`;
    }
    if (sceneQuestion) {
      sceneQuestion.style.opacity = String(pivot * (1-reveal));
      sceneQuestion.style.transform = `scale(${1.07 - .035 * pivot}) translate3d(${2 - 2*pivot}%,0,0)`;
    }
    if (sceneVisual) sceneVisual.style.opacity = String(1-smooth(.68,.91,p));
    if (recordShell) {
      recordShell.style.opacity = String(reveal);
      recordShell.style.transform = `translate3d(0,${(1-reveal)*17}px,0) scale(${.98 + .02*reveal})`;
    }
    if (miniRailFill) miniRailFill.style.transform = `scaleX(${p})`;
  }

  function animateScene(timestamp) {
    // Frame-rate-independent damping: fluid camera timing without arbitrary bounce/rotation.
    const dt = clamp(timestamp - (lastFrame || timestamp),0,64);
    lastFrame = timestamp;
    const alpha = prefersReducedMotion.matches ? 1 : 1-Math.exp(-dt/115);
    drawnProgress += (desiredProgress-drawnProgress)*alpha;
    if (Math.abs(desiredProgress-drawnProgress)<.001) drawnProgress=desiredProgress;
    paintScene(drawnProgress);
    if (drawnProgress !== desiredProgress) requestAnimationFrame(animateScene);
    else {sceneAnimating=false;lastFrame=0}
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  prefersReducedMotion.addEventListener?.('change', onScroll);
  onScroll();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) onScroll(); });

  // Keyboard-accessible responsive navigation.
  const menuButton = $('#menuToggle');
  const nav = $('#mainNav');
  function setMenu(open) {
    if (!menuButton || !nav) return;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    nav.classList.toggle('is-open', open);
    header?.classList.toggle('menu-open', open);
    document.body.classList.toggle('menu-open', open);
  }
  menuButton?.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  $$('a', nav).forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setMenu(false); });
  window.matchMedia('(min-width: 701px)').addEventListener?.('change', (event) => { if (event.matches) setMenu(false); });

  // Reveal only non-interactive sections. Content remains readable without JS.
  if ('IntersectionObserver' in window) {
    const nodes = $$('.capability-card, .manifesto-aside, .blueprint-title, .evidence-number');
    if (!prefersReducedMotion.matches) nodes.forEach(n => n.classList.add('reveal'));
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
      });
    }, { threshold: .12, rootMargin: '0px 0px -35px 0px' });
    nodes.forEach(n => io.observe(n));
    const bp = $('#architecture');
    if (bp) {
      const bpObserver = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) { bp.classList.add('is-visible'); bpObserver.disconnect(); }
      }, { threshold: .2 });
      bpObserver.observe(bp);
    }
  } else $('#architecture')?.classList.add('is-visible');

  // Working product interaction: deterministic synthetic scenarios.
  const cases = {
    ambiguous: {
      initials: 'CT', name: 'Celia Torres', context: 'Partner intake · Buyer / billing contact',
      source: 'Partner enquiry', identity: 'Potential overlapping record', consent: 'Recorded',
      tag: 'Human review', decision: "Don't merge on a guess.",
      reason: 'A plausible match is not a confirmed identity. Route the ambiguity to a human before delivery.',
      next: 'Assign reviewer ↗', policy: 'Requires human review', outcome: 'Delivery on hold',
      state: 'review', badge: '1', code: 'REVIEW_REQUIRED', trail: [
        ['01', 'Intake accepted', 'A complete enquiry was captured'],
        ['02', 'Identity questioned', 'Potential overlap requires review'],
        ['03', 'Delivery suspended', 'Operator assignment pending']
      ], gates: [['Validation', 'Passed'], ['Consent', 'Recorded'], ['Identity', 'Review required'], ['Delivery', 'On hold']]
    },
    missing: {
      initials: 'MC', name: 'Milo Carter', context: 'Website · Prospective customer',
      source: 'Web form', identity: 'No conflicting signal', consent: 'Not recorded',
      tag: 'Blocked', decision: 'Consent is a boundary.',
      reason: 'The submitted record has no valid consent evidence for this processing route. Stop before downstream delivery.',
      next: 'Request consent evidence ↗', policy: 'Consent gate failed', outcome: 'Delivery blocked',
      state: 'blocked', badge: '1', code: 'CONSENT_REQUIRED', trail: [
        ['01', 'Intake accepted', 'A web enquiry was received'],
        ['02', 'Consent checked', 'No applicable evidence supplied'],
        ['03', 'Delivery blocked', 'Waiting for a valid lawful route']
      ], gates: [['Validation', 'Passed'], ['Consent', 'Blocked'], ['Identity', 'Not evaluated'], ['Delivery', 'Blocked']]
    },
    valid: {
      initials: 'AL', name: 'Amira Lewis', context: 'Sales intake · Purchasing lead',
      source: 'Authenticated sales', identity: 'No review signal', consent: 'Recorded',
      tag: 'Ready to deliver', decision: 'Clear route. Controlled handoff.',
      reason: 'Required gates passed. A canonical envelope can be queued for idempotent downstream delivery.',
      next: 'Queue in outbox ↗', policy: 'All required gates passed', outcome: 'Ready for outbox',
      state: 'passed', badge: '0', code: 'DELIVERY_READY', trail: [
        ['01', 'Intake accepted', 'Authenticated origin verified'],
        ['02', 'Policy evaluated', 'All required checks passed'],
        ['03', 'Envelope prepared', 'Ready for durable outbox delivery']
      ], gates: [['Validation', 'Passed'], ['Consent', 'Recorded'], ['Identity', 'No review signal'], ['Delivery', 'Ready']]
    },
    retry: {
      initials: 'JR', name: 'Jonah Reed', context: 'Partner intake · Existing request',
      source: 'Partner API retry', identity: 'Same idempotency key', consent: 'Previously recorded',
      tag: 'Safe retry', decision: 'One request. One delivery.',
      reason: 'The request has already been processed under the same idempotency key. Do not create another delivery.',
      next: 'Inspect original attempt ↗', policy: 'Retry recognized', outcome: 'Duplicate send prevented',
      state: 'passed', badge: '0', code: 'IDEMPOTENT_REPLAY', trail: [
        ['01', 'Repeat request received', 'Idempotency key recognized'],
        ['02', 'Original attempt linked', 'Prior decision preserved'],
        ['03', 'Duplicate prevented', 'No second downstream write']
      ], gates: [['Validation', 'Recognized'], ['Consent', 'Previously recorded'], ['Idempotency', 'Matched'], ['Delivery', 'Not repeated']]
    }
  };
  const caseButtons = $$('[data-case]');
  const tabButtons = $$('[data-demo-tab]');
  const field = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  let currentCase = 'ambiguous';
  let currentTab = 'queue';
  const escapeHTML = value => String(value).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function renderAlternateTab(scenario) {
    const panel = $('#demoTabPanel');
    const cards = $('#demoCards');
    const strip = $('#eventStrip');
    if (!panel || !cards || !strip) return;
    const queue = currentTab === 'queue';
    cards.hidden = !queue;
    strip.hidden = !queue;
    panel.hidden = queue;
    if (queue) return;
    if (currentTab === 'ledger') {
      panel.innerHTML = `<div class="tab-panel-eyebrow">SIMULATED / DECISION RECORD</div><h4>Trace the decision.</h4><p>A conceptual view of retained decision events. These events do not claim a live cryptographic signature or a production ledger.</p><div class="audit-code">${escapeHTML(scenario.code)} <span> / synthetic</span></div><div class="audit-rows">${scenario.trail.map(([num, title, detail])=>`<div class="audit-row"><span>${escapeHTML(num)}</span><strong>${escapeHTML(title)}</strong><small>${escapeHTML(detail)}</small></div>`).join('')}</div>`;
    } else {
      panel.innerHTML = `<div class="tab-panel-eyebrow">SIMULATED / POLICY CONTROL</div><h4>Make the rule visible.</h4><p>The same input is evaluated against explicit conditions. A passing check is not a certification or proof of real-world compliance.</p><div class="policy-rows">${scenario.gates.map(([name, result])=>`<div class="policy-row"><span>${escapeHTML(name)}</span><strong>${escapeHTML(result)}</strong></div>`).join('')}</div>`;
    }
  }
  function renderScenario() {
    const c = cases[currentCase];
    if (!c) return;
    field('demoAvatar', c.initials);
    field('demoName', c.name); field('demoContext', c.context);
    field('demoSource', c.source); field('demoIdentity', c.identity);
    field('demoConsent', c.consent); field('demoTag', c.tag);
    field('demoDecision', c.decision); field('demoReason', c.reason);
    field('demoNext', c.next); field('eventPolicy', c.policy);
    field('eventOutcome', c.outcome); field('queueBadge', c.badge);
    const tag = $('#demoTag');
    if (tag) { tag.dataset.state = c.state; }
    const dot = $('#routeDot');
    if (dot) dot.dataset.state = c.state;
    caseButtons.forEach(b => {
      const isActive = b.dataset.case === currentCase;
      b.classList.toggle('is-active', isActive);
      b.setAttribute('aria-pressed', String(isActive));
    });
    renderAlternateTab(c);
  }
  function renderTab() {
    const labels = {queue: ['REVIEW QUEUE','Every exception has an owner.'], ledger: ['AUDIT TRAIL','What happened, and why.'], policy: ['POLICY GATES','Trust needs boundaries.']};
    const [crumb, title] = labels[currentTab];
    field('demoBreadcrumb', crumb); field('demoTitle', title);
    tabButtons.forEach(b => {
      const active = b.dataset.demoTab === currentTab;
      b.classList.toggle('is-selected', active);
      b.setAttribute('aria-pressed', String(active));
    });
    renderAlternateTab(cases[currentCase]);
  }
  caseButtons.forEach(b => b.addEventListener('click', () => {currentCase = b.dataset.case; renderScenario();}));
  tabButtons.forEach(b => b.addEventListener('click', () => {currentTab = b.dataset.demoTab; renderTab();}));
  renderScenario();
  renderTab();
})();
