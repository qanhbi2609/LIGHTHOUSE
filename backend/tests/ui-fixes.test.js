'use strict';
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'lighthouse-ui-fixes-'));
Object.assign(process.env,{LIGHTHOUSE_DATA_DIR:dir+'/data',LIGHTHOUSE_UPLOADS_DIR:dir+'/uploads',LIGHTHOUSE_DEMO_DATASET:'figma'});
const {server,db}=require('../server');let url,manager,director;
const file=dir+'/data/figma-demo-v1.json',disk=()=>fs.readFileSync(file,'utf8');
async function call(endpoint,method='GET',body,token=manager){const r=await fetch(url+'/api/'+endpoint,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+(token||'')},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
const valid={name:'Ứng viên kiểm thử',email:'valid@example.test',phone:'0901234567',dob:'2006-09-26',hometown:'Đà Nẵng',address:'Địa chỉ kiểm thử',cccd:'001001000001',school:'Trường kiểm thử',major:'Ngành kiểm thử',family:'Hoàn cảnh kiểm thử',description:'Kế hoạch học tập'};
const png={name:'proof.png',mime:'image/png',data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='};
before(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));url='http://127.0.0.1:'+server.address().port;manager=(await call('auth/login','POST',{email:'quanly@lighthouse.test',password:'Demo@123'},'')).data.token;director=(await call('auth/login','POST',{email:'giamdoc@lighthouse.test',password:'Demo@123'},'')).data.token;});
after(async()=>{await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});});
test('required registration identity cannot be omitted, blank or bypassed by intake',async()=>{
 const before=disk();for(const key of Object.keys(valid)){const a={...valid};delete a[key];assert.equal((await call('registrations','POST',a,'')).status,400,key);}for(const phone of ['901234567','09012345678','1901234567','090 1234567',' 0901234567','0901234567 '])assert.equal((await call('registrations','POST',{...valid,phone},'')).status,400);assert.equal(disk(),before);
 const r=await call('registrations','POST',{...valid,files:[png]},'');assert.equal(r.status,201);const id=r.data.item.id,row=db.registrations.find(r=>r.id===id);row.status='Đạt yêu cầu';row.address='';const current=JSON.stringify(db);assert.equal((await call('registrations/'+id+'/accept','POST')).status,400);assert.equal(JSON.stringify(db),current);
});
test('registration supplement note can only change in the matching status',async()=>{
 const r=await call('registrations','POST',{...valid,email:'review@example.test'},'');assert.equal(r.status,201);const route='registrations/'+r.data.item.id,before=disk();assert.equal((await call(route,'PATCH',{status:'Đạt yêu cầu',note:'Forbidden note'})).status,400);assert.equal(disk(),before);
 assert.equal((await call(route,'PATCH',{status:'Chờ bổ sung',note:'Bổ sung giấy tờ'})).status,200);assert.equal((await call(route,'PATCH',{status:'Đạt yêu cầu'})).status,200);assert.equal(db.registrations.find(x=>x.id===r.data.item.id).note,'Bổ sung giấy tờ');
});
test('support requires all fields, one of four types, nonnegative amount and a real date',async()=>{
 const body={studentId:'LH001',name:'Hỗ trợ kiểm thử',type:'Học phí',amount:0,date:'2026-11-14'};const before=disk();
 for(const key of ['name','type','amount','date']){const a={...body};delete a[key];assert.equal((await call('supports','POST',a)).status,400,key);}for(const patch of [{type:'Tài chính'},{amount:-1},{amount:true},{amount:''},{amount:'NaN'},{date:'2026-02-30'}])assert.equal((await call('supports','POST',{...body,...patch})).status,400);assert.equal(disk(),before);
 for(const type of ['Học phí','Phí sinh hoạt','Y tế','Chi phí khác'])assert.equal((await call('supports','POST',{...body,type})).status,201);
});
test('proof listing omits absent, broken and external files while preserving source metadata',async()=>{
 const profile=db.students.find(s=>s.id==='LH001'),before=structuredClone(profile.files);profile.files.push({name:'Missing',url:'/uploads/missing.png'},{name:'Fake',url:'https://example.com/proof.pdf'},{name:'No proof'});
 const result=await call('students/LH001');assert.equal(result.status,200);assert.ok(result.data.item.files.length);assert.ok(result.data.item.files.every(f=>fs.existsSync(path.join(dir,'uploads',path.basename(f.url)))));assert.equal(profile.files.length,before.length+3);profile.files=before;
});
test('new passwords are required, hashed and editable; email is editable and ID is immutable',async()=>{
 const base={name:'Tài khoản kiểm thử',email:'new@example.test',role:'CanBo',permissions:[]},before=disk();assert.equal((await call('users','POST',base)).status,400);assert.equal(disk(),before);
 const created=await call('users','POST',{...base,password:'2609'});assert.equal(created.status,201);const id=created.data.item.id;assert.deepEqual(created.data.item.permissions,[]);assert.equal(created.data.item.passwordHash,undefined);const row=db.users.find(u=>u.id===id);assert.ok(row.passwordHash&&row.passwordHash.split(':').length===2&&row.passwordHash!== '2609');assert.equal((await call('auth/login','POST',{email:base.email,password:'2609'},'')).status,200);
 assert.equal((await call('users/'+id,'PATCH',{id:'FORGED'})).status,400);const hash=row.passwordHash;assert.equal((await call('users/'+id,'PATCH',{name:'Tên sửa',email:'edited@example.test'})).status,200);assert.equal(row.id,id);assert.equal(row.passwordHash,hash);
 assert.equal((await call('users/'+id,'PATCH',{password:'2710'})).status,200);assert.notEqual(row.passwordHash,hash);assert.equal((await call('auth/login','POST',{email:'edited@example.test',password:'2609'},'')).status,401);assert.equal((await call('auth/login','POST',{email:'edited@example.test',password:'2710'},'')).status,200);
 const student=db.users.find(u=>u.role==='SinhVien'&&u.studentId),profile=db.students.find(s=>s.id===student.studentId);assert.equal((await call('users/'+student.id,'PATCH',{name:'Tên đồng nhất đã sửa'})).status,200);assert.equal(profile.name,'Tên đồng nhất đã sửa');assert.equal((await call('students/'+profile.id)).data.item.name,'Tên đồng nhất đã sửa');assert.equal((await call('auth/login','POST',{email:student.email,password:'Demo@123'},'')).data.user.name,'Tên đồng nhất đã sửa');
});
test('director has only prescribed capabilities, including on direct API requests',async()=>{
 const before=disk(),u=(await call('auth/me','GET',undefined,director)).data.item;assert.deepEqual([...u.permissions].sort(),['users.manage','users.view','students.view','alumni.view','reports.view','history.view'].sort());
 for(const route of ['users','students','alumni','reports','history'])assert.equal((await call(route,'GET',undefined,director)).status,200,route);
 for(const route of ['rooms','registrations','grades','goals'])assert.equal((await call(route,'GET',undefined,director)).status,403,route);
 assert.equal((await call('students/LH001','PATCH',{name:'Forbidden'},director)).status,403);assert.equal((await call('reports','POST',{type:'Báo cáo tháng'},director)).status,403);assert.equal(disk(),before);
});
test('backend caps grants by recipient role and granting actor; existing hashes remain unchanged',async()=>{
 const before=disk();for(const [role,permissions] of [['CanBo',['users.manage']],['CanBo',['users.view']],['GiamDoc',['rooms.view']],['GiamDoc',['reports.edit']],['QuanLy',['*']]])assert.equal((await call('users','POST',{name:'Invalid',email:'invalid@example.test',role,permissions,password:'2609'})).status,400);
 assert.equal((await call('users','POST',{name:'Overgrant',email:'overgrant@example.test',role:'CanBo',permissions:['rooms.create'],password:'2609'},director)).status,403);assert.equal(disk(),before);
 const hashes=db.users.map(u=>u.passwordHash);const created=await call('users','POST',{name:'Delegated',email:'delegated@example.test',role:'QuanLy',permissions:['users.manage'],password:'2609'});assert.equal(created.status,201);const delegated=(await call('auth/login','POST',{email:'delegated@example.test',password:'2609'},'')).data.token;
 assert.equal((await call('users','POST',{name:'Escalation',email:'escalate@example.test',role:'CanBo',permissions:['students.edit'],password:'2609'},delegated)).status,403);assert.deepEqual(db.users.slice(0,hashes.length).map(u=>u.passwordHash),hashes);
});
test('status changes preserve profile and audit, and move the student to alumni without deleting it',async()=>{
 const row=db.students.find(s=>s.id==='LH002'),n=db.students.length;const r=await call('students/LH002','PATCH',{status:'Đã kết thúc hỗ trợ',endReason:'Rời trước thời hạn'});assert.equal(r.status,200);assert.equal(db.students.length,n);assert.equal(row.endReason,'Rời trước thời hạn');assert.equal(row.room,null);assert.ok((await call('alumni')).data.items.some(s=>s.id===row.id));assert.ok(db.history.some(h=>h.subject===row.id));
});

test('disk failures leave registration, support, user accounts, audit and new uploads unchanged',async()=>{
 const before=disk(),memory=structuredClone(db),files=fs.readdirSync(dir+'/uploads').sort(),rename=fs.renameSync;fs.renameSync=()=>{throw new Error('Injected persistence failure');};
 try{for(const [route,body] of [['users',{name:'Rollback',email:'rollback@example.test',role:'CanBo',permissions:[],password:'2609'}],['supports',{studentId:'LH001',name:'Rollback',type:'Y tế',amount:0,date:'2026-11-14',evidenceFile:png}],['registrations',{...valid,email:'rollback-reg@example.test',files:[png]}]]){assert.equal((await call(route,'POST',body)).status,500);assert.equal(disk(),before);assert.deepEqual(db,memory);assert.deepEqual(fs.readdirSync(dir+'/uploads').sort(),files);}assert.equal((await call('students/LH001','PATCH',{status:'Đã kết thúc hỗ trợ',endReason:'Rời trước thời hạn'})).status,500);assert.deepEqual(db,memory);assert.equal(disk(),before);}finally{fs.renameSync=rename;}
});
