'use strict';
// Upgrade only untouched sample slots; never overwrite a real/edited profile.
function upgradeUC78(db){
 if(!db.demoFixture||db.demoFixture.uc78)return false;
 const rows=[
 ['LH015','Nguyễn Thị Lan Anh','ĐH Kinh tế Đà Nẵng','Quản trị kinh doanh','2024-06-30',false],
 ['LH013','Trần Minh Khang','ĐH Bách khoa Đà Nẵng','Công nghệ thông tin','2024-06-30',false],
 ['LH021','Lê Hoàng Phúc','ĐH Sư phạm Đà Nẵng','Ngôn ngữ Anh','2024-05-15',true],
 ['LH023','Phạm Thị Ngọc','ĐH Duy Tân','Kế toán','2023-06-30',false],
 ['LH018','Võ Thanh Bình','ĐH Bách khoa Đà Nẵng','Kỹ thuật xây dựng','2023-06-30',false],
 ['LH031','Đặng Thu Hà','ĐH Kinh tế Đà Nẵng','Marketing','2023-02-20',true],
 ['LH034','Trần Cẩm Tú','ĐH Kinh tế Đà Nẵng','Du lịch','2023-02-20',true],
 ['LH054','Trần Thị Thu Thảo','ĐH Kinh tế Đà Nẵng','Nhà hàng khách sạn','2023-02-20',true]
 ];
 for(const n of [14,16,17,19,20,22,24,25,26,27,28,29])rows.push(['LH'+String(n).padStart(3,'0'),`Alumni mẫu ${n}`,'Trường mẫu','Ngành mẫu','2023-02-20',false]);
 for(const [id,name,school,major,endDate,early] of rows){
  let s=db.students.find(s=>s.id===id);
  if(s&&(!s.name.startsWith('Sinh viên mẫu ')||db.studentRevisions?.some(r=>r.studentId===id)||s.room))continue;
  if(!s){s={id,userId:null,registrationId:null,phone:'0905123456',dob:'2005-03-15',hometown:'Tam Kỳ, Quảng Nam',address:'',cccd:'',family:'Hộ cận nghèo.',cohort:'',joined:'2020-09-01',files:[],room:null};db.students.push(s);}
  Object.assign(s,{name,school,major,status:'Đã kết thúc hỗ trợ',endReason:early?'Rời trước thời hạn':'Đã tốt nghiệp',endDate,email:id.toLowerCase()+'@example.test'});
 }
 const tu=db.students.find(s=>s.id==='LH034'&&s.name==='Trần Cẩm Tú');
 if(tu){
  // The source screenshot reused Ngọc's name/email in Tú's personal tab.
  // Keep Tú's own identity; unknown original documents remain explicitly missing.
  tu.files=[{name:'Sơ yếu lý lịch.pdf · Giấy xác nhận hoàn cảnh.pdf',created:'2023-09-01',url:''},{name:'Giấy báo trúng tuyển.pdf · Quyết định tiếp nhận.pdf',created:'2023-09-02',url:''}];
  for(let i=0;i<8;i++)db.grades.push({id:'KQ78'+i,studentId:tu.id,year:`${2025-Math.floor(i/2)}–${2026-Math.floor(i/2)}`,term:i%2?'I':'II',gpa:['3.85','3.72','3.68','3.60'][i%4],rank:i?'Giỏi':'Xuất sắc',certificates:i===0?'VSTEP B2':i===1?'MOS Excel':'—',debts:0,status:'Hợp lệ',sent:'2026-06-30',evidence:'/uploads/alumni-grades.png'});
  for(let i=0;i<6;i++)db.goals.push({id:'MT78'+i,studentId:tu.id,sent:`${2026-Math.floor(i/2)}-${i%2?'01-01':'06-30'}`,name:['Có bằng TOPIK 5','Thành thạo Python','Có bằng lái xe','Giao tiếp Tiếng Anh thành thạo','Đạt bằng B1','Đạt chứng chỉ MOS'][i],detail:i===1?'Mỗi ngày luyện tập lập trình 30 phút, xem thêm lập trình nâng cao trên youtube.\nTự làm dự án thực tế, project cá nhân.\nĐọc các tài liệu lập trình bằng tiếng Anh.':'Luyện tập mỗi ngày và hoàn thành kế hoạch đã đặt ra.',status:'Đạt',feedback:''});
  for(const [i,name,type,date,amount] of [[0,'Học phí học kỳ II 2025–2026','Học phí','2026-02-15',8500000],[1,'Sinh hoạt phí tháng 10','Sinh hoạt','2026-10-01',1500000],[2,'Mua giáo trình Marketing','Học tập','2026-09-05',520000],[3,'Lệ phí thi VSTEP B2','Chứng chỉ','2026-05-12',1800000]])db.supports.push({id:'HT78'+i,studentId:tu.id,name,type,date,amount,evidence:'/uploads/alumni-invoice.png'});
  for(let i=0;i<11;i++)db.images.push({id:'HA78'+i,studentId:tu.id,url:`/uploads/alumni-photo-${i}.png`,created:`2026-${i<3?'09':i<8?'08':'07'}-01T00:00:00Z`});
 }
 // Add comparison staff while leaving existing login accounts and grants alone.
 const staff=[['Tống Thị Thanh Tâm','GiamDoc'],['Phan Thị Ngọc Diễm','QuanLy'],['Trần Thị Lành','CanBo'],['Đỗ Trung Tín','CanBo'],['Nguyễn Thị Ngọc Mỹ','CanBo']];
 const crypto=require('node:crypto');
 const hash=()=>{const salt=crypto.randomBytes(16).toString('hex');return salt+':'+crypto.scryptSync('Demo@123',salt,64).toString('hex');};
 for(let i=0;i<staff.length;i++){
  const email=`nhanvien${i+1}@example.test`;if(db.users.some(u=>u.email===email))continue;
  let n=Math.max(0,...db.users.map(u=>Number(u.id.replace(/\D/g,''))||0))+1;
  db.users.push({id:'ND'+String(n).padStart(3,'0'),name:staff[i][0],email,role:staff[i][1],studentId:null,active:true,passwordHash:hash(),permissions:i===0?['*']:['students.view','rooms.view','alumni.view','reports.view']});
 }
 // Correct only untouched old placeholders for linked student accounts.
 for(const u of db.users){const s=db.students.find(s=>s.id===u.studentId);if(s&&u.name==='Sinh viên Demo')u.name=s.name;}
 db.demoFixture.uc78=true;return true;
}
module.exports={upgradeUC78};
