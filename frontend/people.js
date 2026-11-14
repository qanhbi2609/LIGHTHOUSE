'use strict';
window.LighthousePeople={create({api,esc,prettyDate,permitted,put,setTitle,ui,studentDetail,refreshMe}){
const {layer,notice,confirm,gridTable,alignColumns}=ui,$=(s,r=document)=>r.querySelector(s),catalogue=window.LighthousePermissions;
const roles={QuanLy:'Người quản lý trực tiếp',CanBo:'Cán bộ cùng cấp',GiamDoc:'Giám đốc',SinhVien:'Sinh viên'};
let alumniQuery='',userQuery='',userRows=[];
const manageable=()=>permitted('users.manage');
const button=(label,action,id='',cls='secondary')=>`<button type="button" class="${cls} small" data-people-action="${action}" data-id="${esc(id)}">${label}</button>`;
async function alumni(){
 setTitle('Quản lý sinh viên kết thúc hỗ trợ');const {items}=await api('alumni?q='+encodeURIComponent(alumniQuery)),total=(await api('alumni')).items.length;
 const order=['LH015','LH013','LH021','LH023','LH018','LH031','LH034','LH054'];items.sort((a,b)=>(order.includes(a.id)?order.indexOf(a.id):99)-(order.includes(b.id)?order.indexOf(b.id):99));
 put(`<div class="records-workspace alumni-workspace"><section class="panel records-list-panel"><form id="alumni-search"><div class="search"><span aria-hidden="true">⌕</span><input aria-label="Tìm sinh viên kết thúc hỗ trợ" placeholder="Nhập họ tên, mã sinh viên hoặc email" value="${esc(alumniQuery)}"></div><button class="primary" type="submit">⌕ Tìm</button></form><div class="alumni-list-heading"><h2>Danh sách sinh viên</h2><span>${total} hồ sơ đã kết thúc chương trình</span></div>${gridTable(['Mã sinh viên','Sinh viên','Trường','Ngành','Ngày kết thúc','Trạng thái',''],[9.2,12.5,16.2,14.9,11.2,21,15],items.map(s=>`<tr><td>${esc(s.id)}</td><td><strong>${esc(s.name)}</strong></td><td>${esc(s.school)}</td><td>${esc(s.major)}</td><td>${prettyDate(s.endDate)}</td><td><span class="alumni-state ${s.endReason==='Rời trước thời hạn'?'early':''}">${esc(s.endReason==='Rời trước thời hạn'?s.endReason:s.status)}</span></td><td>${button('Xem','profile',s.id)}</td></tr>`).join(''),'alumni-data')}</section></div>`);
 const root=$('.alumni-workspace');$('.records-empty',root).hidden=items.length>0;alignColumns(root);
 $('#alumni-search').onsubmit=async e=>{e.preventDefault();alumniQuery=$('#alumni-search input').value.trim();try{await alumni();if(!$('.alumni-data tbody tr'))notice('Không tìm thấy dữ liệu!');}catch(error){notice(error.message);}};
 root.querySelectorAll('[data-people-action]').forEach(b=>b.onclick=()=>studentDetail(b.dataset.id).catch(e=>notice(e.message)));
}
async function users(){
 setTitle('Quản lý người dùng và phân quyền');userRows=(await api('users')).items.filter(u=>u.active);
 put(`<div class="records-workspace users-workspace"><section class="panel records-list-panel"><div class="panel-top"><h2>Danh sách người dùng</h2><div class="toolrow"><div class="search"><span aria-hidden="true">⌕</span><input id="people-search" aria-label="Tìm người dùng" placeholder="Nhập thông tin để tìm kiếm" value="${esc(userQuery)}"></div>${manageable()?button('＋ Thêm người dùng','new','','primary'):''}</div></div>${gridTable(['MÃ NGƯỜI DÙNG','HỌ TÊN','EMAIL','VAI TRÒ','QUYỀN',''],[12,19,19,17,15,18],'','users-data')}</section></div>`);
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
 const selected=new Set(catalogue.selected(u?.permissions||catalogue.items.map(i=>i[0])));
 const suggested='ND'+String(Math.max(0,...rows.map(u=>Number(u.id.replace(/\D/g,''))||0))+1).padStart(3,'0');
 const {el,close}=layer(`<section class="people-editor" role="dialog" aria-modal="true" aria-label="${creating?'Thêm người dùng':'Thông tin phân quyền'}"><header><h2>${creating?'Thêm người dùng':'Thông tin phân quyền'}</h2><button type="button" data-close aria-label="Đóng">×</button></header><form id="people-form" novalidate><div class="people-editor-scroll"><div class="people-fields"><label>Mã người dùng<input name="id" value="${esc(u?.id||suggested)}" readonly></label><label>Email${creating?' *':''}<input name="email" type="email" value="${esc(u?.email||'')}" ${creating?'':'readonly'}><small class="records-error" data-error="email"></small></label><label>Họ tên${creating?' *':''}<input name="name" value="${esc(u?.name||'')}" ${creating?'':'readonly'}><small class="records-error" data-error="name"></small></label><label>Vai trò<select name="role">${Object.entries(roles).map(([k,v])=>`<option value="${k}" ${(u?.role||'QuanLy')===k?'selected':''}>${v}</option>`).join('')}</select></label></div><div class="people-grant-heading"><strong>Quyền được cấp</strong><span id="grant-count"></span></div><div class="people-grants">${catalogue.items.map(([k,label])=>`<label><input type="checkbox" value="${k}" ${selected.has(k)?'checked':''}><span>${label}</span></label>`).join('')}</div><p class="records-error" id="people-error" role="alert"></p></div><footer><button class="primary" type="submit">Lưu</button></footer></form></section>`,'people-editor-layer',done=>{done();notice('Đã hủy thao tác!');});
 const form=$('form',el),role=$('[name=role]',el),checks=[...el.querySelectorAll('[type=checkbox]')];
 function count(){const student=role.value==='SinhVien';checks.forEach(c=>{c.disabled=student||(c.value==='users.manage'&&!['QuanLy','GiamDoc'].includes(role.value));if(c.disabled)c.checked=false;});$('#grant-count',el).textContent=checks.filter(c=>c.checked).length+'/14 quyền';}
 checks.forEach(c=>c.onchange=count);role.onchange=count;count();
 form.onsubmit=e=>{
  e.preventDefault();const email=$('[name=email]',el).value.trim(),name=$('[name=name]',el).value.trim();let invalid=false;
  for(const [key,bad] of [['name',!name],['email',!/^\S+@\S+\.\S+$/.test(email)]]){$(`[data-error=${key}]`,el).textContent=bad?'Thông tin không hợp lệ!':'';$(`[name=${key}]`,el).classList.toggle('invalid',bad);invalid||=bad;}
  if(invalid){if(!name||!email)notice('Họ tên và Email không được để trống!');return;}
  let permissions=checks.filter(c=>c.checked).map(c=>c.value);
  // Preserve grants outside the 14-checkbox screen unless switching to a student.
  if(u&&role.value!=='SinhVien')permissions=[...new Set([...permissions,...(u.permissions.includes('*')?['students.edit','history.view']:[]),...u.permissions.filter(k=>!['*','rooms.edit',...catalogue.items.map(i=>i[0])].includes(k))])];
  confirm('Xác nhận lưu phân quyền?',async()=>{try{await api(creating?'users':'users/'+id,{method:creating?'POST':'PATCH',body:{name,email,role:role.value,permissions}});await refreshMe();close();await users();notice('Cập nhật thành công!');}catch(error){$('#people-error',el).textContent=error.message;throw error;}},()=>{close();notice('Đã hủy thao tác!');});
 };
}
function remove(id){if(!manageable())return;confirm('Xác nhận xóa người dùng?',async()=>{await api('users/'+id,{method:'DELETE'});await users();notice('Xóa thành công!');});}
return {alumni,users,edit,remove,filter};
}};
