/* Oído idle-triggered entrance motion. Passive scrolling; no wheel interception or scroll lock. */
(function(){
 'use strict';
 var root=document.documentElement;
 var reduce=window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 var candidates=[
  '.pitch-hero .pitch-proof',
  '.pitch-section .pitch-top',
  '.pitch-section .pitch-three > article',
  '.pitch-section .pitch-evidence-card',
  '.pitch-section .pitch-thesis > article',
  '.pitch-section .pitch-steps > article',
  '.pitch-section .tier',
  '.pitch-section .pitch-raise',
  '.pitch-section .meetc',
  '.site .mid-g',
  '.site .lead-card',
  '.site .pk',
  '.site .faq h2'
 ];
 var nodes=Array.prototype.slice.call(document.querySelectorAll(candidates.join(',')));
 if(!nodes.length)return;
 if(reduce||!('IntersectionObserver' in window))return;
 var queued=new Set(), idleTimer=0, scrolling=false, isActive=true;
 function reveal(){
  if(!isActive)return;
  scrolling=false;
  var n=0;
  queued.forEach(function(el){
    if(!el.isConnected){queued.delete(el);return;}
    /* If an element has left the viewport before scrolling settled, wait for re-entry. */
    var r=el.getBoundingClientRect();
    if(r.bottom<=0||r.top>=window.innerHeight){queued.delete(el);return;}
    if(el.classList.contains('is-visible')){queued.delete(el);return;}
    el.style.setProperty('--oido-stagger',String(Math.min(n++,3)*65)+'ms');
    el.classList.add('is-visible');
    queued.delete(el);
    observer.unobserve(el);
  });
 }
 function settle(ms){
  clearTimeout(idleTimer);
  scrolling=true;
  idleTimer=setTimeout(reveal,ms);
 }
 var observer=new IntersectionObserver(function(entries){
  entries.forEach(function(e){if(e.isIntersecting){queued.add(e.target);} else if(!e.target.classList.contains('is-visible'))queued.delete(e.target);});
  settle(165);
 },{rootMargin:'0px 0px -9% 0px',threshold:.1});
 nodes.forEach(function(el){el.classList.add('oido-reveal'); observer.observe(el);});
 root.classList.add('oido-scroll-motion-ready');
 window.addEventListener('scroll',function(){settle(170);},{passive:true});
 window.addEventListener('resize',function(){settle(180);},{passive:true});
 document.addEventListener('visibilitychange',function(){if(!document.hidden)settle(100);});
 /* Entering with the page already at its scroll-restored position. */
 settle(190);
})();
