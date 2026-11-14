'use strict';
/** LIGHTHOUSE UC01–11 editable demo front end. */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const esc=escapeHtml;
const today=()=>new Date().toISOString().slice(0,10);
const prettyDate=v=>v?String(v).slice(0,10).split('-').reverse().join('/'):'—';
const storage=(()=>{try{return {getItem:k=>window.sessionStorage.getItem(k)||window.localStorage.getItem(k),setItem:(k,v)=>window.sessionStorage.setItem(k,v),removeItem:k=>{window.sessionStorage.removeItem(k);window.localStorage.removeItem(k)}}}catch{return {getItem:()=>null,setItem:()=>{},removeItem:()=>{}}}})();
let token=storage.getItem('lh_token')||'',me=JSON.parse(storage.getItem('lh_user')||'null'),page='home',query='',modal=null,toastTimer=null;
const menu=[['registrations','Tiếp nhận hồ sơ'],['students','Hồ sơ sinh viên'],['rooms','Phòng ở'],['alumni','Kết thúc hỗ trợ'],['goals','Mục tiêu & Kết quả học tập'],['users','Người dùng & Phân quyền'],['reports','Báo cáo'],['history','Lịch sử hoạt động']];
const permissions=[['registrations.view','Xem hồ sơ đăng ký'],['registrations.review','Kiểm tra / tiếp nhận'],['students.view','Xem hồ sơ sinh viên'],['students.edit','Chỉnh sửa hồ sơ & hình ảnh'],['rooms.view','Xem phòng ở'],['rooms.edit','Tạo / sửa / xóa phòng'],['goals.view','Xem mục tiêu'],['goals.review','Đánh giá mục tiêu'],['grades.view','Xem kết quả học tập'],['grades.review','Xét duyệt kết quả học tập'],['alumni.view','Xem Alumni'],['users.view','Xem người dùng'],['reports.view','Xem báo cáo'],['reports.edit','Lập / chỉnh sửa báo cáo'],['history.view','Xem lịch sử hoạt động']];
const permitted=(k)=>me&&window.LighthousePermissions.hasFor(me,k);
const isStudent=()=>me?.role==='SinhVien';
async function api(endpoint,options={}){const headers={'Accept':'application/json',...options.headers};if(options.body&&typeof options.body==='object'){headers['Content-Type']='application/json';options.body=JSON.stringify(options.body)}if(token)headers.Authorization='Bearer '+token;let res;try{res=await fetch('/api/'+endpoint,{...options,headers});}catch{throw new Error('Không kết nối được Backend')}
let d;try{d=await res.json()}catch{throw new Error('Backend không trả dữ liệu JSON')}if(!res.ok){if(res.status===401&&endpoint!=='auth/login'){logout(false)}throw new Error(d.error||'Không thực hiện được thao tác')}return d;}
function toast(text,bad=false){window.LighthouseFeedback.show(text,bad?'error':'info')}
function root(html){$('#app').innerHTML=html}
function button(text,call,cls='secondary',small=true){return `<button class="${cls}${small?' small':''}" onclick="${call}">${esc(text)}</button>`}
function input(label,name,value='',type='text',extra=''){return `<label>${esc(label)}<input type="${type}" name="${esc(name)}" value="${esc(value)}" ${extra}></label>`}
function ta(label,name,value=''){return `<label class="wide">${esc(label)}<textarea name="${esc(name)}">${esc(value)}</textarea></label>`}
function select(label,name,opts,value=''){return `<label>${esc(label)}<select name="${esc(name)}">${opts.map(x=>`<option value="${esc(x)}" ${x===value?'selected':''}>${esc(x)}</option>`).join('')}</select></label>`}
function panel(title,content,actions=''){return `<section class="panel"><div class="panel-top"><h2>${esc(title)}</h2><div class="toolrow">${actions}</div></div>${content}</section>`}
function table(cols,rows){return `<div class="table-scroll"><table><thead><tr>${cols.map(x=>`<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.join(''):`<tr><td colspan="${cols.length}" class="empty">Không tìm thấy dữ liệu!</td></tr>`}</tbody></table></div>`}
function tag(v){let color=/Đã|Hợp lệ|Đạt|thành công|Còn chỗ/.test(v)?'good':/Chờ|Tạm|Bản nháp/.test(v)?'warn':/Từ chối|Chưa|Xóa|Đầy|Yêu cầu/.test(v)?'bad':'';return `<span class="tag ${color}">${esc(v||'—')}</span>`}
function formValues(form){return Object.fromEntries(new FormData(form).entries())}
function encodeFile(f){return new Promise((resolve,reject)=>{if(!f||!f.size)return resolve(null);if(f.size>1_500_000)return reject(new Error('Tệp quá lớn: tối đa 1,5 MB'));if(!['application/pdf','image/png','image/jpeg'].includes(f.type))return reject(new Error('Định dạng không phù hợp!'));const rd=new FileReader();rd.onerror=()=>reject(new Error('Không đọc được tệp'));rd.onload=()=>resolve({name:f.name,mime:f.type,data:rd.result});rd.readAsDataURL(f)})}
async function encodeFiles(items){const arr=await Promise.all([...items].slice(0,6).map(encodeFile));return arr.filter(Boolean)}
function showModal(title,body,fn,options={}){if(modal)modal.remove();modal=document.createElement('div');modal.className='modal-backdrop';modal.innerHTML=`<div class="dialog ${options.wide?'wide':''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="dialog-head"><h2>${esc(title)}</h2><button class="x" type="button" aria-label="Đóng">×</button></div><div class="dialog-body"><form id="lh-dialog-form">${body}<div class="dialog-actions"><button type="button" class="secondary cancel">Hủy</button><button type="submit" class="primary">${esc(options.submit||'Lưu')}</button></div></form></div></div>`;document.body.append(modal);modal.querySelector('.x').onclick=closeModal;modal.querySelector('.cancel').onclick=closeModal;modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});modal.querySelector('form').onsubmit=async e=>{e.preventDefault();const here=modal;const b=here.querySelector('button[type=submit]');b.disabled=true;try{await fn(formValues(e.target));if(modal===here)closeModal()}catch(err){toast(err.message,true)}finally{b.disabled=false}}}
function closeModal(){if(modal){modal.remove();modal=null}}
function confirmAction(message,action){if(!window.confirm(message)){toast('Đã hủy thao tác!');return}Promise.resolve().then(action).catch(err=>toast(err.message,true))}
function signinView(mode='login'){
if(mode!=='register')return window.LighthouseAuth.mount({view:mode,api,onRegister:()=>signinView('register'),onLogin:async(d,remember)=>{
token=d.token;me=d.user;storage.removeItem('lh_token');storage.removeItem('lh_user');
const target=remember?window.localStorage:window.sessionStorage;target.setItem('lh_token',token);target.setItem('lh_user',JSON.stringify(me));
page=landingPage();toast('Đăng nhập thành công!');await render();
}});
return window.LighthouseRegistration.mount({api,encodeFiles,notify:records.ui.notice,onLogin:()=>signinView('login')});}
const SVG_ICON={
registrations:'<path d="M3 6h18v13H3zM3 7l9 7 9-7"/>',students:'<path d="M7 3h10l4 4v14H7zM17 3v5h4"/>',rooms:'<path d="m3 11 9-8 9 8v10H3V11zm7 10v-7h4v7"/>',alumni:'<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>',goals:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',users:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2H4z"/>',reports:'<path d="M5 3h10l4 4v14H5zM15 3v5h4M8 12h8M8 16h8"/>',grades:'<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M5 17h14"/>',history:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>'};
function iconSvg(k){return `<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" fill="none">${SVG_ICON[k]||SVG_ICON.reports}</svg>`}
function landingPage(){return isStudent()?'goals':menu.find(([key])=>permitted(({students:'students.view',registrations:'registrations.view',rooms:'rooms.view',alumni:'alumni.view',goals:'goals.view',users:'users.view',reports:'reports.view',history:'history.view'})[key]))?.[0]||'students';}
function pageHeading(){return ({registrations:'Tiếp nhận hồ sơ',students:'Quản lý hồ sơ sinh viên',rooms:'Quản lý phòng ở',goals:'Quản lý mục tiêu & kết quả học tập',grades:'Quản lý mục tiêu & kết quả học tập',alumni:'Quản lý sinh viên kết thúc hỗ trợ',users:'Quản lý người dùng và phân quyền',reports:'Quản lý báo cáo',history:'Lịch sử hoạt động'})[page]||'LIGHTHOUSE'}
function layout(){const visible=isStudent()?[['goals','Mục tiêu 6 tháng'],['grades','Kết quả học tập']]:menu.filter(([k])=>k==='students'&&permitted('students.view')||k==='registrations'&&permitted('registrations.view')||k==='rooms'&&permitted('rooms.view')||k==='alumni'&&permitted('alumni.view')||k==='goals'&&permitted('goals.view')||k==='users'&&permitted('users.view')||k==='reports'&&permitted('reports.view')||k==='history'&&permitted('history.view'));
const navActive=(key)=>key===page||(!isStudent()&&key==='goals'&&page==='grades');const fullName=me.name;const role={'QuanLy':'Người quản lý trực tiếp','CanBo':'Cán bộ cùng cấp','GiamDoc':'Giám đốc','SinhVien':'Sinh viên'}[me.role]||me.role;
return `<div class="dashboard"><aside class="sidebar"><div class="sidebar-brand">LIGHTHOUSE<small>Student Management</small></div><nav class="sidebar-group">${visible.map(([key,label])=>`<button class="navitem ${navActive(key)?'active':''}" aria-label="${esc(label)}" title="${esc(label)}" onclick="L.go('${key}')">${iconSvg(key)}<span>${esc(label)}</span></button>`).join('')}</nav><div class="sidebar-footer">Giving It Back To Kids<br>Address: No 254, Street 2 Thang 9, Hai Chau<br>Ward, Danang City, Vietnam<br>Phone: +84 2363 622 337<br>Fax: +84 2363 622 337</div></aside><button class="sidebar-backdrop" type="button" aria-label="Đóng menu" onclick="L.toggleMenu(false)"></button><div class="content-shell"><header class="topbar"><button class="sidebar-toggle" type="button" aria-label="Mở menu" aria-expanded="false" onclick="L.toggleMenu()">☰ <span>Menu</span></button><h1 id="screen-title">${esc(pageHeading())}</h1><div class="userbox"><span class="avatar"></span><span class="usertext"><b>Xin chào, ${esc(fullName)}</b><small>${esc(role)}</small><a href="#" onclick="event.preventDefault();L.logout()">Đăng xuất</a></span></div></header><main class="main-content"><div id="page-content"><div class="loading"></div></div></main></div></div>`}
function setTitle(value){const x=$('#screen-title');if(x)x.textContent=value;}

async function render(){if(!token||!me)return signinView();if(page==='home')page=landingPage();root(layout());try{if(page==='registrations')return await registrations();if(page==='students')return await students();if(page==='rooms')return await rooms();if(page==='goals')return await goals();if(page==='grades')return await grades();if(page==='alumni')return await alumni();if(page==='users')return await users();if(page==='reports')return await reports();if(page==='history')return await history();}catch(err){$('#page-content').innerHTML=`<div class="panel panel-body"><p class="danger">${esc(err.message)}</p>${button('Thử lại','L.render()')}</div>`}}
const put=html=>$('#page-content').innerHTML=html;
async function home(){let [students,rooms,registrations,goals,grades]=await Promise.all([api('students'),api('rooms'),api('registrations'),api('goals'),api('grades')]);let all=students.items,active=all.filter(s=>s.status!=='Đã kết thúc hỗ trợ').length;put(`<div class="metric-grid">${[['Sinh viên đang hỗ trợ',active],['Tổng số phòng',rooms.items.length],['Hồ sơ chờ kiểm tra',registrations.items.filter(x=>x.status==='Chờ kiểm tra').length],['Mục tiêu chờ đánh giá',goals.items.filter(x=>x.status==='Chờ đánh giá').length]].map(([a,b])=>`<div class="metric"><small>${esc(a)}</small><strong>${b}</strong><div class="muted tiny">Dữ liệu hệ thống</div></div>`).join('')}</div>${panel('Hướng dẫn kiểm thử',`<div class="panel-body"><p class="home-note">Đây là trang tổng quan của website LIGHTHOUSE. Bạn có thể kiểm tra từng Use Case bằng các mục trên Sidebar, thêm hoặc chỉnh sửa dữ liệu rồi tải lại trang để kiểm tra dữ liệu đã được lưu. Các thay đổi quan trọng được ghi vào <b>Lịch sử hoạt động</b>.</p><div class="quick-links">${button('UC03 · Tiếp nhận hồ sơ',"L.go('registrations')")}${button('UC04 · Hồ sơ sinh viên',"L.go('students')")}${button('UC05 · Phòng ở',"L.go('rooms')")}${button('UC09 · Báo cáo',"L.go('reports')")}</div><p class="foot-hint">Một số nghiệp vụ ngoài đời thật (gửi email OTP, lưu ảnh bền vững trên cloud) cần dịch vụ tích hợp riêng khi deploy production.</p></div>`)}`);}
const records=window.LighthouseRecords.create({api,esc,prettyDate,tag,permitted,put,setTitle,getPage:()=>page,uploadImage,deleteImage,encodeFile,onBack:render});
async function registrations(){return records.registrations()}
async function acceptRegistration(id){return records.accept(id)}
function filterRegistrations(value){return records.filterRegistrations(value)}
async function reviewRegistration(id){return records.review(id)}
async function students(){return records.students()}
async function studentDetail(id){return records.studentDetail(id)}
function studentTab(section){return records.studentTab(section)}
async function editStudent(id){return records.editStudent(id)}
async function uploadImage(id,element){const f=element.files[0];if(!f)return;if(!['image/png','image/jpeg'].includes(f.type)){records.ui.notice('Định dạng không phù hợp!');return}if(f.size===0||f.size>1_500_000){records.ui.notice('Dung lượng tệp không hợp lệ!');return}const reader=new FileReader();reader.onload=async()=>{try{const d=await api('images',{method:'POST',body:{studentId:id,file:{mime:f.type,data:reader.result}}});records.ui.notice(d.message);await studentDetail(id);studentTab('images')}catch(err){toast(err.message,true)}};reader.readAsDataURL(f)}
function deleteImage(id,studentId){records.ui.confirm('Xác nhận xóa ảnh?',async()=>{await api('images/'+id,{method:'DELETE'});await studentDetail(studentId);studentTab('images');records.ui.notice('Đã xóa ảnh!');});}
function addSupport(id){return records.addSupport(id)}
const roomViews=window.LighthouseRooms.create({api,esc,permitted,put,setTitle,ui:records.ui});
const assessmentViews=window.LighthouseAssessments.create({api,esc,prettyDate,permitted,isStudent,put,setTitle,ui:records.ui,goalNew,gradeNew});
async function rooms(){return roomViews.show(true)}
async function findRoom(){return roomViews.find()}
async function roomDetail(id){return roomViews.detail(id)}
async function roomNew(){return roomViews.edit()}
async function roomEdit(id){return roomViews.edit(id)}
function roomDelete(id){return roomViews.remove(id)}
const studentViews=window.LighthouseStudent.create({api,esc,prettyDate,put,setTitle,ui:records.ui,getMe:()=>me,encodeFile,onProfile:p=>{me.name=p.name;storage.setItem('lh_user',JSON.stringify(me));const greeting=$('.topbar .usertext b');if(greeting)greeting.textContent='Xin chào, '+p.name;}});
async function goals(){return isStudent()?studentViews.showGoals():assessmentViews.show('goals')}
async function goalDetail(id){return isStudent()?studentViews.goalDetail(id):assessmentViews.reviewGoal(id)}
async function goalNew(id){return studentViews.goalEditor(id)}
async function goalReview(id){return assessmentViews.reviewGoal(id)}
async function grades(){return isStudent()?studentViews.showGrades():assessmentViews.show('grades')}
async function gradeDetail(id){return isStudent()?studentViews.gradeDetail(id):assessmentViews.reviewGrade(id)}
async function gradeNew(id){return id?studentViews.gradeEditor(id):studentViews.showGrades()}
async function gradeReview(id){return assessmentViews.reviewGrade(id)}
async function refreshMe(){me=(await api('auth/me')).item;storage.setItem('lh_user',JSON.stringify(me));}
const people=window.LighthousePeople.create({api,esc,prettyDate,permitted,put,setTitle,ui:records.ui,studentDetail,refreshMe});
async function alumni(){return people.alumni()}
async function users(){return people.users()}
function userNew(){return people.edit()}
function userEdit(id){return people.edit(id)}
function userDelete(id){return people.remove(id)}
function filterUserRows(v){return people.filter(v)}
const reportViews=window.LighthouseReports.create({api,esc,prettyDate,permitted,put,setTitle,ui:records.ui,getToken:()=>token});
async function reports(){return reportViews.show()}
function reportNew(){return reportViews.newReport()}
async function reportDetail(id){return reportViews.detail(id)}
async function reportEdit(id){const {items}=await api('reports'),r=items.find(x=>x.id===id);showModal('Chỉnh sửa báo cáo',`<div class="formgrid">${input('Mã báo cáo','id',r.id,'text','disabled')}${input('Loại báo cáo','type',r.type,'text','disabled')}${ta('Nội dung báo cáo','content',r.content)}${ta('Nhận xét','notes',r.notes)}</div>`,async b=>{if(!confirm('Xác nhận lưu thay đổi báo cáo?')){toast('Đã hủy thao tác!');return}const d=await api('reports/'+id,{method:'PATCH',body:{...b,confirm:true}});toast(d.message);await render()},{wide:true});}
async function reportPrint(id){return reportViews.pdfPreview(id)}
const historyViews=window.LighthouseHistory.create({api,esc,prettyDate,put,setTitle,ui:records.ui});
async function history(){return historyViews.show()}
async function historyFilter(){return historyViews.filter()}
async function logout(show=true){closeModal();document.querySelectorAll('.records-overlay').forEach(el=>el.remove());try{await api('auth/logout',{method:'POST'})}catch{}token='';me=null;storage.removeItem('lh_token');storage.removeItem('lh_user');signinView();if(show)toast('Đã đăng xuất')}
function toggleMenu(open){const d=$('.dashboard');if(!d)return;const visible=open??!d.classList.contains('menu-open');d.classList.toggle('menu-open',visible);$('.sidebar-toggle')?.setAttribute('aria-expanded',String(visible));}
let navigationQueue=Promise.resolve();
function go(k){navigationQueue=navigationQueue.catch(()=>{}).then(async()=>{closeModal();document.querySelectorAll('.records-overlay').forEach(el=>el.remove());window.LighthouseFeedback.clear();page=k;query='';try{await refreshMe();if(token)return render();}catch(e){if(token)toast(e.message,true);}});return navigationQueue;}
let searchTimer=null;function search(v){query=v;clearTimeout(searchTimer);searchTimer=setTimeout(()=>render(),300)}
window.L={go,toggleMenu,render,auth:signinView,logout,search,reviewRegistration,acceptRegistration,filterRegistrations,studentDetail,studentTab,editStudent,uploadImage,deleteImage,addSupport,roomDetail,roomNew,roomEdit,roomDelete,findRoom,goalDetail,goalNew,goalReview,gradeDetail,gradeNew,gradeReview,userNew,userEdit,userDelete,filterUserRows,reportNew,reportDetail,reportEdit,reportPrint,historyFilter};
render();

document.addEventListener('keydown',e=>{const input=e.target;if(e.key!=='Enter'||!input.matches('.search input'))return;e.preventDefault();const form=input.closest('form');if(form&&['alumni-search','room-search-form'].includes(form.id))form.requestSubmit();else input.dispatchEvent(new Event('input',{bubbles:true}));});
