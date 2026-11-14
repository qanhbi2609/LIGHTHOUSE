'use strict';
window.LighthouseRecords={create({api,esc,prettyDate,tag,permitted,put,setTitle,getPage,uploadImage,deleteImage,onBack}){
let registrations=[],students=[],active=null,section='personal',regQuery='',regStatus='',studentQuery='',photoFrom='',photoTo='';
const $=(s,root=document)=>root.querySelector(s);
const badge=value=>`<span class="tag records-badge ${/Đạt|Đang hỗ trợ|Hợp lệ/.test(value)?'good':value==='Chờ bổ sung'?'blue':/Chờ/.test(value)?'amber':'other'}">${esc(value||'—')}</span>`;
const btn=(text,action,id='',style='secondary')=>`<button type="button" class="${style} small" data-action="${action}" data-id="${esc(id)}">${text}</button>`;
const link=(text,source)=>{const d=typeof source==='string'?{url:source}:source;return d?.url?`<button type="button" class="records-link" data-preview="${esc(d.url)}" ${d.previewRegion?`data-preview-region="${esc(JSON.stringify(d.previewRegion))}"`:''}>${text}</button>`:d?.name?`<button type="button" class="records-link" data-missing-proof>${text}</button>`:'';};
function bindPreviews(root){root.querySelectorAll('[data-preview]').forEach(b=>b.onclick=()=>preview(b.dataset.preview,b.dataset.previewRegion?JSON.parse(b.dataset.previewRegion):null));root.querySelectorAll('[data-missing-proof]').forEach(b=>b.onclick=()=>notice('Chưa có tệp gốc cho giấy tờ này.'));}
function layer(html,className,cancel){
 const previous=document.activeElement,el=document.createElement('div');el.className='records-overlay '+className;el.innerHTML=html;document.body.append(el);
 const close=()=>{el.remove();if(previous?.isConnected)previous.focus();};
 el.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();cancel?cancel(close):close();}});
 el.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>cancel?cancel(close):close());
 el.querySelector('button,input,select,textarea')?.focus({preventScroll:true});return {el,close};
}
function notice(text){
 document.querySelectorAll('.records-notice-layer').forEach(e=>e.remove());
 const {el,close}=layer(`<div class="records-notice" role="alert">${esc(text)}</div>`,'records-notice-layer');
 el.onclick=close;setTimeout(close,2800);
}
function confirm(message,action,onCancel=()=>notice('Đã hủy thao tác!')){
 const {el,close}=layer(`<section class="records-confirm" role="dialog" aria-modal="true" aria-label="Xác nhận"><p>${esc(message)}</p><div><button type="button" class="confirm-ok">OK</button><button type="button" data-close>Hủy</button></div><p class="records-error" role="alert"></p></section>`,'records-confirm-layer',done=>{done();onCancel();});
 $('.confirm-ok',el).onclick=async()=>{const b=$('.confirm-ok',el);b.disabled=true;try{await action();close();}catch(e){$('.records-error',el).textContent=e.message;}finally{b.disabled=false;}};
}
function preview(url,region){
 if(!/^\/uploads\/[a-zA-Z0-9._-]+$/.test(url)){notice('Không tìm thấy minh chứng.');return;}
 const pdf=/\.pdf$/i.test(url);
 let content=pdf?`<iframe src="${esc(url)}" title="Nội dung minh chứng PDF"></iframe>`:`<img src="${esc(url)}" alt="Minh chứng">`;
 if(/^\/uploads\/figma-(family|grades|invoice)\.png$/.test(url)&&Array.isArray(region)&&region.length===4&&region.every(Number.isFinite)){
  const [x,y,w,h]=region;if(x>=0&&y>=0&&w>0&&h>0&&x+w<=1920&&y+h<=1080){
   const scale=Math.min(1,innerWidth*.9/w,innerHeight*.7/h);
   content=`<div class="records-preview-crop" style="width:${w*scale}px;height:${h*scale}px"><img src="${esc(url)}" alt="Minh chứng từ ảnh mẫu" style="width:${1920*scale}px;height:${1080*scale}px;left:${-x*scale}px;top:${-y*scale}px"></div>`;
  }
 }
 layer(`<section class="records-preview" role="dialog" aria-modal="true" aria-label="Xem minh chứng">${content}<button type="button" data-close aria-label="Đóng minh chứng">×</button></section>`,'records-preview-layer');
}
function gridTable(columns,widths,rows,classes=''){
 const cols=`<colgroup>${widths.map(w=>`<col style="width:${w}%">`).join('')}</colgroup>`;
 return `<div class="records-grid-table ${classes}"><table class="records-columns">${cols}<thead><tr>${columns.map(c=>`<th scope="col">${c}</th>`).join('')}</tr></thead></table><div class="records-data-scroll" tabindex="0" aria-label="Dữ liệu ${classes==='registration-data'?'hồ sơ cần xử lý':'hồ sơ sinh viên'}"><table aria-label="Danh sách dữ liệu">${cols}<tbody>${rows}</tbody></table><div class="records-empty" hidden>Chưa có dữ liệu.</div></div></div>`;
}
function searchBox(placeholder,value,id){return `<div class="search"><span aria-hidden="true">⌕</span><input id="${id}" aria-label="${placeholder}" placeholder="${placeholder}" value="${esc(value)}"></div>`;}
function alignColumns(root){const scroll=$('.records-data-scroll',root);root.style.setProperty('--records-scrollbar',`${scroll.offsetWidth-scroll.clientWidth}px`);}
async function registrationsView(){
 setTitle('Tiếp nhận hồ sơ');registrations=(await api('registrations')).items;
 const pending=registrations.filter(r=>!['Đã tiếp nhận','Từ chối'].includes(r.status));
 put(`<div class="records-workspace records-registration-list"><div class="records-stats">${[['Chờ kiểm tra','amber'],['Chờ bổ sung','blue'],['Đạt yêu cầu','green']].map(([s,c])=>`<div class="records-stat ${c}"><strong>${pending.filter(r=>r.status===s).length}</strong><span>${s}</span></div>`).join('')}</div><section class="panel records-list-panel"><div class="panel-top"><h2>Hồ sơ cần xử lý</h2><div class="toolrow">${searchBox('Nhập từ khóa để tìm kiếm',regQuery,'registration-search')}<select id="registration-status" class="figma-select" aria-label="Trạng thái"><option value="">Trạng thái</option>${['Chờ kiểm tra','Đạt yêu cầu','Chờ bổ sung'].map(s=>`<option ${s===regStatus?'selected':''}>${s}</option>`).join('')}</select></div></div>${gridTable(['MÃ HỒ SƠ','HỌ TÊN','NGÀY GỬI','TRẠNG THÁI',''],[15.7,25.1,17.4,17.5,24.3],'','registration-data')}</section></div>`);
 const root=$('.records-workspace');
 const update=()=>{
 const rows=pending.filter(r=>(!regStatus||r.status===regStatus)&&(!regQuery||[r.id,r.name].some(v=>String(v).toLocaleLowerCase('vi').includes(regQuery.toLocaleLowerCase('vi')))));
 $('tbody',root).innerHTML=rows.map(r=>`<tr><td><strong>${esc(r.id)}</strong></td><td>${esc(r.name)}</td><td>${prettyDate(r.created)}</td><td>${badge(r.status)}</td><td><div class="actions">${btn('Kiểm tra','review',r.id)}${btn('Tiếp nhận','accept',r.id,'primary')}</div></td></tr>`).join('');$('.records-empty',root).hidden=rows.length>0;
 root.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>b.dataset.action==='review'?review(b.dataset.id):accept(b.dataset.id));alignColumns(root);
 };
 $('#registration-search').oninput=e=>{regQuery=e.target.value;update();};$('#registration-status').onchange=e=>{regStatus=e.target.value;update();};update();
}
async function accept(id){
 const r=registrations.find(r=>r.id===id);if(!r)return;
 if(r.status!=='Đạt yêu cầu'){notice('Hồ sơ chưa đủ điều kiện tiếp nhận!');return;}
 confirm('Xác nhận tiếp nhận và tạo hồ sơ sinh viên chính thức?',async()=>{await api('registrations/'+id+'/accept',{method:'POST'});await registrationsView();notice('Đã tạo hồ sơ sinh viên thành công!');});
}
function readonly(label,value,extra=''){return `<div class="review-field ${extra}"><label>${label}</label><div class="review-value">${esc(value||'—')}</div></div>`;}
async function review(id){
 const r=registrations.find(r=>r.id===id);if(!r)return;
 const docs=(r.documents?.length?r.documents:r.files||[]).map((f,i)=>typeof f==='string'?{url:f,name:'Giấy tờ minh chứng '+(i+1),group:(r.schoolFiles||[]).includes(f)?'school':'family'}:f);
 const family=docs.filter(d=>d.group!=='school'),school=docs.filter(d=>d.group==='school');
 const {el,close}=layer(`<section class="records-review" role="dialog" aria-modal="true" aria-label="Kiểm tra hồ sơ ${esc(r.id)}"><h2>${esc(r.id)}</h2><form id="review-form"><div class="review-scroll"><div class="review-information"><h3>Thông tin cá nhân</h3><div class="review-personal-grid">${[['Họ Tên:',r.name],['Ngày sinh:',prettyDate(r.dob)],['Quê quán:',r.hometown],['Địa chỉ thường trú:',r.address],['Số điện thoại:',r.phone],['Email:',r.email],['Số căn cước công dân:',r.cccd]].map(([k,v])=>readonly(k,v)).join('')}</div><h3>Hoàn cảnh gia đình</h3>${readonly('Hoàn cảnh:',r.family)}<h3>Tình hình học tập</h3><div class="review-education-grid">${readonly('Trường:',r.school)}${readonly('Ngành:',r.major)}${readonly('Mô tả ngành học:',r.description,'review-description')}</div><div class="review-proof-grid"><div><strong>Minh chứng:</strong>${family.map(d=>link(esc(d.name),d)).join('')}</div><div><strong>Minh chứng bổ sung:</strong>${school.map(d=>link(esc(d.name),d)).join('')}</div></div></div><aside class="review-decision"><label for="review-status">Kết quả xử lý hồ sơ</label><select id="review-status" name="status">${['Chờ kiểm tra','Đạt yêu cầu','Chờ bổ sung','Từ chối'].map(s=>`<option ${r.status===s?'selected':''}>${s}</option>`).join('')}</select><div class="review-note"><label for="review-note">Thông tin cần bổ sung</label><textarea id="review-note" name="note" placeholder="Nhập những thông tin cần bổ sung (nếu có)">${esc(r.note||'')}</textarea></div><p class="records-error" role="alert"></p></aside></div><footer class="review-actions"><button type="submit" class="primary">Lưu</button><button type="button" class="review-cancel" data-close>Hủy</button></footer></form></section>`,'records-review-layer',done=>{done();notice('Đã hủy thao tác!');});
 bindPreviews(el);let previous=r.status;
 const save=async()=>{const status=$('#review-status',el).value,note=$('#review-note',el).value;if(status==='Chờ bổ sung'&&!note.trim()){$('.records-error',el).textContent='Vui lòng nhập thông tin cần bổ sung.';return false;}await api('registrations/'+id,{method:'PATCH',body:{status,note}});close();await registrationsView();notice(status==='Từ chối'?'Đã xóa khỏi danh sách!':status==='Chờ bổ sung'?'Gửi yêu cầu thành công!':'Đã lưu thành công!');return true;};
 const refuse=()=>confirm('Xác nhận từ chối và xóa hồ sơ khỏi danh sách tiếp nhận?',save,()=>{$('#review-status',el).value=previous;$('.review-note',el).hidden=false;notice('Đã hủy thao tác!');});
 $('#review-status',el).onchange=e=>{if(e.target.value==='Từ chối'){$('.review-note',el).hidden=true;refuse();}else{previous=e.target.value;$('.review-note',el).hidden=false;}};
 $('#review-form',el).onsubmit=async e=>{e.preventDefault();if($('#review-status',el).value==='Từ chối'){refuse();return;}const b=$('[type=submit]',el);b.disabled=true;try{await save();}catch(error){$('.records-error',el).textContent=error.message;}finally{b.disabled=false;}};
}
async function studentsView(){
 setTitle('Quản lý hồ sơ sinh viên');students=(await api('students')).items;
 put(`<div class="records-workspace records-student-list"><section class="panel records-list-panel"><div class="panel-top"><h2>Danh sách hồ sơ</h2>${searchBox('Nhập từ khóa để tìm kiếm',studentQuery,'student-search')}</div>${gridTable(['MÃ QUẢN LÝ','HỌ TÊN','PHÒNG','TRƯỜNG','NGÀNH',''],[11.3,18.8,11.3,19.7,18.8,20.1],'','student-data')}</section></div>`);
 const root=$('.records-workspace');
 const update=()=>{const q=studentQuery.toLocaleLowerCase('vi'),rows=students.filter(s=>!q||[s.id,s.name,s.room,s.school,s.major].some(v=>String(v||'').toLocaleLowerCase('vi').includes(q)));
 $('tbody',root).innerHTML=rows.map(s=>`<tr><td><strong>${esc(s.id)}</strong></td><td>${esc(s.name)}</td><td>${esc(s.room||'Chưa có')}</td><td>${esc(s.school)}</td><td>${esc(s.major)}</td><td><div class="actions">${btn('Xem hồ sơ','detail',s.id)}${permitted('students.edit')?btn('Chỉnh sửa','edit',s.id,'primary'):''}</div></td></tr>`).join('');$('.records-empty',root).hidden=rows.length>0;root.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>b.dataset.action==='detail'?studentDetail(b.dataset.id):editStudent(b.dataset.id));};
 $('#student-search').oninput=e=>{studentQuery=e.target.value;update();alignColumns(root);};update();alignColumns(root);
}
const tabs=[['personal','Thông tin cá nhân'],['grades','Học tập'],['goals','Mục tiêu 6 tháng'],['supports','Hỗ trợ'],['images','Hình ảnh']];
function heading(s,editing=false){return `<div class="student-profile-heading"><div><h2>${esc(s.name)} · ${esc(s.id)}</h2><small>${esc(String(s.school||'').replace(/^Trường /,'').replaceAll('Đại học','ĐH'))} · ${esc(s.major)} · Niên khóa ${esc(s.cohort||'')}</small></div>${getPage()==='alumni'?`<span class="alumni-state ${s.endReason==='Rời trước thời hạn'?'early':''}">${esc(s.endReason==='Rời trước thời hạn'?s.endReason:s.status)}</span>`:badge(s.status)}<span>${getPage()==='alumni'?'Ngày kết thúc: '+prettyDate(s.endDate):'Phòng hiện tại: '+esc(s.room||'Chưa có')}</span></div><div class="student-tabbar">${tabs.map(([key,label])=>`<button type="button" class="tab ${section===key?'selected':''}" data-tab="${key}">${label}</button>`).join('')}</div>`;}
function profileTable(head,rows,widths){return `<div class="profile-table-scroll"><table>${widths?`<colgroup>${widths.map(w=>`<col style="width:${w}%">`).join('')}</colgroup>`:''}<thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')||`<tr><td colspan="${head.length}" class="empty">Chưa có dữ liệu.</td></tr>`}</tbody></table></div>`;}
async function studentDetail(id){if(active?.id!==id){photoFrom='';photoTo='';}active=(await api('students/'+id)).item;section='personal';showSection();}
function showSection(){
 const s=active;if(!s)return;setTitle(getPage()==='alumni'?'Quản lý sinh viên kết thúc hỗ trợ':'Quản lý hồ sơ sinh viên · Xem hồ sơ');
 const personal=[['Họ tên',s.name],['CCCD',s.cccd],['Ngày sinh',prettyDate(s.dob)],['Quê quán',s.hometown],['Số điện thoại',s.phone],['Địa chỉ thường trú',s.address],['Email',s.email],['Hoàn cảnh gia đình',s.family],['Trường',s.school],['Ngành',s.major]];
 let content='';
 if(section==='personal')content=`<div class="student-info-grid">${personal.map(([k,v])=>`<div><strong>${k}</strong><span>${esc(v||'—')}</span></div>`).join('')}</div>${profileTable(['GIẤY TỜ LIÊN QUAN','NGÀY TẢI LÊN',''],(s.files||[]).map(f=>`<tr><td>${esc(f.name||'Giấy tờ liên quan')}</td><td>${prettyDate(f.created)}</td><td>${link('Xem minh chứng',f)}</td></tr>`),[33,33,34])}`;
 if(section==='grades')content=`<h3>Quá trình học tập</h3>${profileTable(['NĂM HỌC','HỌC KỲ','GPA','XẾP LOẠI','Chứng chỉ','SỐ MÔN NỢ',''],(s.grades||[]).map(g=>`<tr><td>${esc(g.year)}</td><td>${esc(g.term)}</td><td>${esc(g.gpa)}</td><td>${esc(g.rank)}</td><td>${esc(g.certificates||'—')}</td><td>${esc(g.debts)}</td><td>${link('Xem bảng điểm',{url:g.evidence,previewRegion:g.previewRegion})}</td></tr>`))}`;
 if(section==='goals')content=`<h3>Quá trình đặt mục tiêu</h3>${profileTable(['NGÀY LẬP','MỤC TIÊU','NỘI DUNG CHI TIẾT','ĐÁNH GIÁ',''],(s.goals||[]).map(g=>`<tr><td>${prettyDate(g.sent)}</td><td>${esc(g.name)}</td><td><span class="profile-truncate">${esc(g.detail)}</span></td><td>${badge(g.status)}</td><td><button class="records-link" data-goal="${esc(g.id)}">Xem chi tiết</button></td></tr>`),[13,18,29,20,20])}`;
 if(section==='supports')content=`<h3>Các khoản hỗ trợ</h3>${profileTable(['TÊN HỖ TRỢ','LOẠI','THỜI GIAN','SỐ TIỀN',''],(s.supports||[]).map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.type)}</td><td>${x.endDate?esc(x.date.slice(8,10)+'/'+x.date.slice(5,7)+'–'+prettyDate(x.endDate)):prettyDate(x.date)}</td><td>${Number(x.amount||0).toLocaleString('vi-VN')} đ</td><td>${link('Xem hóa đơn',{url:x.evidence,previewRegion:x.previewRegion})}</td></tr>`))}`;
 if(section==='images'){
  const invalid=photoFrom&&photoTo&&photoFrom>photoTo,images=invalid?[]:(s.images||[]).filter(i=>(!photoFrom||i.created.slice(0,7)>=photoFrom)&&(!photoTo||i.created.slice(0,7)<=photoTo));
  const groups=new Map();for(const i of [...images].sort((a,b)=>b.created.localeCompare(a.created))){const month=i.created.slice(0,7);if(!groups.has(month))groups.set(month,[]);groups.get(month).push(i);}
  content=`<div class="profile-image-tools"><input type="month" id="photo-from" aria-label="Từ tháng" value="${esc(photoFrom)}">${getPage()==='alumni'?'<span aria-hidden="true">-</span>':''}<input type="month" id="photo-to" aria-label="Đến tháng" value="${esc(photoTo)}">${getPage()!=='alumni'&&permitted('students.edit')?'<label class="add-photo-button">＋ Thêm ảnh mới<input id="profile-upload" type="file" accept="image/jpeg,image/png" hidden></label>':''}</div><p class="records-error" role="alert">${invalid?'Khoảng thời gian không hợp lệ!':''}</p><h3>Danh mục hình ảnh</h3><div class="${getPage()==='alumni'?'alumni-photo-timeline':''}">${[...groups].map(([month,rows])=>`<h4>${Number(month.slice(5))}/${month.slice(0,4)}</h4><div class="student-photo-gallery">${rows.map(i=>`<div><button class="profile-photo" data-preview="${esc(i.url)}"><img src="${esc(i.url)}" alt="Hình ảnh sinh viên"></button><small>${prettyDate(i.created)}</small>${getPage()!=='alumni'&&permitted('students.edit')?btn('Xóa','delete-image',i.id):''}</div>`).join('')}</div>`).join('')||'<p>Chưa có dữ liệu.</p>'}</div>`;
 }

 put(`<div class="records-workspace records-profile-view ${getPage()==='alumni'?'alumni-profile':''}" data-profile-section="${section}"><section class="panel student-profile ${section==='goals'||section==='grades'?'profile-tall':''}">${heading(s)}<div class="student-tab-body records-profile-scroll">${content}</div>${section==='personal'?`<div class="student-profile-actions">${btn('Quay lại','back')}${getPage()!=='alumni'&&permitted('students.edit')?btn('Sửa','edit',s.id,'primary'):''}</div>`:''}</section></div>`);
 const root=$('.records-workspace');root.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{section=b.dataset.tab;showSection();});bindPreviews(root);
 root.querySelectorAll('[data-goal]').forEach(b=>b.onclick=()=>goal(s.goals.find(g=>g.id===b.dataset.goal)));
 root.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>b.dataset.action==='back'?onBack():b.dataset.action==='edit'?editStudent(s.id):deleteImage(b.dataset.id,s.id));
 $('#photo-from',root)?.addEventListener('change',e=>{photoFrom=e.target.value;showSection();});$('#photo-to',root)?.addEventListener('change',e=>{photoTo=e.target.value;showSection();});
 $('#profile-upload',root)?.addEventListener('change',e=>uploadImage(s.id,e.target));
}
function goal(g){if(!g)return;layer(`<section class="records-goal" role="dialog" aria-modal="true" aria-label="Chi tiết mục tiêu"><header><h2>Chi tiết mục tiêu</h2><button type="button" data-close aria-label="Đóng">×</button></header><div class="goal-summary"><strong>Ngày gửi</strong><span>${prettyDate(g.sent)}</span><strong>Mục tiêu</strong><div class="review-value">${esc(g.name)}</div></div><strong>Chi tiết nội dung</strong><div class="review-value goal-description">${esc(g.detail)}</div><strong>Đánh giá</strong><div>${badge(g.status)}</div></section>`,'records-goal-layer');}
async function editStudent(id){
 if(!permitted('students.edit'))return;const s=(await api('students/'+id)).item;active=s;section='personal';setTitle('Quản lý hồ sơ sinh viên · Sửa hồ sơ');
 const fields=[['Mã quản lý','id',s.id,'readonly'],['Họ tên *','name',s.name,'text'],['CCCD','cccd',s.cccd,'text'],['Ngày sinh','dob',s.dob?prettyDate(s.dob):'','text'],['Quê quán','hometown',s.hometown,'text'],['Địa chỉ thường trú','address',s.address,'text'],['Số điện thoại *','phone',s.phone,'tel'],['Email *','email',s.email,'email'],['Hoàn cảnh gia đình','family',s.family,'text'],['Trường','school',s.school,'text'],['Ngành / Niên khóa','major',s.major+(s.cohort?' · '+s.cohort:''),'text'],['Phòng hiện tại','room',(s.room||'Chưa có')+' · Chỉ xem','readonly']];
 put(`<div class="records-workspace records-profile-view"><section class="panel student-edit">${heading(s,true)}<div class="records-profile-scroll"><h3>Sửa thông tin cá nhân</h3><form id="student-edit-form" novalidate><div class="student-edit-grid">${fields.map(([label,name,value,type])=>`<label class="${type==='readonly'?'profile-readonly':''}" for="edit-${name}">${label}<input id="edit-${name}" name="${name}" type="${type==='readonly'?'text':type}" value="${esc(value||'')}" ${type==='readonly'?'readonly':''}>${name==='phone'||name==='email'?`<small>Hiện tại: ${esc(value||'—')}</small>`:''}<span class="records-error" data-error="${name}"></span></label>`).join('')}</div><div class="student-profile-actions"><button class="secondary small" type="button" id="edit-cancel">Hủy</button><button class="primary small" type="submit">Lưu</button></div><p class="records-error" id="edit-error" role="alert"></p></form></div></section></div>`);
 const root=$('.records-workspace');root.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{section=b.dataset.tab;showSection();});
 $('#edit-cancel').onclick=()=>{showSection();notice('Đã hủy thao tác!');};
 $('#student-edit-form').onsubmit=e=>{
 e.preventDefault();const form=e.target,data=Object.fromEntries(new FormData(form));delete data.id;delete data.room;const dateParts=data.dob.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(dateParts)data.dob=`${dateParts[3]}-${dateParts[2]}-${dateParts[1]}`;
 root.querySelectorAll('[data-error]').forEach(e=>e.textContent='');let invalid=false;
 for(const key of ['name','phone','email'])if(!data[key].trim()){root.querySelector(`[data-error=${key}]`).textContent='Dữ liệu không hợp lệ!';invalid=true;}
 if(data.phone&&!/^0\d{9}$/.test(data.phone)){root.querySelector('[data-error=phone]').textContent='Dữ liệu không hợp lệ!';invalid=true;}
 if(data.email&&!/^\S+@\S+\.\S+$/.test(data.email)){root.querySelector('[data-error=email]').textContent='Dữ liệu không hợp lệ!';invalid=true;}
 if(data.cccd&&!/^\d{12}$/.test(data.cccd)){root.querySelector('[data-error=cccd]').textContent='Dữ liệu không hợp lệ!';invalid=true;}
 if(data.dob&&(!/^\d{4}-\d{2}-\d{2}$/.test(data.dob)||!Number.isFinite(Date.parse(data.dob))||new Date(data.dob).toISOString().slice(0,10)!==data.dob||data.dob>new Date().toISOString().slice(0,10))){root.querySelector('[data-error=dob]').textContent='Dữ liệu không hợp lệ!';invalid=true;}
 if(invalid)return;
 const parts=data.major.split(' · ');if(parts.length>1){data.cohort=parts.pop().trim();data.major=parts.join(' · ').trim();}
 confirm('Xác nhận lưu thông tin?',async()=>{const d=await api('students/'+id,{method:'PATCH',body:data});active={...s,...d.item};notice('Lưu hồ sơ thành công!');});
 };
}
return {ui:{layer,notice,confirm,preview,gridTable,alignColumns},registrations:registrationsView,students:studentsView,review,accept,studentDetail,studentTab:key=>{section=key;showSection();},editStudent,filterRegistrations:value=>{regStatus=value==='Trạng thái'?'':value;return registrationsView();}};
}};
