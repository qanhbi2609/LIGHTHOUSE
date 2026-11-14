'use strict';
const {test,before,after}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'lighthouse-management-'));
process.env.LIGHTHOUSE_DEMO_DATASET='workflow';process.env.LIGHTHOUSE_DATA_DIR=path.join(dir,'data');process.env.LIGHTHOUSE_UPLOADS_DIR=path.join(dir,'uploads');
assert.equal(spawnSync(process.execPath,['seed.js'],{cwd:path.resolve(__dirname,'..'),env:process.env}).status,0);
const {server,db}=require('../server');let url,manager,canbo;
async function call(route,method='GET',body,token=manager){const r=await fetch(url+'/api/'+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
before(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));url='http://127.0.0.1:'+server.address().port;manager=(await call('auth/login','POST',{email:'quanly@lighthouse.test',password:'Demo@123'},'')).data.token;canbo=(await call('auth/login','POST',{email:'canbo@lighthouse.test',password:'Demo@123'},'')).data.token;});
after(async()=>{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});});
const disk=()=>fs.readFileSync(path.join(dir,'data/lighthouse.json'),'utf8');
test('UC05 creating a room validates all residents before writing and moves selected students atomically',async()=>{
 const before=disk();for(const body of [{id:'A105',capacity:6,studentIds:['LH001','MISSING']},{id:'bad name',capacity:6},{id:'A105',capacity:6,studentIds:'bad'},{id:'A105',capacity:6,studentIds:['1','2','3','4','5','6','7']}]){assert.ok((await call('rooms','POST',body)).status>=400);assert.equal(disk(),before);}
 assert.equal((await call('rooms','POST',{id:'A105',capacity:6,studentIds:['LH001']},canbo)).status,403);assert.equal(disk(),before);
 assert.equal((await call('rooms','POST',{id:'a105',capacity:6,studentIds:['LH001','LH002']})).status,201);
 assert.equal(db.students.find(s=>s.id==='LH001').room,'A105');assert.equal(db.students.find(s=>s.id==='LH002').room,'A105');
 assert.equal(db.students.filter(s=>s.room==='A101').length,0);assert.equal(db.history[0].action,'Tạo phòng');
 assert.equal((await call('rooms/A105','DELETE')).status,200);assert.equal(db.students.filter(s=>s.room==='A105').length,0);
});
test('UC06 empty return notes and unauthorized reviews do not change data; approved grades appear in profile',async()=>{
 assert.equal((await call('students/LH001')).data.item.grades.length,0);
 const before=disk();assert.equal((await call('grades/KQ001/review','PATCH',{status:'Yêu cầu gửi lại',note:' '})).status,400);assert.equal(disk(),before);
 assert.equal((await call('grades/KQ001/review','PATCH',{status:'Hợp lệ'},canbo)).status,403);assert.equal(disk(),before);
 assert.equal((await call('grades/KQ001/review','PATCH',{status:'Yêu cầu gửi lại',note:'Bổ sung bảng điểm'})).status,200);assert.equal(db.grades[0].requestNote,'Bổ sung bảng điểm');
 assert.equal((await call('grades/KQ001/review','PATCH',{status:'Hợp lệ'})).status,200);assert.equal((await call('students/LH001')).data.item.grades.length,1);
});
test('UC06 goal evaluation validates status and permissions and exposes evaluated history',async()=>{
 assert.equal((await call('students/LH001')).data.item.goals.length,0);const before=disk();
 assert.equal((await call('goals/MT001/review','PATCH',{status:'invalid'})).status,400);assert.equal(disk(),before);
 assert.equal((await call('goals/MT001/review','PATCH',{status:'Đạt'},canbo)).status,403);assert.equal(disk(),before);
 assert.equal((await call('goals/MT001/review','PATCH',{status:'Chưa đạt'})).status,200);
 assert.equal((await call('students/LH001')).data.item.goals[0].status,'Chưa đạt');
});
test('UC05/UC06 fixture upgrade is idempotent and keeps edited profiles and room assignments',()=>{
 const {applyFigmaFixture}=require('../fixtures/figma'),{upgradeUC56}=require('../fixtures/uc05-06');
 const sample=applyFigmaFixture({});sample.students[0].name='Saved profile edit';sample.students[0].room=null;sample.history=[{action:'Sửa bố trí phòng'}];
 assert.equal(upgradeUC56(sample),true);assert.equal(sample.students[0].name,'Saved profile edit');assert.equal(sample.students[0].room,null);
 assert.equal(sample.goals.filter(g=>g.status==='Chờ đánh giá').length,20);assert.equal(sample.grades.filter(g=>g.status==='Chờ xét duyệt').length,18);
 const snapshot=JSON.stringify(sample);assert.equal(upgradeUC56(sample),false);assert.equal(JSON.stringify(sample),snapshot);
});
test('UC04 image upload rejects PDF documents even when their file signature is valid',async()=>{
 const before=disk(),count=db.images.length;
 const result=await call('images','POST',{studentId:'LH001',file:{mime:'application/pdf',data:'data:application/pdf;base64,'+Buffer.from('%PDF-1.4\n%%EOF').toString('base64')}});
 assert.equal(result.status,400);assert.equal(result.data.error,'Định dạng không phù hợp!');assert.equal(db.images.length,count);assert.equal(disk(),before);
});
test('UC05 malformed room edits cannot clear residents; explicit empty selection can',async()=>{
 const before=disk(),memory=JSON.stringify(db);
 for(const body of [{},{studentIds:null},{studentIds:'LH003'},{studentIds:['LH003','MISSING']},{studentIds:['LH004']}]){
  assert.ok((await call('rooms/A102','PUT',body)).status>=400);assert.equal(disk(),before);assert.equal(JSON.stringify(db),memory);
 }
 assert.equal((await call('rooms/A102','PUT',{studentIds:[]},canbo)).status,403);assert.equal(disk(),before);
 assert.equal((await call('rooms/A102','PUT',{studentIds:[]})).status,200);assert.equal(db.students.filter(s=>s.room==='A102').length,0);
 assert.equal((await call('rooms/A102','PUT',{studentIds:['LH003']})).status,200);assert.equal(db.students.find(s=>s.id==='LH003').room,'A102');
});
test('UC06 retains original proof names and failed resubmissions leave grades and uploads unchanged',async()=>{
 const student=(await call('auth/login','POST',{email:'sinhvien@lighthouse.test',password:'Demo@123'},'')).data.token;
 const file={name:'Bang diem goc.png',mime:'image/png',data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='};
 const body={term:'II',year:'2025-2026',gpa:3.85,debts:0,rank:'Xuất sắc',certificates:'VSTEP B2'};
 const created=await call('grades','POST',{...body,evidenceFile:file},student);assert.equal(created.status,201);
 const id=created.data.item.id,proof=created.data.item.evidence;assert.equal(created.data.item.evidenceName,file.name);
 assert.equal((await call('grades/'+id+'/review','PATCH',{status:'Yêu cầu gửi lại',note:'Bổ sung bảng điểm'})).status,200);
 const before=disk(),memory=JSON.stringify(db),uploads=fs.readdirSync(process.env.LIGHTHOUSE_UPLOADS_DIR).sort();
 for(const change of [{year:''},{evidenceFile:{...file,data:'data:image/png;base64,YmFk'}},{gpa:5}]){
  assert.equal((await call('grades/'+id+'/resubmit','PATCH',{...body,...change},student)).status,400);
  assert.equal(disk(),before);assert.equal(JSON.stringify(db),memory);assert.deepEqual(fs.readdirSync(process.env.LIGHTHOUSE_UPLOADS_DIR).sort(),uploads);
 }
 assert.equal((await call('grades/'+id+'/resubmit','PATCH',body,student)).status,200);
 let row=(await call('grades')).data.items.find(g=>g.id===id);assert.equal(row.evidenceName,file.name);assert.equal(row.evidence,proof);
 assert.equal((await call('grades/'+id+'/review','PATCH',{status:'Yêu cầu gửi lại',note:'Gửi bản PDF'})).status,200);
 db.grades.find(g=>g.id===id).previewRegion=[0,0,1,1];
 const pdf={name:'Bang diem bo sung.pdf',mime:'application/pdf',data:'data:application/pdf;base64,'+Buffer.from('%PDF-1.4\n%%EOF').toString('base64')};
 assert.equal((await call('grades/'+id+'/resubmit','PATCH',{...body,evidenceFile:pdf},student)).status,200);
 row=(await call('grades')).data.items.find(g=>g.id===id);assert.equal(row.evidenceName,pdf.name);assert.notEqual(row.evidence,proof);assert.equal(row.previewRegion,undefined);
 assert.equal((await fetch(url+row.evidence)).status,200);
 assert.equal((await call('grades/'+id+'/review','PATCH',{status:'Hợp lệ'})).status,200);
 assert.equal((await call('students/LH001')).data.item.grades.find(g=>g.id===id).evidenceName,pdf.name);
});
test('UC04 UC05 UC06 share the saved student identity instead of copying screenshot names',async()=>{
 const old=db.students.find(s=>s.id==='LH001').name,name='Sinh viên kiểm thử liên UC';
 assert.equal((await call('students/LH001','PATCH',{name})).status,200);
 assert.equal((await call('students/LH001')).data.item.name,name);
 assert.equal((await call('rooms/residents')).data.items.find(s=>s.id==='LH001').name,name);
 for(const route of ['goals','grades']){
  const rows=(await call(route)).data.items.filter(g=>g.studentId==='LH001');assert.ok(rows.length);assert.ok(rows.every(g=>g.studentName===name));
 }
 assert.equal((await call('students/LH001','PATCH',{name:old})).status,200);
});
