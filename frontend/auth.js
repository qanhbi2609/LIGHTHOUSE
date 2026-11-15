'use strict';
window.LighthouseAuth=(()=>{
let api,onLogin,onRegister;
const eye='<svg viewBox="0 0 28 24" fill="none" aria-hidden="true"><path d="M2 11c5-10 19-10 24 0"/><circle cx="14" cy="14" r="4"/></svg>';
function show(){
 document.querySelector('#app').innerHTML=`<main class="auth-shell"><section class="auth-card auth-login" aria-label="Đăng nhập"><div class="auth-logo" role="img" aria-label="Giving It Back To Kids — Hope Inspirers"></div><h1 class="auth-brand">LIGHTHOUSE</h1><form id="login-form" class="auth-login-form" novalidate><div class="auth-field"><label for="auth-email">Email</label><input id="auth-email" name="email" type="email" placeholder="Nhập email" autocomplete="username" required></div><div class="auth-field"><label for="auth-password">Mật khẩu</label><div class="auth-password"><input id="auth-password" name="password" type="password" placeholder="Nhập mật khẩu" autocomplete="current-password" required><button class="auth-eye" type="button" aria-label="Hiện mật khẩu" aria-pressed="false">${eye}</button></div></div><p id="auth-login-error" class="auth-inline-error" role="alert"></p><label class="auth-remember"><input type="checkbox" name="remember">Ghi nhớ đăng nhập</label><div class="auth-login-actions"><button type="submit" class="auth-primary">Đăng nhập</button><div class="auth-forgot-wrap"><button type="button" class="auth-forgot-link" disabled>Quên mật khẩu?</button></div><button type="button" class="auth-register">Đăng ký vào Lighthouse</button></div></form></section></main>`;
 document.querySelector('.auth-register').onclick=onRegister;
 document.querySelector('.auth-forgot-link').onclick=showForgot;
 document.querySelector('.auth-eye').onclick=e=>{const b=e.currentTarget,input=document.querySelector('#auth-password'),visible=input.type==='password';input.type=visible?'text':'password';b.setAttribute('aria-pressed',String(visible));b.setAttribute('aria-label',visible?'Ẩn mật khẩu':'Hiện mật khẩu');};
 const form=document.querySelector('#login-form'),error=document.querySelector('#auth-login-error');
 form.oninput=()=>{error.textContent='';form.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));};
 form.onsubmit=async e=>{e.preventDefault();const values=Object.fromEntries(new FormData(form));
  if(!values.email.trim()||!values.password){error.textContent='Vui lòng không để trống thông tin';for(const key of ['email','password'])if(!values[key])form.elements[key].setAttribute('aria-invalid','true');return;}
  if(!/^\S+@\S+\.\S+$/.test(values.email.trim())){error.textContent='Email không hợp lệ';form.elements.email.setAttribute('aria-invalid','true');return;}
  const button=form.querySelector('[type=submit]');button.disabled=true;try{const d=await api('auth/login',{method:'POST',body:values});await onLogin(d,Boolean(values.remember));}catch(e){error.textContent=e.message==='Email hoặc mật khẩu sai!'?'Email hoặc mật khẩu sai.':e.message;form.elements.email.setAttribute('aria-invalid','true');if(e.message==='Email hoặc mật khẩu sai!')form.elements.password.setAttribute('aria-invalid','true');}finally{button.disabled=false;}
 };
}
function showForgot(prefillEmail){
 const app=document.querySelector('#app');
 app.innerHTML=`<main class="auth-shell"><section class="auth-card auth-login" aria-label="Quên mật khẩu"><div class="auth-logo" role="img" aria-label="Giving It Back To Kids — Hope Inspirers"></div><h1 class="auth-brand">LIGHTHOUSE</h1><div id="forgot-step1"><h2 class="auth-forgot-title">Đặt lại mật khẩu</h2><p class="auth-forgot-desc">Nhập email tài khoản để nhận mã OTP.</p><form id="forgot-form1" novalidate><div class="auth-field"><label for="forgot-email">Email</label><input id="forgot-email" name="email" type="email" placeholder="Nhập email" autocomplete="username" required></div><p id="forgot-err1" class="auth-inline-error" role="alert"></p><div class="auth-login-actions"><button type="submit" class="auth-primary">Gửi mã OTP</button><button type="button" class="auth-secondary" id="back-to-login">Quay lại đăng nhập</button></div></form></div><div id="forgot-step2" style="display:none"><h2 class="auth-forgot-title">Nhập mã OTP</h2><p class="auth-forgot-desc">Mã OTP đã được gửi đến email của bạn. Mã có hiệu lực 10 phút.</p><form id="forgot-form2" novalidate><div class="auth-field"><label for="forgot-otp">Mã OTP</label><input id="forgot-otp" name="otp" type="text" inputmode="numeric" placeholder="Nhập mã 6 chữ số" maxlength="6" autocomplete="one-time-code" required></div><div class="auth-field"><label for="forgot-pass1">Mật khẩu mới</label><div class="auth-password"><input id="forgot-pass1" name="password" type="password" placeholder="Nhập mật khẩu mới" autocomplete="new-password" required><button class="auth-eye" type="button" aria-label="Hiện mật khẩu" aria-pressed="false">${eye}</button></div></div><div class="auth-field"><label for="forgot-pass2">Xác nhận mật khẩu</label><input id="forgot-pass2" name="password2" type="password" placeholder="Nhập lại mật khẩu" autocomplete="new-password" required></div><p id="forgot-err2" class="auth-inline-error" role="alert"></p><div class="auth-login-actions"><button type="submit" class="auth-primary">Đặt lại mật khẩu</button><button type="button" class="auth-secondary" id="resend-otp">Gửi lại mã</button></div></form></div></section></main>`;
 let currentEmail='';
 document.querySelector('#back-to-login').onclick=show;
 const eye2=app.querySelector('.auth-eye');
 if(eye2)eye2.onclick=e=>{const b=e.currentTarget,inp=b.previousElementSibling||app.querySelector('#forgot-pass1'),vis=inp.type==='password';inp.type=vis?'text':'password';b.setAttribute('aria-pressed',String(vis));b.setAttribute('aria-label',vis?'Ẩn mật khẩu':'Hiện mật khẩu');};
 const emailInput=app.querySelector('#forgot-email');
 if(typeof prefillEmail==='string'&&prefillEmail)emailInput.value=prefillEmail;
 const form1=app.querySelector('#forgot-form1'),err1=app.querySelector('#forgot-err1');
 form1.oninput=()=>{err1.textContent='';form1.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));};
 form1.onsubmit=async e=>{
  e.preventDefault();const email=emailInput.value.trim();
  if(!email||!/^\S+@\S+\.\S+$/.test(email)){err1.textContent='Email không hợp lệ';emailInput.setAttribute('aria-invalid','true');return;}
  const btn=form1.querySelector('[type=submit]');btn.disabled=true;err1.textContent='';
  try{
   const d=await api('auth/forgot',{method:'POST',body:{email}});
   currentEmail=email;
   app.querySelector('#forgot-step1').style.display='none';
   app.querySelector('#forgot-step2').style.display='';
   if(d.devOtp){const desc=app.querySelector('#forgot-step2 .auth-forgot-desc');desc.innerHTML=`Mã OTP đã được tạo. <strong style="color:#1a3a5c">[DEV] Mã: ${d.devOtp}</strong><br><small>Môi trường test – chưa cấu hình RESEND_API_KEY.</small>`;}
  }catch(ex){err1.textContent=ex.message||'Có lỗi xảy ra';}finally{btn.disabled=false;}
 };
 const form2=app.querySelector('#forgot-form2'),err2=app.querySelector('#forgot-err2');
 form2.oninput=()=>{err2.textContent='';form2.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));};
 app.querySelector('#resend-otp').onclick=async()=>{
  if(!currentEmail)return;
  const btn=app.querySelector('#resend-otp');btn.disabled=true;
  try{const d=await api('auth/forgot',{method:'POST',body:{email:currentEmail}});if(d.devOtp){const desc=app.querySelector('#forgot-step2 .auth-forgot-desc');desc.innerHTML=`Mã OTP đã được tạo. <strong style="color:#1a3a5c">[DEV] Mã: ${d.devOtp}</strong><br><small>Môi trường test – chưa cấu hình RESEND_API_KEY.</small>`;}}catch(ex){err2.textContent=ex.message||'Không thể gửi lại mã';}finally{btn.disabled=false;}
 };
 form2.onsubmit=async e=>{
  e.preventDefault();const vals=Object.fromEntries(new FormData(form2));
  const otp=vals.otp.trim(),pass=vals.password,pass2=vals.password2;
  if(!otp||!pass||!pass2){err2.textContent='Vui lòng điền đầy đủ thông tin';return;}
  if(!/^\d{6}$/.test(otp)){err2.textContent='Mã OTP gồm 6 chữ số';app.querySelector('#forgot-otp').setAttribute('aria-invalid','true');return;}
  if(pass.length<4||pass.length>128||/\s/.test(pass)){err2.textContent='Mật khẩu từ 4–128 ký tự, không chứa khoảng trắng';app.querySelector('#forgot-pass1').setAttribute('aria-invalid','true');return;}
  if(pass!==pass2){err2.textContent='Mật khẩu xác nhận không khớp';app.querySelector('#forgot-pass2').setAttribute('aria-invalid','true');return;}
  const btn=form2.querySelector('[type=submit]');btn.disabled=true;err2.textContent='';
  try{
   await api('auth/reset',{method:'POST',body:{email:currentEmail,otp,password:pass}});
   app.querySelector('#app')||document;
   show();
   setTimeout(()=>{const errEl=document.querySelector('#auth-login-error');if(errEl){errEl.style.color='#16a34a';errEl.textContent='Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.';}},50);
  }catch(ex){err2.textContent=ex.message||'Mã OTP không đúng hoặc đã hết hạn';}finally{btn.disabled=false;}
 };
}
return {mount(options){({api,onLogin,onRegister}=options);show();}};
})();
