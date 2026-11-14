'use strict';
window.LighthouseRooms={create({api,esc,permitted,put,setTitle,ui}){
const {layer,notice,confirm}=ui,$=(s,r=document)=>r.querySelector(s);
let rooms=[],students=[],query='',searched=false;
const searchIcon='<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>';
const status=r=>r.students.length===0?'Trống':r.students.length>=r.capacity?'Đã đầy':'Còn chỗ';
const pill=r=>`<span class="room-state ${r.students.length===0?'vacant':r.students.length>=r.capacity?'full':'available'}">${status(r)}</span>`;
const action=(text,kind,id,cls='secondary')=>`<button type="button" class="${cls}" data-room-action="${kind}" data-id="${esc(id)}">${text}</button>`;
async function show(reset=false){
 if(reset){query='';searched=false;}
 setTitle('Quản lý phòng ở');[{items:rooms},{items:students}]=await Promise.all([api('rooms'),api('rooms/residents')]);
 put(`<div class="records-workspace rooms-workspace"><section class="panel rooms-search"><h2>Tìm phòng theo sinh viên</h2><form id="room-search-form"><div class="search">${searchIcon}<input id="room-student-input" aria-label="Tìm phòng theo sinh viên" placeholder="Nhập tên hoặc mã quản lý sinh viên" value="${esc(query)}"></div><button class="primary" type="submit">Tìm</button></form><div id="room-search-result"></div></section><div class="rooms-toolbar"><h2>Danh sách phòng · ${rooms.length} phòng</h2>${permitted('rooms.create')?'<button type="button" class="primary" id="room-new"><span aria-hidden="true">＋</span> Tạo phòng</button>':''}</div><div class="rooms-card-scroll"><div class="room-grid">${rooms.map(r=>`<article class="room-card" data-room="${esc(r.id)}"><div class="room-header"><h3>${esc(r.id)}</h3>${pill(r)}</div><div class="room-capacity">${r.students.length}/${r.capacity} sinh viên</div><p>${esc(r.students.map(s=>s.id+' '+s.name).join(' · ')||'Chưa có sinh viên trong phòng.')}</p><div class="room-bottom"><div class="actions">${action('Xem','detail',r.id)}${(permitted('rooms.assign')?action('Sửa','edit',r.id,'primary'):'')+(permitted('rooms.delete')?action('Xoá','delete',r.id,'danger-button'):'')}</div></div></article>`).join('')}</div></div></div>`);
 document.querySelectorAll('[data-room-action]').forEach(b=>b.onclick=()=>({detail,edit,delete:remove})[b.dataset.roomAction](b.dataset.id));
 $('#room-new')?.addEventListener('click',()=>edit());
 $('#room-search-form').onsubmit=e=>{e.preventDefault();query=$('#room-student-input').value.trim();searched=true;find(true);};if(searched)find();
}
function find(announce=false){
 const q=query.toLocaleLowerCase('vi'),matches=q?students.filter(s=>(s.id+' '+s.name).toLocaleLowerCase('vi').includes(q)):[];
 if(announce&&q&&!matches.length)notice('Không tìm thấy thông tin.');
 $('#room-search-result').innerHTML=`<small>Nhập tên hoặc mã quản lý sinh viên</small>${matches.length?matches.map(s=>{const r=rooms.find(r=>r.id===s.room);return `<div class="room-search-match"><strong>${esc(s.id)} · ${esc(s.name)}</strong><span>${r?`Phòng ${esc(r.id)} · ${r.students.length}/${r.capacity} · Còn chỗ: ${r.capacity-r.students.length}`:'Chưa được bố trí phòng ở'}</span></div>`;}).join(''):'<p class="room-search-empty">Chưa có dữ liệu.</p>'}`;
}
async function detail(id){
 const {items}=await api('rooms'),r=items.find(r=>r.id===id);if(!r)return notice('Không tìm thấy phòng.');
 layer(`<section class="rooms-detail" role="dialog" aria-modal="true" aria-label="Thông tin phòng ${esc(id)}"><header><h2>${esc(id)} · Thông tin chi tiết phòng ở</h2><button type="button" class="room-detail-close" data-close aria-label="Đóng thông tin phòng">×</button></header><div class="rooms-detail-summary">${[['Tên phòng',id],['Sức chứa',r.capacity+' sinh viên'],['Số sinh viên đang ở',r.students.length+' sinh viên'],['Còn chỗ',r.capacity-r.students.length]].map(([k,v])=>`<div><strong>${k}</strong><span>${esc(v)}</span></div>`).join('')}${pill(r)}</div><h3>Danh sách sinh viên hiện tại</h3><div class="rooms-detail-data"><table><colgroup><col style="width:32.5%"><col style="width:32.5%"><col style="width:35%"></colgroup><thead><tr><th>MÃ QUẢN LÝ</th><th>HỌ TÊN</th><th>PHÒNG HIỆN TẠI</th></tr></thead><tbody>${r.students.map(s=>`<tr><td>${esc(s.id)}</td><td>${esc(s.name)}</td><td>${esc(id)}</td></tr>`).join('')||'<tr><td colspan="3">Chưa có sinh viên trong phòng.</td></tr>'}</tbody></table></div></section>`,'rooms-detail-layer');
}
async function edit(id){
 if(!permitted(id?'rooms.assign':'rooms.create'))return;
 const [{items:rs},{items:ss}]=await Promise.all([api('rooms'),api('rooms/residents')]);
 const r=rs.find(r=>r.id===id),creating=!id;if(id&&!r)return notice('Không tìm thấy phòng.');
 const selected=new Set(r?.students.map(s=>s.id)||[]),original=new Set(selected);
 const ordered=ss.filter(s=>s.status!=='Đã kết thúc hỗ trợ').sort((a,b)=>Number(original.has(b.id))-Number(original.has(a.id)));
 const {el,close}=layer(`<section class="room-picker ${creating?'room-picker-new':''}" role="dialog" aria-modal="true" aria-label="${creating?'Tạo phòng mới':'Sửa bố trí phòng '+esc(id)}"><header><h2>${creating?'Tạo phòng mới':esc(id)}</h2>${creating?'':'<span id="picker-state" aria-live="polite"></span>'}<button type="button" class="picker-close cancel" aria-label="Đóng" data-close>×</button></header><form id="room-picker-form" novalidate>${creating?'<div class="room-new-fields"><label for="new-room-id">Tên phòng *<input id="new-room-id" name="id" placeholder="Nhập tên phòng" maxlength="20"><small id="new-room-id-error" class="records-error"></small></label><label for="new-room-capacity">Sức chứa *<input id="new-room-capacity" name="capacity" type="number" value="6" readonly></label></div><div class="room-picker-subheading"><strong>Danh sách sinh viên</strong>':''}<div class="search">${searchIcon}<input id="room-picker-search" aria-label="Tìm sinh viên để bố trí phòng" placeholder="${creating?'Nhập từ khoá tìm kiếm':'Nhập tên hoặc mã quản lý để tìm kiếm'}"></div>${creating?'</div>':'<button class="room-clear" type="button">Bỏ chọn tất cả</button>'}<div class="room-picker-list" tabindex="0" aria-label="Danh sách sinh viên bố trí phòng"></div><p class="room-picker-hint">Chỉ được chọn tối đa 6 người/phòng.</p><p class="records-error" role="alert"></p><footer><button class="primary" type="submit">Lưu</button></footer></form></section>`,'rooms-picker-layer',done=>{done();notice('Đã hủy thao tác!');});
 const draw=()=>{
  const q=$('#room-picker-search',el).value.toLocaleLowerCase('vi'),rows=ordered.filter(s=>(s.id+' '+s.name).toLocaleLowerCase('vi').includes(q)).sort((a,b)=>Number(selected.has(b.id))-Number(selected.has(a.id)));
  $('.room-picker-list',el).innerHTML=rows.map(s=>`<label class="room-pick-row"><input type="checkbox" value="${esc(s.id)}" ${selected.has(s.id)?'checked':''} ${selected.size>=6&&!selected.has(s.id)?'disabled':''}><span><strong>${esc(s.name)}</strong><span>${esc(s.id)}</span><small>${original.has(s.id)&&!creating?'Đang ở phòng này':esc(s.room||'Chưa được bố trí phòng ở')}</small></span></label>`).join('')||'<p class="room-search-empty">Chưa có dữ liệu.</p>';
  if(!creating)$('#picker-state',el).innerHTML=selected.size>=6?'<span class="room-state full">Đã đầy</span>':`<span class="room-state available">${selected.size}/6</span>`;
  el.querySelectorAll('.room-pick-row input').forEach(c=>c.onchange=()=>{if(c.checked&&selected.size>=6){c.checked=false;notice('Phòng đầy!');return;}c.checked?selected.add(c.value):selected.delete(c.value);const full=selected.size>=6;el.querySelectorAll('.room-pick-row input').forEach(i=>i.disabled=full&&!i.checked);if(!creating)$('#picker-state',el).innerHTML=full?'<span class="room-state full">Đã đầy</span>':`<span class="room-state available">${selected.size}/6</span>`;});
  el.querySelectorAll('.room-pick-row').forEach(row=>row.onclick=e=>{if(row.querySelector('input').disabled){e.preventDefault();notice('Phòng đầy!');}});
 };
 $('#new-room-id',el)?.addEventListener('input',()=>{$('#new-room-id-error',el).textContent='';});
 $('#room-picker-search',el).oninput=draw;$('.room-clear',el)?.addEventListener('click',()=>{selected.clear();draw();});draw();
 $('#room-picker-form',el).onsubmit=async e=>{
  e.preventDefault();const b=$('[type=submit]',el),name=creating?$('#new-room-id',el).value.trim().toUpperCase():id;
  if(!/^[A-Z0-9][A-Z0-9_-]{0,19}$/.test(name)||selected.size>6||(creating&&rs.some(r=>r.id===name))){if(creating)$('#new-room-id-error',el).textContent='Thông tin không hợp lệ!';notice('Thông tin không hợp lệ!');return;}
  b.disabled=true;try{await api(creating?'rooms':'rooms/'+id,{method:creating?'POST':'PUT',body:{id:name,capacity:6,studentIds:[...selected]}});close();await show();notice(creating?'Tạo mới thành công!':'Cập nhật thành công!');}catch(error){$('.records-error',el).textContent=error.message;notice(error.message);}finally{b.disabled=false;}
 };
}
async function remove(id){
 if(!permitted('rooms.delete'))return;const {items}=await api('rooms'),r=items.find(r=>r.id===id);if(!r)return;
 confirm(`Xác nhận xoá phòng?\n\nPhòng ${id} · Sức chứa ${r.capacity} · Đang ở ${r.students.length}/${r.capacity} · Còn chỗ ${r.capacity-r.students.length}.`,async()=>{await api('rooms/'+id,{method:'DELETE'});await show();notice('Xoá phòng thành công!');});
}
return {show,detail,edit,remove,find:()=>{query=$('#room-student-input').value.trim();searched=true;find();}};
}};
