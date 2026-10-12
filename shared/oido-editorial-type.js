/* Editorial typography guard for live and server-rendered localized copy.
   Does not translate content. It only prevents hanging short words in supported
   languages and runs after async translation DOM updates. */
(function(){
 'use strict';
 var RULES={
  ru:/(\b(?:в|к|с|у|о|а|и|по|из|на|от|до|за|об|со|во|не|ни))([\t \n\r]+)(?=\S)/giu,
  uk:/(\b(?:в|у|з|і|й|та|на|по|до|за|не|ні|від|під|із))([\t \n\r]+)(?=\S)/giu,
  pl:/(\b(?:w|z|i|a|o|u|na|do|od|we|ze))([\t \n\r]+)(?=\S)/giu,
  cs:/(\b(?:v|k|s|z|o|u|a|i|na|do|po|od|ze))([\t \n\r]+)(?=\S)/giu,
  sk:/(\b(?:v|k|s|z|o|u|a|i|na|do|po|od|zo))([\t \n\r]+)(?=\S)/giu,
  es:/(\b(?:a|y|o|de|la|el))([\t \n\r]+)(?=\S)/giu,
  ca:/(\b(?:a|i|o|de|la|el))([\t \n\r]+)(?=\S)/giu
 };
 /* \b is not Unicode-aware for Cyrillic: use an explicit whitespace/punctuation boundary. */
 var CYRILLIC={
  ru:/(^|[\s([{«„“])((?:в|к|с|у|о|а|и|по|из|на|от|до|за|об|со|во|не|ни))([\t \n\r]+)(?=\S)/giu,
  uk:/(^|[\s([{«„“])((?:в|у|з|і|й|та|на|по|до|за|не|ні|від|під|із))([\t \n\r]+)(?=\S)/giu
 };
 function eligible(el){
  return el && el.closest &&
   el.closest('h1,h2,h3,h4,p,li,blockquote,figcaption,label,summary,.lead,.sub,.pitch-hero-lead,.pitch-sub,.note,.sc-steps,.tkt,.oido-menu-panel') &&
   !el.closest('script,style,noscript,textarea,select,option,code,pre,svg,[contenteditable],.notranslate,[translate="no"],[data-i18n-skip]');
 }
 var pending=0,running=false;
 function locale(){return (document.documentElement.lang||'en').toLowerCase().split('-')[0];}
 function format(root){
  var l=locale(),re=CYRILLIC[l]||RULES[l];
  if(!re||!root||!document.body)return;
  var count=0;
  var walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  var n;
  while((n=walker.nextNode())!==null){
   if(!eligible(n.parentElement)||!n.nodeValue||n.nodeValue.length>1000)continue;
   re.lastIndex=0;
   var text=n.nodeValue,formatted=CYRILLIC[l]?
     text.replace(re,function(_,prefix,prep){return prefix+prep+'\u00a0';}):
     text.replace(re,function(_,prep){return prep+'\u00a0';});
   if(formatted!==text){n.nodeValue=formatted;if(++count>=2500)break;}
  }
 }
 function run(){
  pending=0;if(running)return;running=true;
  try{format(document.body);}finally{running=false;}
 }
 function queue(){if(!pending)pending=setTimeout(run,150);}
 function init(){
  run();
  var observer=new MutationObserver(function(mutations){
   if(running)return;
   if(!RULES[locale()]&&!CYRILLIC[locale()])return;
   for(var i=0;i<mutations.length;i++){
    var m=mutations[i];
    if(m.type==='characterData'||(m.type==='childList'&&m.addedNodes.length)){queue();break;}
   }
  });
  observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  window.addEventListener('pageshow',queue,{passive:true});
  document.addEventListener('oido:translation-ready',queue);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
