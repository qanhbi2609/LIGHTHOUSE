'use strict';
// One non-blocking announcement component for every page and workflow.
window.LighthouseFeedback=(()=>{
 let timer;
 function clear(){clearTimeout(timer);document.querySelectorAll('.lh-feedback,.records-notice-layer,.auth-notice-layer').forEach(el=>el.remove());const old=document.querySelector('#toast');if(old)old.className='toast';}
 function show(message,kind='info'){
  if(kind==='info')kind=/không hợp lệ|không thể|không kết nối|không được|vui lòng|không phù hợp|thất bại|quá lớn|phòng đầy/i.test(message)?'error':/thành công|đã lưu|đã xóa|đã gửi/i.test(message)?'success':'info';
  clear();const box=document.createElement('div');box.className='lh-feedback '+kind;box.setAttribute('role',kind==='error'?'alert':'status');
  const icon=document.createElement('span');icon.className='lh-feedback-icon';icon.setAttribute('aria-hidden','true');icon.textContent=kind==='error'?'!':kind==='success'?'✓':'i';
  const text=document.createElement('span');text.textContent=message;const close=document.createElement('button');close.type='button';close.setAttribute('aria-label','Đóng thông báo');close.textContent='×';close.onclick=clear;
  box.append(icon,text,close);document.body.append(box);timer=setTimeout(clear,3200);
 }
 return {show,clear};
})();

for(const event of ['input','change'])document.addEventListener(event,e=>{const field=e.target,form=field.closest?.('form');if(!form||!field.name)return;field.removeAttribute('aria-invalid');field.classList.remove('invalid');for(const error of form.querySelectorAll('[data-error]'))if(error.dataset.error===field.name)error.textContent='';const error=form.querySelector('#error-'+CSS.escape(field.name));if(error)error.textContent='';});
