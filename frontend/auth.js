'use strict';
window.LighthouseAuth=(()=>{
let api,onLogin,onRegister;
const eye='<svg viewBox="0 0 28 24" fill="none" aria-hidden="true"><path d="M2 11c5-10 19-10 24 0"/><circle cx="14" cy="14" r="4"/></svg>';
function show(){
 document.querySelector('#app').innerHTML=`<main class="auth-shell"><section class="auth-card auth-login" aria-label="Đăng nhập"><div class="auth-logo" role="img" aria-label="Giving It Back To Kids — Hope Inspirers"></div><h1 class="auth-brand">LIGHTHOUSE</h1><form id="login-form" class="auth-login-form" novalidate><div class="auth-field"><label for="auth-email">Email</label><input id="auth-email" name="email" type="email" placeholder="Nhập email" autocomplete="username" required></div><div class="auth-field"><label for="auth-password">Mật khẩu</label><div class="auth-password"><input id="auth-password" name="password" type="password" placeholder="Nhập mật khẩu" autocomplete="current-password" required><button class="auth-eye" type="button" aria-label="Hiện mật khẩu" aria-pressed="false">${eye}</button></div></div><p id="auth-login-error" class="auth-inline-error" role="alert"></p><label class="auth-remember"><input type="checkbox" name="remember">Ghi nhớ đăng nhập</label><div class="auth-login-actions"><button type="submit" class="auth-primary">Đăng nhập</button><button type="button" class="auth-register">Đăng ký vào Lighthouse</button></div></form></section></main>`;
 document.querySelector('.auth-register').onclick=onRegister;
 document.querySelector('.auth-eye').onclick=e=>{const b=e.currentTarget,input=document.querySelector('#auth-password'),visible=input.type==='password';input.type=visible?'text':'password';b.setAttribute('aria-pressed',String(visible));b.setAttribute('aria-label',visible?'Ẩn mật khẩu':'Hiện mật khẩu');};
 const form=document.querySelector('#login-form'),error=document.querySelector('#auth-login-error');
 form.oninput=()=>{error.textContent='';form.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));};
 form.onsubmit=async e=>{e.preventDefault();const values=Object.fromEntries(new FormData(form));
  if(!values.email.trim()||!values.password){error.textContent='Vui lòng không để trống thông tin';for(const key of ['email','password'])if(!values[key])form.elements[key].setAttribute('aria-invalid','true');return;}
  if(!/^\S+@\S+\.\S+$/.test(values.email.trim())){error.textContent='Email không hợp lệ';form.elements.email.setAttribute('aria-invalid','true');return;}
  const button=form.querySelector('[type=submit]');button.disabled=true;try{const d=await api('auth/login',{method:'POST',body:values});await onLogin(d,Boolean(values.remember));}catch(e){error.textContent=e.message==='Email hoặc mật khẩu sai!'?'Email hoặc mật khẩu sai.':e.message;form.elements.email.setAttribute('aria-invalid','true');if(e.message==='Email hoặc mật khẩu sai!')form.elements.password.setAttribute('aria-invalid','true');}finally{button.disabled=false;}
 };
}
return {mount(options){({api,onLogin,onRegister}=options);show();}};
})();
