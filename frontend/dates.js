'use strict';
window.LighthouseDates=(()=>{
 const format=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)?value.split('-').reverse().join('/'):'DD/MM/YYYY';
 function enhance(root=document){for(const input of root.querySelectorAll('input[type=date]')){
  if(input.parentElement.classList.contains('lh-date'))continue;
  if(input.name==='dob')input.max=new Date().toISOString().slice(0,10);
  const wrapper=document.createElement('span');wrapper.className='lh-date';input.before(wrapper);wrapper.append(input);
  const display=document.createElement('span');display.className='lh-date-display';display.setAttribute('aria-hidden','true');wrapper.append(display);
  const sync=()=>{display.textContent=format(input.value);input.dataset.empty=String(!input.value);};input.addEventListener('input',sync);input.addEventListener('change',sync);sync();
 }}
 const start=()=>{enhance();new MutationObserver(mutations=>{if(mutations.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&!n.classList?.contains('lh-date-display'))))enhance();}).observe(document.body,{childList:true,subtree:true});};
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start):start();return {enhance,format};
})();
