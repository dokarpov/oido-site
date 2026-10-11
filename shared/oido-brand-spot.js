(function(){
  "use strict";
  function bind(){
    document.querySelectorAll(".oido-brand-spot").forEach(function(el){
      if(el.dataset.oidoSpotReady)return;
      el.dataset.oidoSpotReady="1";
      el.addEventListener("pointermove",function(ev){
        if(ev.pointerType==="touch")return;
        var box=el.getBoundingClientRect();
        el.style.setProperty("--spot-x",Math.max(0,Math.min(box.width,ev.clientX-box.left)).toFixed(1)+"px");
        el.style.setProperty("--spot-y",Math.max(0,Math.min(box.height,ev.clientY-box.top)).toFixed(1)+"px");
      },{passive:true});
      el.addEventListener("pointerleave",function(){el.style.removeProperty("--spot-x");el.style.removeProperty("--spot-y");},{passive:true});
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});else bind();
})();
