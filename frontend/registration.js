'use strict';
window.LighthouseRegistration=(()=>{
const provinces=['An Giang','Bắc Ninh','Cà Mau','Cao Bằng','Cần Thơ','Đà Nẵng','Đắk Lắk','Điện Biên','Đồng Nai','Đồng Tháp','Gia Lai','Hà Nội','Hà Tĩnh','Hải Phòng','Hồ Chí Minh','Huế','Hưng Yên','Khánh Hòa','Lai Châu','Lâm Đồng','Lạng Sơn','Lào Cai','Nghệ An','Ninh Bình','Phú Thọ','Quảng Ngãi','Quảng Ninh','Quảng Trị','Sơn La','Tây Ninh','Thái Nguyên','Thanh Hóa','Tuyên Quang','Vĩnh Long'];
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uploadIcon='<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 2v11m-4-4 4 4 4-4M3 12v5h14v-5" stroke="currentColor" stroke-width="1.5"/></svg>';
function field(label,name,placeholder,type='text',extra=''){return `<div class="registration-field ${type==='date'?'registration-date':''}"><label for="registration-${name}">${label}</label><input id="registration-${name}" name="${name}" type="${type}" placeholder="${placeholder}" ${type==='date'?'data-empty="true"':''} ${extra}>${type==='date'?'<span class="registration-date-hint" aria-hidden="true">dd/mm/yyyy</span>':''}<small class="registration-error" id="error-${name}"></small></div>`;}
function upload(label,name,id){return `<div class="registration-field"><label for="${id}">${label}</label><label class="registration-upload">${uploadIcon}<span>Tải lên từ thiết bị</span><input type="file" id="${id}" name="${name}" accept="image/jpeg,image/png,application/pdf" multiple aria-label="${label}"></label><small class="registration-file-names"></small><small class="registration-error" id="error-${name}"></small></div>`;}
function mount({api,encodeFiles,onLogin,notify=()=>{}}){
document.querySelector('#app').innerHTML=`<main class="registration-shell"><button type="button" class="registration-back" aria-label="Quay lại đăng nhập"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 4-6 6 6 6M3 10h9c6 0 9 3 9 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button><form id="registration-form" novalidate><h1>Đăng ký vào Lighthouse</h1><section class="registration-personal"><h2>Thông tin cá nhân</h2><div class="registration-personal-grid">
${field('Họ tên:','name','Nhập họ tên','text','autocomplete="name"')}
${field('Ngày sinh:','dob','dd/mm/yyyy','date',`max="${new Date().toISOString().slice(0,10)}"`)}
<div class="registration-field"><label for="registration-hometown">Quê quán:</label><select id="registration-hometown" name="hometown"><option value="">Chọn tỉnh/thành phố</option>${provinces.map(p=>`<option>${esc(p)}</option>`).join('')}</select><small class="registration-error" id="error-hometown"></small></div>
${field('Địa chỉ thường trú:','address','Nhập địa chỉ thường trú','text','autocomplete="street-address"')}
${field('Số điện thoại:','phone','Nhập số điện thoại','tel','autocomplete="tel" inputmode="tel"')}
${field('Email:','email','Nhập email','email','autocomplete="email"')}
${field('Số căn cước công dân:','cccd','Nhập số căn cước công dân (12 chữ số)','text','inputmode="numeric" maxlength="12"')}
</div></section>
<section class="registration-family"><h2>Hoàn cảnh gia đình</h2><div class="registration-family-grid">${field('Hoàn cảnh:','family','Nhập hoàn cảnh gia đình.')}</div></section>
<section class="registration-education"><h2>Tình hình học tập</h2><div class="registration-education-grid">
${field('Trường:','school','Nhập “chưa chọn” nếu chưa chọn trường')}${field('Ngành:','major','Nhập “chưa chọn” nếu chưa chọn ngành')}

<div class="registration-description registration-field"><label for="registration-description">Mô tả ngành học của bạn:</label><textarea id="registration-description" name="description" placeholder="Nhập mô tả ngành học của bạn, nếu bạn chưa chọn được ngành, hãy cho chúng tôi biết dự định của bạn trong tương lai"></textarea><small class="registration-error" id="error-description"></small></div>
<ul class="registration-prompts"><li>Vì sao bạn chọn ngành này?</li><li>Bạn cảm thấy phù hợp với ngành này như thế nào?</li><li>Nếu theo học ngành này sau khi tốt nghiệp bạn sẽ làm nghề gì?</li><li>Mức lương của ngành nghề này là bao nhiêu?</li><li>Ngành này yêu cầu những kỹ năng gì?</li><li>Làm thế nào để phát triển những kỹ năng đó?</li><li>Kế hoạch cần làm để phát triển kỹ năng cho công việc tương lai?</li></ul>
</div></section><section class="registration-evidence"><h2>Minh chứng</h2>${upload('Minh chứng','files','registration-files')}<p>Cung cấp hoàn cảnh hộ nghèo/ cận nghèo/ thương binh.....<br>Cung cấp học bạ THPT nếu bạn chưa trúng tuyển.<br>Cung cấp giấy báo trúng tuyển nếu bạn đã trúng tuyển.</p></section><div class="registration-status" role="alert"></div><button type="submit" class="auth-primary registration-submit">Nộp hồ sơ</button></form></main>`;
document.querySelector('.registration-back').onclick=onLogin;
const form=document.querySelector('#registration-form');
for(const field of form.querySelectorAll('.registration-field')){const label=field.querySelector(':scope>label'),error=field.querySelector('.registration-error');if(label&&error){const row=document.createElement('div');row.className='registration-label-row';label.before(row);row.append(label,error);}}
const evidence=form.querySelector('.registration-evidence');const proofLabel=evidence.querySelector('.registration-label-row');if(proofLabel){proofLabel.classList.add('registration-proof-label');evidence.append(proofLabel);}
const select=form.elements.hometown;
const first=['Hồ Chí Minh','Hà Nội','Đà Nẵng','Hải Phòng'],ordered=[...first,...provinces.filter(p=>!first.includes(p))];
select.innerHTML='<option value="">Chọn tỉnh/thành phố</option>'+ordered.map(p=>`<option value="${esc(p)}">${esc(first.includes(p)?'Thành phố '+p:p)}</option>`).join('');
select.hidden=true;const combo=document.createElement('button');combo.type='button';combo.className='registration-combobox';combo.id='registration-hometown-combo';combo.setAttribute('role','combobox');combo.setAttribute('aria-expanded','false');combo.setAttribute('aria-controls','registration-province-list');combo.setAttribute('aria-label','Quê quán');combo.textContent='Chọn tỉnh/thành phố';
select.after(combo);form.querySelector('label[for=registration-hometown]').htmlFor=combo.id;const list=document.createElement('div');list.id='registration-province-list';list.className='registration-province-list';list.setAttribute('role','listbox');list.hidden=true;combo.after(list);
let active=0;const draw=()=>{combo.setAttribute('aria-expanded',String(!list.hidden));combo.setAttribute('aria-activedescendant','registration-province-'+active);list.innerHTML=ordered.map((p,i)=>`<button type="button" role="option" id="registration-province-${i}" aria-selected="${select.value===p}" tabindex="-1" data-index="${i}">${esc(first.includes(p)?'Thành phố '+p:p)}</button>`).join('');list.querySelectorAll('button').forEach(b=>b.onclick=()=>choose(Number(b.dataset.index)));};
function choose(i){select.value=ordered[i];combo.textContent=select.selectedOptions[0].textContent;combo.classList.add('has-value');list.hidden=true;combo.setAttribute('aria-expanded','false');combo.removeAttribute('aria-invalid');select.removeAttribute('aria-invalid');form.querySelector('#error-hometown').textContent='';combo.focus();}
combo.onclick=()=>{list.hidden=!list.hidden;active=Math.max(0,ordered.indexOf(select.value));draw();};
combo.onkeydown=e=>{if(['ArrowDown','ArrowUp','Home','End','Enter','Escape',' '].includes(e.key)){e.preventDefault();if(e.key==='Escape'){list.hidden=true;combo.setAttribute('aria-expanded','false');return;}if((e.key==='Enter'||e.key===' ')&&!list.hidden){choose(active);return;}if(list.hidden){list.hidden=false;draw();}else active=e.key==='Home'?0:e.key==='End'?ordered.length-1:Math.max(0,Math.min(ordered.length-1,active+(e.key==='ArrowUp'?-1:1)));list.querySelectorAll('button').forEach((b,i)=>b.classList.toggle('focused',i===active));combo.setAttribute('aria-activedescendant','registration-province-'+active);list.children[active]?.scrollIntoView({block:'nearest'});}};
combo.parentElement.addEventListener('focusout',e=>{if(!combo.parentElement.contains(e.relatedTarget)){list.hidden=true;combo.setAttribute('aria-expanded','false');}});
form.addEventListener('click',e=>{if(!list.contains(e.target)&&e.target!==combo){list.hidden=true;combo.setAttribute('aria-expanded','false');}});
form.elements.dob.oninput=()=>{form.elements.dob.dataset.empty=String(!form.elements.dob.value);};
form.querySelectorAll('input[type=file]').forEach(input=>input.onchange=()=>{input.closest('.registration-field').querySelector('.registration-file-names').textContent=[...input.files].map(f=>f.name).join(', ');});
form.onsubmit=async e=>{
e.preventDefault();const status=form.querySelector('.registration-status');status.textContent='';
form.querySelectorAll('.registration-error').forEach(el=>el.textContent='');form.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));
const data=Object.fromEntries(new FormData(form));const invalid=[];
const fail=(name,message)=>{form.querySelector('#error-'+name).textContent=message;form.elements[name].setAttribute('aria-invalid','true');if(name==='hometown'){combo.setAttribute('aria-invalid','true');invalid.push(combo);}else invalid.push(form.elements[name]);};
for(const name of ['name','dob','hometown','address','phone','email','cccd','family','school','major','description']){data[name]=name==='phone'?String(data[name]||''):String(data[name]||'').trim();if(!data[name])fail(name,'Vui lòng điền đầy đủ và chính xác các thông tin!');}
if(data.email&&!/^\S+@\S+\.\S+$/.test(data.email))fail('email','Địa chỉ email không hợp lệ!');
if(data.phone&&!/^0\d{9}$/.test(data.phone))fail('phone','Số điện thoại không hợp lệ');
if(data.cccd&&!/^\d{12}$/.test(data.cccd))fail('cccd','Số CCCD phải có 12 chữ số!');
if(data.dob&&(!Number.isFinite(Date.parse(data.dob))||data.dob>new Date().toISOString().slice(0,10)))fail('dob','Ngày sinh không hợp lệ.');
const files=form.elements.files.files;
if(!files.length)fail('files','Vui lòng tải lên giấy tờ minh chứng.');
if([...files].some(f=>!['image/png','image/jpeg','application/pdf'].includes(f.type)))fail('files','Chỉ nhận PNG, JPG, PDF; tối đa 1,5 MB/tệp.');
if([...files].some(f=>f.size===0||f.size>1500000))fail('files','Dung lượng tệp vượt quá giới hạn cho phép!...');
if(files.length>6)fail('files','Chỉ được tải lên tối đa 6 tệp.');
if(invalid.length){invalid[0].focus();return;}
const button=form.querySelector('[type=submit]');button.disabled=true;
try{
data.files=await encodeFiles(files);data.evidenceMode='combined';
await api('registrations',{method:'POST',body:data});
document.querySelector('#app').innerHTML=`<main class="registration-shell registration-success"><div class="registration-success-content"><div class="auth-success-icon"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="50"/><path d="m26 48 17 17c8-12 17-22 31-30"/></svg></div><h1>ĐĂNG KÝ THÀNH CÔNG!</h1><p>Thông tin của bạn đã được ghi nhận. Vui lòng theo dõi Email để nhận thông báo về<br class="registration-wide-break"> tình trạng hồ sơ và các hướng dẫn tiếp theo từ Lighthouse.</p><button class="auth-primary" type="button">Quay lại màn hình Đăng nhập</button></div></main>`;
document.querySelector('.registration-success button').onclick=onLogin;
}catch(error){status.textContent=error.message;}finally{button.disabled=false;}
};
}
return {mount};
})();
