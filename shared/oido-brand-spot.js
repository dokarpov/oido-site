(function(){
  "use strict";

  var reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;

  function bindBrand(){
    document.querySelectorAll(".oido-brand-spot").forEach(function(el){
      el.classList.add("notranslate");
      el.setAttribute("translate","no");
      if(el.dataset.oidoSpotReady)return;
      el.dataset.oidoSpotReady="1";

      el.addEventListener("pointerenter",function(ev){
        if(ev.pointerType==="touch")return;
        el.classList.add("is-hot");
      },{passive:true});

      el.addEventListener("pointermove",function(ev){
        if(ev.pointerType==="touch")return;
        el.classList.add("is-hot");
        var box=el.getBoundingClientRect();
        if(!box.width||!box.height)return;
        var x=Math.max(0,Math.min(100,(ev.clientX-box.left)/box.width*100));
        var y=Math.max(0,Math.min(100,(ev.clientY-box.top)/box.height*100));
        el.style.setProperty("--spot-x",x.toFixed(1)+"%");
        el.style.setProperty("--spot-y",y.toFixed(1)+"%");
      },{passive:true});

      el.addEventListener("pointerleave",function(){
        el.classList.remove("is-hot");
        el.style.removeProperty("--spot-x");
        el.style.removeProperty("--spot-y");
      },{passive:true});
      el.addEventListener("focusin",function(){el.classList.add("is-hot");});
      el.addEventListener("focusout",function(){el.classList.remove("is-hot");});
    });
  }

  function addReveals(){
    var selectors=[
      ".pitch-hero-grid > *",
      ".pitch-fact",
      ".pitch-section > .pitch-kicker",
      ".pitch-section > h2",
      ".pitch-section .pitch-top",
      ".pitch-section .pitch-sub",
      ".pitch-section .pitch-evidence-card",
      ".pitch-section .ivs",
      ".pitch-section .sc2",
      ".pitch-section .tier",
      ".pitch-section .tw",
      ".pitch-section .meetc"
    ].join(",");

    var els=[].slice.call(document.querySelectorAll(selectors));
    if(!els.length)return;

    els.forEach(function(el,i){
      el.classList.add("oido-reveal");
      el.style.transitionDelay=Math.min(i%4,3)*28+"ms";
    });

    if(reduce||!("IntersectionObserver" in window)){
      els.forEach(function(el){el.classList.add("is-visible");});
      return;
    }

    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },{rootMargin:"0px 0px -7% 0px",threshold:.06});

    els.forEach(function(el){io.observe(el);});
  }

  function bindSmoothAnchors(){
    document.documentElement.dataset.oidoMotionReady="1";

    document.addEventListener("click",function(e){
      var a=e.target.closest&&e.target.closest('a[href^="#"]');
      if(!a||a.getAttribute("href")==="#"||a.hasAttribute("data-tofind"))return;
      var id=decodeURIComponent(a.getAttribute("href").slice(1));
      var target=document.getElementById(id);
      if(!target)return;

      e.preventDefault();
      var header=document.querySelector(".hd");
      var offset=(header?header.getBoundingClientRect().height:0)+12;
      var top=Math.max(0,window.scrollY+target.getBoundingClientRect().top-offset);
      window.scrollTo({top:top,behavior:reduce?"auto":"smooth"});
      if(history.pushState)history.pushState(null,"","#"+id);
    });
  }

  function init(){
    bindBrand();
    bindSmoothAnchors();
    addReveals();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
