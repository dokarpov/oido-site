/* Oído pointer studio: one shared, nonblocking interaction system. */
(function(){
 'use strict';
 if(!window.matchMedia||!matchMedia('(hover:hover) and (pointer:fine)').matches)return;
 if(document.getElementById('oido-pointer-studio'))return;
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const root=document.documentElement;
 const cursor=document.createElement('div');
 cursor.id='oido-pointer-studio';cursor.className='oido-pointer';
 cursor.setAttribute('aria-hidden','true');
 cursor.innerHTML='<span class="oido-pointer-core"></span><span class="oido-pointer-caption">OPEN</span>';
 document.body.appendChild(cursor);
 const caption=cursor.querySelector('.oido-pointer-caption');
 let x=-60,y=-60,toX=-60,toY=-60,frame=0,visible=false;
 function tick(){
   const smoothing=reduce?1:.55;
   x+=(toX-x)*smoothing;y+=(toY-y)*smoothing;
   cursor.style.transform='translate3d('+x.toFixed(2)+'px,'+y.toFixed(2)+'px,0) translate(-50%,-50%)';
   if(Math.abs(toX-x)+Math.abs(toY-y)>.45)frame=requestAnimationFrame(tick);else frame=0;
 }
 function follow(ev){
   if(ev.pointerType==='touch')return;
   toX=ev.clientX;toY=ev.clientY;
   if(!visible){visible=true;x=toX;y=toY;root.classList.add('oido-custom-cursor');}
   if(!frame)frame=requestAnimationFrame(tick);
   const target=ev.target instanceof Element?ev.target:null;
   let mode='default',label='';
   if(target&&target.closest('.site .pile')){mode='scatter';label='MOVE';}
   else if(target&&target.closest('a,button,summary,[role="button"],[role="link"]')){mode='link';label='OPEN';}
   else if(target&&target.closest('input,select,textarea,[contenteditable="true"]')){mode='default';}
   if(cursor.dataset.mode!==mode){cursor.dataset.mode=mode;caption.textContent=label;}
 }
 document.addEventListener('pointermove',follow,{passive:true});
 document.addEventListener('pointerdown',ev=>{if(ev.pointerType!=='touch')cursor.dataset.down='1';},{passive:true});
 document.addEventListener('pointerup',()=>{delete cursor.dataset.down;},{passive:true});
 document.addEventListener('pointercancel',()=>{delete cursor.dataset.down;},{passive:true});
 document.addEventListener('pointerout',ev=>{
   if(ev.relatedTarget===null){visible=false;root.classList.remove('oido-custom-cursor');}
 },{passive:true});
 document.addEventListener('visibilitychange',()=>{
   if(document.hidden){visible=false;root.classList.remove('oido-custom-cursor');}
 });
 // Static keyboard and touch fallback: no pointer-driven movement.
 if(reduce)return;
 const pile=document.querySelector('.site .pile');
 if(!pile)return;
 const tags=Array.from(pile.querySelectorAll('.tag'));
 if(!tags.length)return;
 const items=tags.map((el,i)=>({el,i,x:0,y:0,vx:0,vy:0,rotation:0,vr:0}));
 let pointerInside=false,px=-999,py=-999,animating=false;
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 function localize(ev){
  const box=pile.getBoundingClientRect();
  px=ev.clientX-box.left;py=ev.clientY-box.top;
 }
 function start(){
  if(!animating){animating=true;requestAnimationFrame(animate);}
 }
 function animate(){
  let energy=0;
  const width=pile.clientWidth,height=pile.clientHeight;
  for(const state of items){
   const {el,i}=state;
   const cx=el.offsetLeft+el.offsetWidth/2,cy=el.offsetTop+el.offsetHeight/2;
   const dx=cx-px,dy=cy-py;
   const distance=Math.hypot(dx,dy),radius=180;
   const falloff=pointerInside?Math.pow(clamp(1-distance/radius,0,1),1.65):0;
   // Direction is based on ORIGINAL badge positions, not on the currently moving
   // bounding boxes, avoiding the hover hit-test jitter.
   const angle=distance>1?Math.atan2(dy,dx):i*2.399963229728653;
   const force=82*falloff;
   const sway=Math.sin(i*2.14)*15*falloff;
   let tx=Math.cos(angle)*force - Math.sin(angle)*sway;
   let ty=Math.sin(angle)*force + Math.cos(angle)*sway;
   tx=clamp(tx,-el.offsetLeft,Math.max(0,width-el.offsetLeft-el.offsetWidth));
   ty=clamp(ty,-el.offsetTop,Math.max(0,height-el.offsetTop-el.offsetHeight-5));
   const tr=(i%2?-1:1)*falloff*13;
   state.vx=(state.vx+(tx-state.x)*.15)*.74;
   state.vy=(state.vy+(ty-state.y)*.15)*.74;
   state.vr=(state.vr+(tr-state.rotation)*.12)*.73;
   state.x+=state.vx;state.y+=state.vy;state.rotation+=state.vr;
   el.style.setProperty('--oido-scatter-x',state.x.toFixed(2)+'px');
   el.style.setProperty('--oido-scatter-y',state.y.toFixed(2)+'px');
   el.style.setProperty('--oido-scatter-r',state.rotation.toFixed(2)+'deg');
   energy+=Math.abs(tx-state.x)+Math.abs(ty-state.y)+Math.abs(state.vx)+Math.abs(state.vy)+Math.abs(state.rotation-tr)+Math.abs(state.vr);
  }
  if(pointerInside||energy>.5){requestAnimationFrame(animate);}
  else{animating=false;items.forEach(o=>{o.el.style.removeProperty('--oido-scatter-x');o.el.style.removeProperty('--oido-scatter-y');o.el.style.removeProperty('--oido-scatter-r');});}
 }
 pile.addEventListener('pointerenter',ev=>{if(ev.pointerType==='touch')return;pointerInside=true;localize(ev);start();},{passive:true});
 pile.addEventListener('pointermove',ev=>{if(ev.pointerType==='touch')return;pointerInside=true;localize(ev);start();},{passive:true});
 pile.addEventListener('pointerleave',()=>{pointerInside=false;start();},{passive:true});
 window.addEventListener('blur',()=>{pointerInside=false;start();},{passive:true});
})();
