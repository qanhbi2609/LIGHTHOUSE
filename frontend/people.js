'use strict';
window.LighthousePeople={create({api,esc,prettyDate,permitted,put,setTitle,ui,studentDetail,refreshMe}){
const {layer,notice,confirm,gridTable,alignColumns}=ui,$=(s,r=document)=>r.querySelector(s),catalogue=window.LighthousePermissions;
const searchIcon='<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>';
const roles={QuanLy:'Người quản lý trực tiếp',CanBo:'Cán bộ cùng cấp',GiamDoc:'Giám đốc',SinhVien:'Sinh viên'};
let alumniQuery='',userQuery='',userRows=[];
const manageable=()=>permitted('users.manage');
const button=(label,action,id='',cls='secondary')=>`<button type="button" class="${cls} small" data-people-action="${action}" data-id="${esc(id)}">${label}</button>`;
async function alumni(){
 setTitle('Quản lý sinh viên kết thúc hỗ trợ');const {items}=await api('alumni?q='+encodeURIComponent(alumniQuery)),total=(await api('alumni')).items.length;
 const order=['LH015','LH013','LH021','LH023','LH018','LH031','LH034','LH054'];items.sort((a,b)=>(order.includes(a.id)?order.indexOf(a.id):99)-(order.includes(b.id)?order.indexOf(b.id):99));
 put(`<div class="records-workspace alumni-workspace"><section class="panel records-list-panel"><form id="alumni-search"><div class="search">${searchIcon}<input aria-label="Tìm sinh viên kết thúc hỗ trợ" placeholder="Nhập họ tên, mã sinh viên hoặc email" value="${esc(alumniQuery)}"></div><button class="primary" type="submit">${searchIcon} Tìm</button></form><div class="alumni-list-heading"><h2>Danh sách sinh viên</h2><span>${total} hồ sơ đã kết thúc chương trình</span></div>${gridTable(['Mã sinh viên','Sinh viên','Trường','Ngành','Ngày kết thúc','Trạng thái',''],[9.2,12.5,16.2,14.9,11.2,21,15],items.map(s=>`<tr><td>${esc(s.id)}</td><td><strong>${esc(s.name)}</strong></td><td>${esc(s.school)}</td><td>${esc(s.major)}</td><td>${prettyDate(s.endDate)}</td><td><span class="alumni-state ${s.endReason==='Rời trước thời hạn'?'early':''}">${esc(s.endReason==='Rời trước thời hạn'?s.endReason:s.status)}</span></td><td>${button('Xem','profile',s.id)}</td></tr>`).join(''),'alumni-data')}</section></div>`);
 const root=$('.alumni-workspace');$('.records-empty',root).hidden=items.length>0;alignColumns(root);
 $('#alumni-search').onsubmit=async e=>{e.preventDefault();alumniQuery=$('#alumni-search input').value.trim();try{await alumni();}catch(error){notice(error.message);}};
 $('#alumni-search input').oninput=e=>{if(!e.target.value){alumniQuery='';alumni().catch(error=>notice(error.message));}};
 root.querySelectorAll('[data-people-action]').forEach(b=>b.onclick=()=>studentDetail(b.dataset.id).catch(e=>notice(e.message)));
}
async function users(){
 setTitle('Quản lý người dùng và phân quyền');userRows=(await api('users')).items.filter(u=>u.active);
 put(`<div class="records-workspace users-workspace"><section class="panel records-list-panel"><div class="panel-top"><h2>Danh sách người dùng</h2><div class="toolrow"><div class="search">${searchIcon}<input id="people-search" aria-label="Tìm người dùng" placeholder="Nhập thông tin để tìm kiếm" value="${esc(userQuery)}"></div>${manageable()?button('＋ Thêm người dùng','new','','primary'):''}</div></div>${gridTable(['MÃ NGƯỜI DÙNG','HỌ TÊN','EMAIL','VAI TRÒ','QUYỀN',''],[12,19,19,17,15,18],'','users-data')}</section></div>`);
 $('#people-search').oninput=e=>filter(e.target.value);$('[data-people-action=new]')?.addEventListener('click',()=>edit());filter(userQuery);
}
function filter(value){
 userQuery=value;const q=value.trim().toLocaleLowerCase('vi'),rows=userRows.filter(u=>[u.id,u.name,u.email,roles[u.role]].some(v=>String(v).toLocaleLowerCase('vi').includes(q)));
 $('.users-data tbody').innerHTML=rows.map(u=>`<tr><td>${esc(u.id)}</td><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(roles[u.role])}</td><td>${catalogue.selected(u.permissions).length}</td><td><div class="actions">${manageable()?button('Chỉnh sửa','edit',u.id,'primary')+button('Xóa','delete',u.id):''}</div></td></tr>`).join('');$('.users-data .records-empty').hidden=rows.length>0;alignColumns($('.users-workspace'));
 $('.users-data').querySelectorAll('[data-people-action]').forEach(b=>b.onclick=()=>b.dataset.peopleAction==='edit'?edit(b.dataset.id):remove(b.dataset.id));
}
async function edit(id){
 if(!manageable())return;
 const rows=(await api('users')).items,u=rows.find(u=>u.id===id),creating=!id;if(id&&!u)return notice('Không tìm thấy người dùng.');
 const selected=new Set(catalogue.selected(u?.permissions||[]));
 const suggested='ND'+String(Math.max(0,...rows.map(u=>Number(u.id.replace(/\D/g,''))||0))+1).padStart(3,'0');
 const {el,close}=layer(`<section class="people-editor ${creating?'people-editor-new':''}" role="dialog" aria-modal="true" aria-label="${creating?'Thêm người dùng':'Thông tin phân quyền'}"><header><h2>${creating?'Thêm người dùng':'Thông tin phân quyền'}</h2><button type="button" data-close aria-label="Đóng">×</button></header><form id="people-form" novalidate><div class="people-editor-scroll"><div class="people-fields"><label>Mã người dùng<input name="id" value="${esc(u?.id||suggested)}" readonly></label><label>Email *<input name="email" type="email" placeholder="Nhập email người dùng" value="${esc(u?.email||'')}"><small class="records-error" data-error="email"></small></label><label>Họ tên *<input name="name" placeholder="Nhập họ tên người dùng" value="${esc(u?.name||'')}"><small class="records-error" data-error="name"></small></label><label>Vai trò<select name="role">${creating?'<option value="">Chọn vai trò người dùng</option>':''}${Object.entries(roles).map(([k,v])=>`<option value="${k}" ${u?.role===k?'selected':''}>${v}</option>`).join('')}</select><small class="records-error" data-error="role"></small></label><label>${creating?'Mật khẩu *':'Mật khẩu mới'}<input name="password" type="password" autocomplete="new-password" minlength="4" maxlength="128" placeholder="${creating?'Nhập ngày tháng sinh (VD: 2609)':'Để trống để giữ mật khẩu hiện tại'}"><small class="people-password-help">${creating?'Nhập ngày và tháng sinh của người dùng; không tự tạo mật khẩu chung.':'Không hiển thị mật khẩu hiện tại.'}</small><small class="records-error" data-error="password"></small></label></div><div class="people-grant-heading"><strong>Quyền được cấp</strong><span id="grant-count"></span></div><div class="people-grants">${catalogue.items.map(([k,label])=>`<label><input type="checkbox" value="${k}" ${selected.has(k)?'checked':''}><span>${label}</span></label>`).join('')}</div><p class="records-error" id="people-error" role="alert"></p></div><footer><button class="primary" type="submit">Lưu</button></footer></form></section>`,'people-editor-layer');
 const form=$('form',el),role=$('[name=role]',el),checks=[...el.querySelectorAll('[type=checkbox]')];
 function count(){checks.forEach(c=>{const allowed=!!role.value&&catalogue.allowed(role.value,c.value);c.disabled=!allowed||!permitted(c.value);if(!allowed)c.checked=false;});$('#grant-count',el).textContent=checks.filter(c=>c.checked).length+'/'+catalogue.items.length+' quyền';}
 checks.forEach(c=>c.onchange=count);role.onchange=count;count();
 form.onsubmit=e=>{
  e.preventDefault();const email=form.elements.email.value.trim(),name=form.elements.name.value.trim(),password=form.elements.password.value;let invalid=false;
  for(const [key,message] of [['name',name?'':'Không bỏ trống thông tin'],['email',!email?'Không bỏ trống thông tin':/^\S+@\S+\.\S+$/.test(email)?'':'Email không hợp lệ'],['role',role.value?'':'Vui lòng chọn vai trò'],['password',creating&&!password?'Vui lòng nhập mật khẩu':password&&(password.length<4||password.length>128||/\s/.test(password))?'Mật khẩu cần từ 4 đến 128 ký tự, không chứa khoảng trắng':'']]){$(`[data-error=${key}]`,el).textContent=message;const field=$(`[name=${key}]`,el);field.classList.toggle('invalid',!!message);field.setAttribute('aria-invalid',String(!!message));invalid||=!!message;}
  if(invalid)return;
  const permissions=checks.filter(c=>c.checked).map(c=>c.value);
  // Keep effective dependencies/read grants not represented by their own checkbox.
  if(u&&role.value!=='SinhVien')for(const key of u.permissions)if(!catalogue.items.some(i=>i[0]===key)&&catalogue.allowed(role.value,key))permissions.push(key);
  confirm('Xác nhận lưu phân quyền?',async()=>{try{await api(creating?'users':'users/'+id,{method:creating?'POST':'PATCH',body:{name,email,role:role.value,permissions:[...new Set(permissions)],...(password?{password}:{})}});await refreshMe();close();await users();notice('Cập nhật thành công!');}catch(error){$('#people-error',el).textContent=error.message;throw error;}},()=>{close();notice('Đã hủy thao tác!');});
 };
}

function remove(id){if(!manageable())return;confirm('Xác nhận xóa người dùng?',async()=>{await api('users/'+id,{method:'DELETE'});await users();notice('Xóa thành công!');});}
return {alumni,users,edit,remove,filter};
}};
