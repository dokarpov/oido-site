(function(){
  "use strict";

  var reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine=matchMedia("(pointer:fine)").matches;

  function bindBrand(){
    document.querySelectorAll(".oido-brand-spot").forEach(function(el){
      el.classList.add("notranslate");
      el.setAttribute("translate","no");
      if(el.dataset.oidoSpotReady)return;
      el.dataset.oidoSpotReady="1";
      el.addEventListener("pointermove",function(ev){
        if(ev.pointerType==="touch")return;
        var box=el.getBoundingClientRect();
        if(!box.width||!box.height)return;
        var x=Math.max(0,Math.min(100,(ev.clientX-box.left)/box.width*100));
        var y=Math.max(0,Math.min(100,(ev.clientY-box.top)/box.height*100));
        el.style.setProperty("--spot-x",x.toFixed(1)+"%");
        el.style.setProperty("--spot-y",y.toFixed(1)+"%");
      },{passive:true});
      el.addEventListener("pointerleave",function(){
        el.style.removeProperty("--spot-x");
        el.style.removeProperty("--spot-y");
      },{passive:true});
    });
  }

  function addInvestorReveals(){
    if(!document.querySelector(".invest-nav"))return;
    document.querySelectorAll(".hero1>* ,.sec .sh,.ivs,.sc2,.tier,.tw,.meetc").forEach(function(el,i){
      el.classList.add("oido-reveal");
      el.style.transitionDelay=Math.min(i%5,4)*35+"ms";
    });
    if(reduce||!("IntersectionObserver" in window)){
      document.querySelectorAll(".oido-reveal").forEach(function(el){el.classList.add("is-visible");});
      return;
    }
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },{rootMargin:"0px 0px -8% 0px",threshold:.08});
    document.querySelectorAll(".oido-reveal").forEach(function(el){io.observe(el);});
  }

  function scrollableAncestor(start,delta){
    var el=start&&start.nodeType===1?start:start&&start.parentElement;
    while(el&&el!==document.body&&el!==document.documentElement){
      var cs=getComputedStyle(el);
      var oy=cs.overflowY;
      if((oy==="auto"||oy==="scroll")&&el.scrollHeight>el.clientHeight+2){
        if(delta<0&&el.scrollTop>0)return true;
        if(delta>0&&el.scrollTop+el.clientHeight<el.scrollHeight-1)return true;
      }
      el=el.parentElement;
    }
    return false;
  }

  function bindSmoothScroll(){
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
      var top=Math.max(0,scrollY+target.getBoundingClientRect().top-offset);
      if(reduce){scrollTo(0,top);}
      else{scrollTo({top:top,behavior:"smooth"});}
      if(history.pushState)history.pushState(null,"","#"+id);
    });

    if(reduce||!fine||innerWidth<900)return;

    var current=scrollY,targetY=scrollY,raf=0,lastProgrammatic=0;
    function maxY(){return Math.max(0,document.documentElement.scrollHeight-innerHeight);}
    function tick(){
      var diff=targetY-current;
      current+=diff*.16;
      if(Math.abs(diff)<.35){
        current=targetY;
        lastProgrammatic=performance.now();
        scrollTo(0,current);
        raf=0;
        return;
      }
      lastProgrammatic=performance.now();
      scrollTo(0,current);
      raf=requestAnimationFrame(tick);
    }
    function start(){
      if(!raf){current=scrollY;raf=requestAnimationFrame(tick);}
    }

    addEventListener("wheel",function(e){
      if(e.ctrlKey||e.metaKey||!e.deltaY||scrollableAncestor(e.target,e.deltaY))return;
      e.preventDefault();
      var factor=e.deltaMode===1?18:e.deltaMode===2?innerHeight:1;
      targetY=Math.max(0,Math.min(maxY(),targetY+e.deltaY*factor));
      start();
    },{passive:false});

    addEventListener("scroll",function(){
      if(performance.now()-lastProgrammatic>70&&!raf){
        current=targetY=scrollY;
      }
    },{passive:true});

    addEventListener("resize",function(){
      targetY=Math.max(0,Math.min(maxY(),targetY));
      if(!raf)current=targetY=scrollY;
    },{passive:true});

    document.addEventListener("visibilitychange",function(){
      if(document.hidden){current=targetY=scrollY;}
    });
  }

  function init(){
    bindBrand();
    bindSmoothScroll();
    addInvestorReveals();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
