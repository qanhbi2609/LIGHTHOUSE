'use strict';
// Extend the comparison dataset once; keep existing edits and reviewed history.
function upgradeUC56(db){
 if(!db.demoFixture||db.demoFixture.uc56)return false;
 const roomChanges=db.history.some(h=>['Tạo phòng','Sửa bố trí phòng','Xóa phòng'].includes(h.action));
 const names={'LH010':'Hoàng Thùy Linh','LH011':'Võ Hoàng Yến','LH012':'Trần Thị Như Phương'};
 for(const [id,name] of Object.entries(names)){const s=db.students.find(s=>s.id===id);if(s?.name.startsWith('Sinh viên mẫu '))s.name=name;}
 // LH009 was duplicated in UC04. Preserve Trần Thùy Chi's existing key;
 // the additional resident in UC05 receives the next unused key.
 let tien=db.students.find(s=>s.name==='Huỳnh Nữ Thủy Tiên');
 if(!tien){const id='LH'+String(Math.max(...db.students.map(s=>Number(s.id.replace(/\D/g,''))||0))+1).padStart(3,'0');tien={...db.students.find(s=>s.id==='LH003'),id,userId:null,registrationId:null,name:'Huỳnh Nữ Thủy Tiên',room:null,files:[],email:'thuytien@example.test'};db.students.push(tien);}
 if(!roomChanges){
  db.rooms=db.rooms.filter(r=>r.id!=='B101'||db.students.some(s=>s.room==='B101'));
  if(!db.rooms.some(r=>r.id==='A103'))db.rooms.push({id:'A103',capacity:6});
  db.rooms.sort((a,b)=>a.id.localeCompare(b.id));
  for(const id of ['LH003','LH007','LH008','LH011','LH012',tien.id]){const s=db.students.find(s=>s.id===id);if(s&&s.status!=='Đã kết thúc hỗ trợ')s.room='A102';}
  const chi=db.students.find(s=>s.id==='LH009');if(chi?.name==='Trần Thùy Chi'&&chi.room==='A104')chi.room=null;
  const linh=db.students.find(s=>s.id==='LH010');if(linh?.name==='Hoàng Thùy Linh')linh.room='A104';
 }
 const goalNames=['Có bằng TOPIK 5','Thành thạo Adobe Illustrator','Có bằng lái xe','Đạt JLPT N3','Có chứng chỉ MOS','Đạt IELTS 9.0'];
 for(let i=0;i<20;i++){
  const id='MT'+(101+i);if(db.goals.some(g=>g.id===id))continue;
  const s=db.students[i%db.students.length];
  db.goals.push({id,studentId:i===6?'LH001':s.id,name:i===6?'Thành thạo Python':goalNames[i]||`Mục tiêu mẫu ${i+1}`,
   detail:'• Đăng ký học thêm ở trung tâm\n• Tự luyện mỗi ngày',sent:i===6?'2026-06-30':'2025-12-31',
   periodFrom:'2026-07-01',periodTo:'2026-12-31',status:'Chờ đánh giá',feedback:''});
 }
 for(let i=0;i<18;i++){
  const id='KQ'+(101+i);if(db.grades.some(g=>g.id===id))continue;const s=db.students[i%db.students.length];
  db.grades.push({id,studentId:s.id,term:'II',year:'2025–2026',gpa:['3.85','3.42','3.20','3.56'][Math.min(i,3)],rank:i===0?'Xuất sắc':'Giỏi',
   debts:0,certificates:i===0?'VSTEP B2':'—',sent:'2026-07-01',status:'Chờ xét duyệt',requestNote:'',
   evidence:'/uploads/figma-grades.png',previewRegion:[610,160,700,761],evidenceName:'bang_diem_hoc_ky_2.pdf'});
 }
 db.demoFixture.uc56=true;return true;
}
module.exports={upgradeUC56};
