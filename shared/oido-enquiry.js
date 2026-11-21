
(function(){
var form=document.getElementById('lead-form');if(!form)return;
var button=form.querySelector('.lead-submit'),label=form.querySelector('.lead-submit-label'),error=form.querySelector('#lead-error'),status=form.querySelector('#lead-status');
var businessInput=form.querySelector('#lead-biz'),emailInput=form.querySelector('#lead-email'),honeyInput=form.querySelector('#lead-honey');
var endpoint='https://formsubmit.co/ajax/diego@sinthetic.io';
var sending=false,timer=0;
function clean(v){return String(v||'').replace(/\s+/g,' ').trim();}
function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)&&v.length<=254;}
function setBusy(on){sending=on;form.setAttribute('aria-busy',on?'true':'false');button.disabled=on;if(on)label.textContent='Sending…';else if(!form.classList.contains('is-sent'))label.textContent='Request pilot access';}
function clearInvalid(){businessInput.removeAttribute('aria-invalid');emailInput.removeAttribute('aria-invalid');}
function showError(message,field){error.textContent=message;error.hidden=false;status.hidden=true;if(field){field.setAttribute('aria-invalid','true');field.focus({preventScroll:true});}}
function resetMessage(e){if(e&&e.target)e.target.removeAttribute('aria-invalid');error.hidden=true;if(!form.classList.contains('is-sent'))status.hidden=true;}
form.addEventListener('input',resetMessage);
form.addEventListener('submit',async function(e){
e.preventDefault();
if(sending||form.classList.contains('is-sent'))return;
clearInvalid();
var business=clean(businessInput.value),email=clean(emailInput.value),honey=clean(honeyInput.value);
businessInput.value=business;emailInput.value=email;
if(!business){showError('Please add your business name.',businessInput);return;}
if(!validEmail(email)){showError('Please add a valid email address.',emailInput);return;}
if(honey)return;
setBusy(true);error.hidden=true;status.hidden=true;
var plan=window.__oidoPlan||'';
var payload={business:business,email:email,_replyto:email,_cc:'dokarpov@gmail.com',_subject:'New Oído pilot request — '+business,_template:'table',_url:location.href,source:'oido-site'};
if(plan)payload.plan_clicked=plan;
var controller=new AbortController();
timer=setTimeout(function(){controller.abort();},10000);
try{
var response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
var data={};try{data=await response.json();}catch(_){}
if(response.status===429){var rateErr=new Error('rate');rateErr.code='rate';throw rateErr;}
if(!response.ok||data.success===false)throw new Error(data.message||'Request failed');
form.classList.add('is-sent');form.setAttribute('aria-busy','false');status.textContent='Request sent. We’ll get back to you about the pilot.';status.classList.add('is-success');status.hidden=false;
if(window.dataLayer)window.dataLayer.push({event:'lead_submitted',page:'business_site',plan:plan||'undecided'});
}catch(err){
if(err&&err.code==='rate')showError('Too many requests. Please wait a moment and try again.');
else showError(err&&err.name==='AbortError'?'The request timed out. Please try again.':'We couldn’t send this right now. Please try again.');
setBusy(false);
}finally{
if(timer){clearTimeout(timer);timer=0;}
}
});
})();
