
(function(){
var plans = {solo: 1, venue: 1, commerce: 1};
function toFind(e){ if (e) e.preventDefault(); var t = document.getElementById('try'), q = document.getElementById('lead-biz');
  t.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'});
  setTimeout(function(){ if (q) q.focus({preventScroll: true}); }, 650); }
[].forEach.call(document.querySelectorAll('[data-tofind]'), function(a){ a.addEventListener('click', toFind); });
[].forEach.call(document.querySelectorAll('[data-choose]'), function(b){ b.addEventListener('click', function(e){ window.__oidoPlan = b.dataset.choose; toFind(e); }); });
})();
