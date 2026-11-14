'use strict';
// UC01 views. Recovery credentials remain in memory and are cleared on completion.
window.LighthouseAuth=(()=>{
let api,onLogin,onRegister,state={},timer,noticeTimer;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const eye='<svg viewBox="0 0 28 24" fill="none" aria-hidden="true"><path d="M2 11c5-10 19-10 24 0"/><circle cx="14" cy="14" r="4"/></svg>';
const policy='Mật khẩu phải có độ dài tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.';
const validPassword=p=>p.length>=8&&/[A-Z]/.test(p)&&/[a-z]/.test(p)&&/[0-9]/.test(p)&&/[^A-Za-z0-9\s]/.test(p);
function field(label,name,placeholder){return `<div class="auth-field"><div class="auth-label"><label for="auth-${name}">${label}</label><span id="error-${name}" class="auth-field-error" role="status"></span></div><div class="auth-password"><input id="auth-${name}" name="${name}" type="password" placeholder="${placeholder}" autocomplete="${name==='password'&&state.view==='login'?'current-password':'new-password'}" required><button class="auth-eye" type="button" aria-label="Hiện ${label.toLowerCase()}" aria-pressed="false">${eye}</button></div></div>`;}
function notice(message){
 clearTimeout(noticeTimer);document.querySelector('.auth-notice-layer')?.remove();
 const layer=document.createElement('div');layer.className='auth-notice-layer'+(state.view==='login'?' auth-login-notice':'');
 const box=document.createElement('div');box.className='auth-notice';box.setAttribute('role','alert');box.textContent=message;layer.append(box);
 layer.addEventListener('click',()=>layer.remove());document.body.append(layer);
 noticeTimer=setTimeout(()=>layer.remove(),3200);
}
function show(view='login'){
 clearInterval(timer);clearTimeout(noticeTimer);document.querySelector('.auth-notice-layer')?.remove();
 if(view==='login')state={};state.view=view;
 let content='';
 if(view==='login')content=`<div class="auth-logo" role="img" aria-label="Giving It Back To Kids — Hope Inspirers"></div><h1 class="auth-brand">LIGHTHOUSE</h1><form id="login-form" class="auth-login-form" novalidate><div class="auth-field"><label for="auth-email">Email</label><input id="auth-email" name="email" type="email" placeholder="Nhập email" autocomplete="username" required></div>${field('Mật khẩu','password','Nhập mật khẩu')}<p id="auth-login-error" class="auth-inline-error" role="alert"></p><label class="auth-remember"><input type="checkbox" name="remember">Ghi nhớ đăng nhập</label><div class="auth-login-actions"><button type="submit" class="auth-primary">Đăng nhập</button><button type="button" class="auth-link" data-view="forgot">Quên mật khẩu?</button><button type="button" class="auth-register">Đăng ký vào Lighthouse</button></div></form>`;
 if(view==='forgot')content=`<h1>Quên mật khẩu?</h1><p class="auth-forgot-help">Nhập Email đã đăng ký để đặt lại mật khẩu</p><form id="login-form" novalidate><input name="email" type="email" placeholder="Nhập email" aria-label="Email đã đăng ký" autocomplete="email" value="${esc(state.email||'')}" required><p id="auth-email-error" class="auth-inline-error" role="alert"></p><button class="auth-primary" type="submit">Tiếp tục</button></form>`;
 if(view==='verify')content=`<h1>Nhập mã xác minh</h1><form id="login-form" novalidate><p class="auth-otp-help">Vui lòng nhập mã xác minh gồm 4 chữ số được gửi qua email ${esc(state.maskedEmail)}</p><div class="auth-otp" role="group" aria-label="Mã xác minh gồm 4 chữ số">${[0,1,2,3].map(i=>`<input name="digit${i}" type="text" inputmode="numeric" pattern="[0-9]" placeholder=" " maxlength="1" autocomplete="${i===0?'one-time-code':'off'}" aria-label="Chữ số ${i+1}" required>`).join('')}</div><div class="auth-resend"><span>Không nhận được mã?</span><button class="auth-link" type="button" id="auth-resend">Gửi lại</button></div><p class="auth-countdown" aria-live="off"></p><button class="auth-primary" type="submit">Xác nhận</button></form>`;
 if(view==='reset')content=`<h1>Tạo mật khẩu mới</h1><form id="login-form" novalidate>${field('Mật khẩu mới','password','Nhập mật khẩu mới')}<p class="auth-policy">${policy}</p>${field('Xác nhận mật khẩu mới','confirmPassword','Nhập mật khẩu mới')}<button class="auth-primary" type="submit">Xác nhận</button></form>`;
 if(view==='success')content=`<div class="auth-success-icon"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="50"/><path d="m26 48 17 17c8-12 17-22 31-30"/></svg></div><h1>Đổi mật khẩu thành công!</h1><p>Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới.</p><button type="button" class="auth-primary" data-view="login">Đăng nhập</button>`;
 const back={forgot:'login',verify:'forgot',reset:'verify'}[view];
 document.querySelector('#app').innerHTML=`<main class="auth-shell"><section class="auth-card auth-${view}" aria-label="${view==='login'?'Đăng nhập':'Khôi phục mật khẩu'}">${back?`<button type="button" class="auth-back" aria-label="Quay lại" data-view="${back}"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 4-6 6 6 6M3 10h9c6 0 9 3 9 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`:''}${content}</section></main>`;
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{if(view==='reset')delete state.resetToken;show(b.dataset.view);});
 document.querySelector('.auth-register')?.addEventListener('click',()=>{clearInterval(timer);onRegister();});
 document.querySelectorAll('.auth-eye').forEach(b=>b.onclick=()=>{const input=b.previousElementSibling;const visible=input.type==='password';input.type=visible?'text':'password';b.setAttribute('aria-pressed',String(visible));b.setAttribute('aria-label',(visible?'Ẩn ':'Hiện ')+document.querySelector(`label[for="${input.id}"]`).textContent.toLowerCase());});
 const form=document.querySelector('#login-form');if(form){form.onsubmit=submit;form.addEventListener('input',()=>{form.querySelectorAll('[aria-invalid]').forEach(e=>e.removeAttribute('aria-invalid'));form.querySelectorAll('.auth-inline-error').forEach(e=>e.textContent='');});}
 if(view==='verify'){
  const digits=[...document.querySelectorAll('.auth-otp input')];
  digits.forEach((input,i)=>{
   input.oninput=()=>{input.value=input.value.replace(/\D/g,'').slice(-1);if(input.value)digits[i+1]?.focus();};
   input.onkeydown=e=>{if(e.key==='Backspace'&&!input.value)digits[i-1]?.focus();};
   input.onpaste=e=>{const code=e.clipboardData.getData('text').trim();if(!/^\d{4}$/.test(code))return;e.preventDefault();digits.forEach((el,n)=>el.value=code[n]);digits[3].focus();};
  });
  const update=()=>{const secs=Math.max(0,Math.ceil(((state.resendAt||Date.now())-Date.now())/1000));document.querySelector('#auth-resend').disabled=secs>0;document.querySelector('.auth-countdown').textContent=`Gửi lại mã sau (${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')})`;};update();timer=setInterval(update,250);
  document.querySelector('#auth-resend').onclick=async()=>{try{const d=await api('auth/forgot',{method:'POST',body:{email:state.email}});state.resendAt=Date.now()+d.resendAfter*1000;show('verify');}catch(e){notice(e.message);}};
 }
}
async function submit(e){
 e.preventDefault();const form=e.target,values=Object.fromEntries(new FormData(form)),button=form.querySelector('[type=submit]');button.disabled=true;
 try{
  if(state.view==='login'){if(!String(values.email||'').trim()||!values.password){document.querySelector('#auth-login-error').textContent='Vui lòng nhập Email và mật khẩu.';for(const key of ['email','password'])if(!values[key])form.elements[key].setAttribute('aria-invalid','true');return;}const d=await api('auth/login',{method:'POST',body:values});await onLogin(d,Boolean(values.remember));}
  else if(state.view==='forgot'){
   const email=String(values.email||'').trim();if(!/^\S+@\S+\.\S+$/.test(email)){document.querySelector('#auth-email-error').textContent=email?'Email không hợp lệ':'Vui lòng nhập Email';form.elements.email.setAttribute('aria-invalid','true');return;}
   const d=await api('auth/forgot',{method:'POST',body:{email}});if(Object.hasOwn(d,'demoCode')&&d.demoCode===null){notice('Kiểm tra lại địa chỉ Email');return;}state.email=email;state.maskedEmail=d.maskedEmail;state.resendAt=Date.now()+d.resendAfter*1000;show('verify');
  }else if(state.view==='verify'){
   const code=[0,1,2,3].map(i=>values['digit'+i]).join('');if(!/^\d{4}$/.test(code)){document.querySelector('.auth-otp').setAttribute('aria-invalid','true');notice('Mã xác thực không hợp lệ');return;}
   const d=await api('auth/verify',{method:'POST',body:{email:state.email,code}});state.resetToken=d.resetToken;show('reset');
  }else if(state.view==='reset'){
   const passwordError=document.querySelector('#error-password'),confirmError=document.querySelector('#error-confirmPassword');passwordError.textContent='';confirmError.textContent='';
   form.querySelectorAll('input').forEach(input=>input.removeAttribute('aria-invalid'));
   let invalid=false;if(!validPassword(values.password)){passwordError.textContent='Mật khẩu không hợp lệ!';form.elements.password.setAttribute('aria-invalid','true');invalid=true;}
   if(values.password!==values.confirmPassword){confirmError.textContent='Mật khẩu không trùng khớp!';form.elements.confirmPassword.setAttribute('aria-invalid','true');invalid=true;}
   if(invalid)return;
   await api('auth/reset',{method:'POST',body:{email:state.email,resetToken:state.resetToken,password:values.password}});state={};show('success');
  }
 }catch(error){
  if(state.view==='login'&&error.message==='Email hoặc mật khẩu sai!'){document.querySelector('#auth-login-error').textContent='Email hoặc mật khẩu sai.';for(const key of ['email','password'])form.elements[key].setAttribute('aria-invalid','true');}
  else{if(state.view==='verify')document.querySelector('.auth-otp').setAttribute('aria-invalid','true');notice(error.message);}
 }finally{button.disabled=false;}
}
return {mount(options){({api,onLogin,onRegister}=options);show(options.view||'login');}};
})();
