'use strict';
window.LighthouseRegistration=(()=>{
const provinces=['An Giang','Bắc Ninh','Cà Mau','Cao Bằng','Cần Thơ','Đà Nẵng','Đắk Lắk','Điện Biên','Đồng Nai','Đồng Tháp','Gia Lai','Hà Nội','Hà Tĩnh','Hải Phòng','Hồ Chí Minh','Huế','Hưng Yên','Khánh Hòa','Lai Châu','Lâm Đồng','Lạng Sơn','Lào Cai','Nghệ An','Ninh Bình','Phú Thọ','Quảng Ngãi','Quảng Ninh','Quảng Trị','Sơn La','Tây Ninh','Thái Nguyên','Thanh Hóa','Tuyên Quang','Vĩnh Long'];
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uploadIcon='<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 2v11m-4-4 4 4 4-4M3 12v5h14v-5" stroke="currentColor" stroke-width="1.5"/></svg>';
function field(label,name,placeholder,type='text',extra=''){return `<div class="registration-field ${type==='date'?'registration-date':''}"><label for="registration-${name}">${label}</label><input id="registration-${name}" name="${name}" type="${type}" placeholder="${placeholder}" ${type==='date'?'data-empty="true"':''} ${extra}>${type==='date'?'<span class="registration-date-hint" aria-hidden="true">dd/mm/yyyy</span>':''}<small class="registration-error" id="error-${name}"></small></div>`;}
function upload(label,name,id){return `<div class="registration-field"><label for="${id}">${label}</label><label class="registration-upload">${uploadIcon}<span>Tải lên từ thiết bị</span><input type="file" id="${id}" name="${name}" accept="image/jpeg,image/png,application/pdf" multiple aria-label="${label}"></label><small class="registration-file-names"></small><small class="registration-error" id="error-${name}"></small></div>`;}
function mount({api,encodeFiles,onLogin,notify=()=>{}}){
document.querySelector('#app').innerHTML=`<main class="registration-shell"><form id="registration-form" novalidate><h1>Đăng ký vào Lighthouse</h1><section class="registration-personal"><h2>Thông tin cá nhân</h2><div class="registration-personal-grid">
${field('Họ tên:','name','Nhập họ tên','text','autocomplete="name"')}
${field('Ngày sinh:','dob','dd/mm/yyyy','date',`max="${new Date().toISOString().slice(0,10)}"`)}
<div class="registration-field"><label for="registration-hometown">Quê quán:</label><select id="registration-hometown" name="hometown"><option value="">Chọn tỉnh/thành phố</option>${provinces.map(p=>`<option>${esc(p)}</option>`).join('')}</select><small class="registration-error" id="error-hometown"></small></div>
${field('Địa chỉ thường trú:','address','Nhập địa chỉ thường trú','text','autocomplete="street-address"')}
${field('Số điện thoại:','phone','Nhập số điện thoại','tel','autocomplete="tel" inputmode="tel"')}
${field('Email:','email','Nhập email','email','autocomplete="email"')}
${field('Số căn cước công dân:','cccd','Nhập số căn cước công dân (12 chữ số)','text','inputmode="numeric" maxlength="12"')}
</div></section>
<section class="registration-family"><h2>Hoàn cảnh gia đình</h2><div class="registration-family-grid">${field('Hoàn cảnh:','family','Nhập hoàn cảnh gia đình.')}${upload('Minh chứng','familyFiles','registration-files')}</div></section>
<section class="registration-education"><h2>Tình hình học tập</h2><div class="registration-education-grid">
${field('Trường:','school','Nhập “chưa chọn” nếu chưa chọn trường')}${field('Ngành:','major','Nhập “chưa chọn” nếu chưa chọn ngành')}
<div class="registration-school-files">${upload('Giấy tờ bổ sung:','schoolFiles','registration-school-files')}<p>Cung cấp học bạ THPT nếu bạn chưa trúng tuyển.<br>Cung cấp giấy báo trúng tuyển nếu bạn đã trúng tuyển.</p></div>
<div class="registration-description registration-field"><label for="registration-description">Mô tả ngành học của bạn:</label><textarea id="registration-description" name="description" placeholder="Nhập mô tả ngành học của bạn, nếu bạn chưa chọn được ngành, hãy cho chúng tôi biết dự định của bạn trong tương lai"></textarea><small class="registration-error" id="error-description"></small></div>
<ul class="registration-prompts"><li>Vì sao bạn chọn ngành này?</li><li>Bạn cảm thấy phù hợp với ngành này như thế nào?</li><li>Nếu theo học ngành này sau khi tốt nghiệp bạn sẽ làm nghề gì?</li><li>Mức lương của ngành nghề này là bao nhiêu?</li><li>Ngành này yêu cầu những kỹ năng gì?</li><li>Làm thế nào để phát triển những kỹ năng đó?</li><li>Kế hoạch cần làm để phát triển kỹ năng cho công việc tương lai?</li></ul>
</div></section><div class="registration-status" role="alert"></div><button type="submit" class="auth-primary registration-submit">Nộp hồ sơ</button></form></main>`;
const form=document.querySelector('#registration-form');
form.elements.dob.oninput=()=>{form.elements.dob.dataset.empty=String(!form.elements.dob.value);};
form.querySelectorAll('input[type=file]').forEach(input=>input.onchange=()=>{input.closest('.registration-field').querySelector('.registration-file-names').textContent=[...input.files].map(f=>f.name).join(', ');});
form.onsubmit=async e=>{
e.preventDefault();const status=form.querySelector('.registration-status');status.textContent='';
form.querySelectorAll('.registration-error').forEach(el=>el.textContent='');form.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));
const data=Object.fromEntries(new FormData(form));const invalid=[];
const fail=(name,message)=>{form.querySelector('#error-'+name).textContent=message;form.elements[name].setAttribute('aria-invalid','true');invalid.push(form.elements[name]);};
for(const name of ['name','dob','hometown','address','phone','email','cccd','family','school','major','description']){data[name]=String(data[name]||'').trim();if(!data[name])fail(name,'Vui lòng nhập đầy đủ thông tin.');}
if(data.email&&!/^\S+@\S+\.\S+$/.test(data.email))fail('email','Email không hợp lệ.');
if(data.phone&&!/^0\d{9}$/.test(data.phone))fail('phone','Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0.');
if(data.cccd&&!/^\d{12}$/.test(data.cccd))fail('cccd','Số căn cước công dân phải gồm 12 chữ số.');
if(data.dob&&(!Number.isFinite(Date.parse(data.dob))||data.dob>new Date().toISOString().slice(0,10)))fail('dob','Ngày sinh không hợp lệ.');
const family=form.elements.familyFiles.files,school=form.elements.schoolFiles.files;
for(const [name,files] of [['familyFiles',family],['schoolFiles',school]]){
if(!files.length)fail(name,'Vui lòng tải lên giấy tờ minh chứng.');
if([...files].some(f=>!['image/png','image/jpeg','application/pdf'].includes(f.type)||f.size===0||f.size>1500000))fail(name,'Chỉ nhận PNG, JPG, PDF; tối đa 1,5 MB/tệp.');
}
if(family.length+school.length>6){status.textContent='Chỉ được tải lên tối đa 6 tệp.';return;}
if(invalid.length){status.textContent='Vui lòng cung cấp đầy đủ và chính xác tất cả các thông tin!';notify(status.textContent);invalid[0].focus();return;}
const button=form.querySelector('[type=submit]');button.disabled=true;
try{
data.familyFiles=await encodeFiles(family);data.schoolFiles=await encodeFiles(school);
await api('registrations',{method:'POST',body:data});
document.querySelector('#app').innerHTML=`<main class="registration-shell registration-success"><div class="registration-success-content"><div class="auth-success-icon"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="50"/><path d="m26 48 17 17c8-12 17-22 31-30"/></svg></div><h1>ĐĂNG KÝ THÀNH CÔNG!</h1><p>Thông tin của bạn đã được ghi nhận. Vui lòng theo dõi Email để nhận thông báo về<br class="registration-wide-break"> tình trạng hồ sơ và các hướng dẫn tiếp theo từ Lighthouse.</p><button class="auth-primary" type="button">Quay lại màn hình Đăng nhập</button></div></main>`;
document.querySelector('.registration-success button').onclick=onLogin;
}catch(error){status.textContent=error.message;}finally{button.disabled=false;}
};
}
return {mount};
})();
