'use strict';
// Values transcribed from the UC03/UC04 screenshots supplied by the user.
// Rows not visible in the screenshots are explicitly named as sample records.
const school='Trường Đại học Kinh tế - Đại học Đà Nẵng';
const description=[
 'Em thích công nghệ và muốn áp dụng công nghệ vào quản lý, kinh doanh.',
 'Em thấy khá phù hợp vì em thích máy tính và và phân tích vấn đề.',
 'Em có thể làm Business Analyst, System Analyst hoặc Data Analyst.',
 'Khoảng 8-12 triệu đồng/tháng khi mới ra trường.',
 'Phân tích, giao tiếp, làm việc nhóm và công nghệ.',
 'Học chuyên ngành, thực hành qua dự án và tự học thêm.',
 'Cải thiện tiếng Anh, học SQL, Power BI và tìm cơ hội thực tập.'
].map(s=>'•  '+s).join('\n');
const proof=(kind,name,created='2023-09-01')=>({
 url:`/uploads/figma-${kind}.png`,name,created,
 previewRegion:({family:[686,237,487,650],grades:[610,160,700,761],invoice:[690,160,540,762]})[kind]
});
function applyFigmaFixture(db){
 const regRows=[
  ['Bùi Bích Phương','2026-10-21','Chờ kiểm tra'],
  ['Vũ Thảo My','2026-10-06','Đạt yêu cầu'],
  ['Lâm Bảo Ngọc','2026-09-27','Chờ kiểm tra'],
  ['Khương Hoàn Mỹ','2026-09-13','Chờ kiểm tra'],
  ['Nguyễn Lê Ngọc Ánh Sáng','2026-08-24','Chờ kiểm tra'],
  ['Đào Di Quân','2026-08-09','Đạt yêu cầu'],
  ['Phương Mỹ Chi','2026-07-18','Chờ bổ sung']
 ];
 // Complete the off-screen rows so the counters are derived from real records.
 for(let i=8;i<=24;i++)regRows.push([`Hồ sơ mẫu ${String(i).padStart(2,'0')}`,'2026-07-01',i<=15?'Chờ kiểm tra':i<=22?'Chờ bổ sung':'Đạt yêu cầu']);
 db.registrations=regRows.map(([name,created,status],i)=>({
  id:'HS'+String(i+1).padStart(3,'0'),name,created,status,
  email:`hoso${i+1}@example.test`,phone:'0900000000',dob:'2005-03-15',cccd:'',
  hometown:'',address:'',school,major:'Hệ thống thông tin quản lý',family:'Hộ cận nghèo',description,
  note:status==='Chờ bổ sung'?'Yêu cầu bổ sung thêm minh chứng':'',files:[],documents:[]
 }));
 Object.assign(db.registrations[5],{
  email:'a1jontheway@gmail.com',phone:'0869585951',dob:'1999-06-01',cccd:'092299001234',
  hometown:'Thành phố Hồ Chí Minh',address:'65 Lê Lợi, P. Bến Thành, Q1',
  documents:[{name:'giayxacnhanhanhkiem.pdf',url:'',group:'family'},
   {name:'giaybaotrungtuyen.pdf',url:'',group:'family'},
   {...proof('family','giayxacnhanhongheo.pdf','2026-08-09'),group:'school'}]
 });
 const rows=[
  ['Mai Hồng Ngọc','A101',school,'Marketing'],
  ['Nguyễn Khoa Tóc Tiên','A101','Trường Đại học Sư phạm - Đại học Đà Nẵng','Sư phạm Ngữ văn'],
  ['Vũ Cát Tường','A102','Trường Đại học Bách khoa - Đại học Đà Nẵng','Công nghệ thông tin'],
  ['Văn Mai Hương',null,'Trường Đại học Ngoại ngữ - Đại học Đà Nẵng','Ngôn ngữ Nhật'],
  ['Trần Khởi My','A101','Trường Cao đẳng Du lịch Đà Nẵng','Hệ thống thông tin quản lý'],
  ['Vũ Thu Minh','A104','Trường Cao đẳng Thương mại','Kế toán doanh nghiệp'],
  ['Phạm Thị Hương Tràm',null,'Trường Cao đẳng Phương Đông Đà Nẵng','Quản trị Du lịch và Lữ hành'],
  ['Nguyễn Thị Hòa',null,'Trường Cao đẳng Kỹ thuật Y - Dược Đà Nẵng','Dược học'],
  ['Trần Thùy Chi','A104','Trường Đại học Bách khoa - Đại học Đà Nẵng','Kỹ thuật xây dựng']
 ];
 for(let i=10;i<=32;i++)rows.push([`Sinh viên mẫu ${String(i).padStart(2,'0')}`,null,'Trường mẫu','Ngành mẫu']);
 db.students=rows.map(([name,room,school,major],i)=>({id:'LH'+String(i+1).padStart(3,'0'),
  registrationId:null,userId:i===0?'ND003':null,name,room,school,major,
  email:i===0?'ngoc@example.com':`sinhvien${i+1}@example.test`,phone:'0905123456',dob:'2005-03-15',cccd:'',
  hometown:'Tam Kỳ, Quảng Nam',address:'',cohort:'2023-2027',studentCode:'',family:'Hộ cận nghèo.',
  status:'Đang hỗ trợ',joined:'2023-09-01',endDate:'',endReason:'',files:[]
 }));
 Object.assign(db.students[0],{cccd:'002301201442',address:'24 Nguyễn Du, phường Tam Kỳ, thành phố Đà Nẵng',
  files:[proof('family','Sơ yếu lý lịch.pdf · Giấy xác nhận hoàn cảnh.pdf'),
   {name:'Giấy báo trúng tuyển.pdf · Quyết định tiếp nhận.pdf',created:'2023-09-02',url:''}]
 });
 db.rooms=['A101','A102','A104','B101'].map(id=>({id,capacity:6}));
 db.goals=[
  ['2026-06-30','Có bằng TOPIK 5','Việc cần làm: - Luyện nói 10 phút mỗi ngày.'],
  ['2025-12-31','Thành thạo Python','Mỗi ngày luyện tập lập trình 30 phút, xem thêm lập trình nâng cao trên youtube.\nTự làm dự án thực tế, project cá nhân.\nĐọc các tài liệu lập trình bằng tiếng Anh.'],
  ['2025-06-30','Có bằng lái xe','Đạt 100/100 điểm thực hành và 25/25 điểm lý thuyết.'],
  ['2024-12-31','Giao tiếp Tiếng Anh thành thạo','Luyện nói mỗi ngày 1-2 tiếng với người nước ngoài.']
 ].map(([sent,name,detail],i)=>({id:'MT'+String(i+1).padStart(3,'0'),studentId:'LH001',sent,name,detail,status:'Đạt',feedback:''}));
 db.grades=[
  ['2025–2026','II','3.85','Xuất sắc','VSTEP B2'],['2025–2026','I','3.72','Giỏi','MOS Excel'],
  ['2024–2025','II','3.68','Giỏi','—'],['2024–2025','I','3.60','Giỏi','—']
 ].map(([year,term,gpa,rank,certificates],i)=>({id:'KQ'+String(i+1).padStart(3,'0'),studentId:'LH001',
  year,term,gpa,rank,certificates,debts:0,status:'Hợp lệ',requestNote:'',sent:'2026-06-30',
  evidence:proof('grades').url,previewRegion:proof('grades').previewRegion}));
 db.supports=[
  ['Học phí học kỳ II 2025–2026','Học phí','2026-02-15','',8500000],
  ['Sinh hoạt phí tháng 10','Sinh hoạt','2026-10-01','2026-10-31',1500000],
  ['Mua giáo trình Marketing','Học tập','2026-09-05','',520000],
  ['Lệ phí thi VSTEP B2','Chứng chỉ','2026-05-12','',1800000]
 ].map(([name,type,date,endDate,amount],i)=>({id:'HT'+String(i+1).padStart(3,'0'),studentId:'LH001',
  name,type,date,endDate,amount,evidence:proof('invoice').url,previewRegion:proof('invoice').previewRegion}));
 db.images=[];db.otps=[];db.history=[];db.studentRevisions=[];
 db.demoFixture={id:'figma-v1',source:'User supplied UC03/UC04 screenshots',offscreenRows:'Explicitly named sample records'};
 return db;
}
module.exports={applyFigmaFixture};
