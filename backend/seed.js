const fs=require('fs'),path=require('path'),crypto=require('crypto');
const dir=path.resolve(process.env.LIGHTHOUSE_DATA_DIR||path.join(__dirname,'data')),file=path.join(dir,'lighthouse.json');
const hash=pass=>{const salt=crypto.randomBytes(16).toString('hex');return salt+':'+crypto.scryptSync(pass,salt,64).toString('hex')};
const users=[
 ['ND001','Quản lý Lighthouse','quanly@lighthouse.test','QuanLy',null,['*']],
 ['ND002','Cán bộ hỗ trợ','canbo@lighthouse.test','CanBo',null,['students.view','rooms.view','registrations.view','goals.view','grades.view','alumni.view','reports.view','history.view']],
 ['ND003','Sinh viên Demo','sinhvien@lighthouse.test','SinhVien','LH001',[]],
 ['ND004','Giám đốc Demo','giamdoc@lighthouse.test','GiamDoc',null,['*']]
].map(([id,name,email,role,studentId,permissions])=>({id,name,email,role,studentId,permissions,passwordHash:hash('Demo@123'),active:true}));
const now=new Date().toISOString();
const students=[
 {id:'LH001',registrationId:'HS001',userId:'ND003',name:'Nguyễn Minh An',cccd:'',dob:'2004-06-12',hometown:'Quảng Nam',address:'Đà Nẵng',phone:'0900000001',email:'sinhvien@lighthouse.test',cohort:'2022-2026',studentCode:'SV001',school:'Đại học Bách khoa - Đại học Đà Nẵng',major:'Công nghệ thông tin',family:'Hộ khó khăn',room:'A101',status:'Đang hỗ trợ',joined:'2024-09-01',endDate:'',endReason:''},
 {id:'LH002',registrationId:'HS002',userId:null,name:'Trần Thanh Bình',cccd:'',dob:'2003-03-22',hometown:'Quảng Ngãi',address:'Đà Nẵng',phone:'0900000002',email:'teststudent2@example.test',cohort:'2021-2025',studentCode:'SV002',school:'Đại học Kinh tế - Đại học Đà Nẵng',major:'Marketing',family:'Hộ cận nghèo',room:'A101',status:'Đang hỗ trợ',joined:'2023-09-01',endDate:'',endReason:''},
 {id:'LH003',registrationId:'HS003',userId:null,name:'Lê Thu Hà',cccd:'',dob:'2005-02-02',hometown:'Huế',address:'Đà Nẵng',phone:'0900000003',email:'teststudent3@example.test',cohort:'2023-2027',studentCode:'SV003',school:'Đại học Sư phạm - Đại học Đà Nẵng',major:'Sư phạm',family:'Hộ khó khăn',room:'A102',status:'Đang hỗ trợ',joined:'2025-08-01',endDate:'',endReason:''},
 {id:'LH004',registrationId:'HS004',userId:null,name:'Phạm Ngọc Lan',cccd:'',dob:'2001-09-17',hometown:'Quảng Bình',address:'Đà Nẵng',phone:'0900000004',email:'teststudent4@example.test',cohort:'2019-2023',studentCode:'SV004',school:'Đại học Ngoại ngữ - Đại học Đà Nẵng',major:'Ngôn ngữ Anh',family:'Hộ khó khăn',room:null,status:'Đã kết thúc hỗ trợ',joined:'2020-09-01',endDate:'2025-07-01',endReason:'Đã tốt nghiệp'}
];
const registrations=[
 {id:'HS001',name:'Nguyễn Minh An',email:'sinhvien@lighthouse.test',phone:'0900000001',dob:'2004-06-12',cccd:'',hometown:'Quảng Nam',address:'Đà Nẵng',school:'Đại học Bách khoa - Đại học Đà Nẵng',major:'Công nghệ thông tin',family:'Hộ khó khăn',description:'',files:[],status:'Đã tiếp nhận',note:'',created:'2024-09-01'},
 {id:'HS002',name:'Trần Thanh Bình',email:'teststudent2@example.test',phone:'0900000002',dob:'2003-03-22',cccd:'',hometown:'Quảng Ngãi',address:'Đà Nẵng',school:'Đại học Kinh tế - Đại học Đà Nẵng',major:'Marketing',family:'Hộ cận nghèo',description:'',files:[],status:'Đã tiếp nhận',note:'',created:'2023-09-01'},
 {id:'HS003',name:'Lê Thu Hà',email:'teststudent3@example.test',phone:'0900000003',dob:'2005-02-02',cccd:'',hometown:'Huế',address:'Đà Nẵng',school:'Đại học Sư phạm - Đại học Đà Nẵng',major:'Sư phạm',family:'Hộ khó khăn',description:'',files:[],status:'Đã tiếp nhận',note:'',created:'2025-08-01'},
 {id:'HS004',name:'Phạm Ngọc Lan',email:'teststudent4@example.test',phone:'0900000004',dob:'2001-09-17',cccd:'',hometown:'Quảng Bình',address:'Đà Nẵng',school:'Đại học Ngoại ngữ - Đại học Đà Nẵng',major:'Ngôn ngữ Anh',family:'Hộ khó khăn',description:'',files:[],status:'Đã tiếp nhận',note:'',created:'2020-09-01'},
 {id:'HS005',name:'Đỗ Mai Chi',email:'maychi@example.test',phone:'0900000005',dob:'2006-05-05',cccd:'',hometown:'Quảng Trị',address:'Đà Nẵng',school:'Đại học Kinh tế - Đại học Đà Nẵng',major:'Kế toán',family:'Hộ khó khăn',description:'Cần hỗ trợ chỗ ở',files:[],status:'Chờ kiểm tra',note:'',created:now.slice(0,10)}
];
const db={users,students,registrations,rooms:[{id:'A101',capacity:6},{id:'A102',capacity:6},{id:'B101',capacity:6}],images:[],
 goals:[{id:'MT001',studentId:'LH001',name:'Hoàn thành các học phần',detail:'Đạt GPA tối thiểu 3.0 trong học kỳ tới',sent:'2026-09-20',status:'Chờ đánh giá',feedback:''},{id:'MT002',studentId:'LH002',name:'Tiếng Anh B1',detail:'Ôn luyện và thi chứng chỉ tiếng Anh B1',sent:'2026-09-22',status:'Chờ đánh giá',feedback:''}],
 grades:[{id:'KQ001',studentId:'LH001',term:'1',year:'2025-2026',gpa:3.45,rank:'Giỏi',debts:0,certificates:'Tiếng Anh B1',evidence:'',status:'Chờ xét duyệt',requestNote:'',sent:'2026-09-21'},{id:'KQ002',studentId:'LH002',term:'2',year:'2025-2026',gpa:3.2,rank:'Giỏi',debts:0,certificates:'Tin học',evidence:'',status:'Chờ xét duyệt',requestNote:'',sent:'2026-09-25'}],
 supports:[{id:'HT001',studentId:'LH001',name:'Học phí',type:'Tài chính',amount:3000000,date:'2026-06-10',evidence:''},{id:'HT002',studentId:'LH003',name:'Sách vở',type:'Học tập',amount:450000,date:'2026-08-21',evidence:''}],
 reports:[{id:'BC001',type:'Báo cáo tháng',from:'2026-10-01',to:'2026-10-31',content:'Tổng hợp hoạt động hỗ trợ sinh viên trong tháng.',notes:'Báo cáo minh họa với dữ liệu giả lập.',files:[],status:'Đã lưu',author:'ND001',created:now,updated:now}],
 history:[{id:'LS001',userId:'ND001',actor:'Quản lý Lighthouse',action:'Tạo phòng',subject:'A101',time:now}],otps:[]};
fs.mkdirSync(dir,{recursive:true});if(!fs.existsSync(file)||process.argv.includes('--reset'))fs.writeFileSync(file,JSON.stringify(db,null,2)+'\n');
console.log('Đã chuẩn bị dữ liệu demo ở',file); 
