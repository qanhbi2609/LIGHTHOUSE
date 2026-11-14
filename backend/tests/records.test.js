'use strict';
process.env.LIGHTHOUSE_DEMO_DATASET='workflow';
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'lighthouse-records-'));
process.env.LIGHTHOUSE_DATA_DIR=path.join(dir,'data');process.env.LIGHTHOUSE_UPLOADS_DIR=path.join(dir,'uploads');
assert.equal(spawnSync(process.execPath,['seed.js'],{cwd:path.resolve(__dirname,'..'),env:process.env}).status,0);
const {server,db}=require('../server');let url,manager,canbo;
async function request(endpoint,method='GET',body,token=manager){const r=await fetch(url+'/api/'+endpoint,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
before(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));url='http://127.0.0.1:'+server.address().port;
 manager=(await request('auth/login','POST',{email:'quanly@lighthouse.test',password:'Demo@123'},'')).data.token;
 canbo=(await request('auth/login','POST',{email:'canbo@lighthouse.test',password:'Demo@123'},'')).data.token;
});
after(async()=>{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});});
test('UC03 review validates supplement notes before changing state or history',async()=>{
 const before=fs.readFileSync(path.join(process.env.LIGHTHOUSE_DATA_DIR,'lighthouse.json'),'utf8');
 assert.equal((await request('registrations/HS005','PATCH',{dob:'2006-01-15',hometown:'Đà Nẵng',address:'Địa chỉ kiểm thử',cccd:'001001000001',family:'Hoàn cảnh kiểm thử',description:'Kế hoạch học tập kiểm thử',status:'Chờ bổ sung',note:''})).status,400);
 assert.equal(fs.readFileSync(path.join(process.env.LIGHTHOUSE_DATA_DIR,'lighthouse.json'),'utf8'),before);
 assert.equal((await request('registrations/HS005','PATCH',{dob:'2006-01-15',hometown:'Đà Nẵng',address:'Địa chỉ kiểm thử',cccd:'001001000001',family:'Hoàn cảnh kiểm thử',description:'Kế hoạch học tập kiểm thử',status:'Chờ bổ sung',note:'Cần giấy tờ học tập'})).status,200);
 assert.equal((await request('registrations/HS005/accept','POST')).status,400);
 assert.equal((await request('registrations/HS005','PATCH',{status:'Đạt yêu cầu'},canbo)).status,403);
});
test('UC03 acceptance exposes original proof metadata in UC04 and prevents duplicate intake',async()=>{
 const file={name:'Synthetic proof.png',mime:'image/png',data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='};
 const reg=await request('registrations','POST',{dob:'2006-01-15',hometown:'Đà Nẵng',address:'Địa chỉ kiểm thử',cccd:'001001000001',family:'Hoàn cảnh kiểm thử',description:'Kế hoạch học tập kiểm thử',name:'Synthetic applicant',email:'records-proof@example.test',phone:'0901234567',school:'Test school',major:'Test major',familyFiles:[file],schoolFiles:[{...file,name:'Synthetic school.png'}]});assert.equal(reg.status,201);
 const id=reg.data.item.id;
 assert.equal((await request('registrations/'+id,'PATCH',{status:'Đạt yêu cầu'})).status,200);
 const accepted=await request('registrations/'+id+'/accept','POST');assert.equal(accepted.status,201);
 const detail=await request('students/'+accepted.data.item.id);assert.equal(detail.status,200);
 assert.deepEqual(detail.data.item.files.map(f=>f.name),['Synthetic proof.png','Synthetic school.png']);
 assert.deepEqual(detail.data.item.files.map(f=>f.group),['family','school']);
 assert.equal((await request('registrations/'+id+'/accept','POST')).status,409);
 assert.equal((await request('registrations/'+id,'PATCH',{status:'Từ chối'})).status,409);
});
test('UC04 invalid changes are atomic; valid edits keep a full prior revision',async()=>{
 const original=JSON.parse(JSON.stringify(db.students.find(s=>s.id==='LH001')));
 const previousRevisions=db.studentRevisions?.length||0;
 for(const body of [{name:'Must not persist',email:'bad'},{name:'Must not persist',status:'invalid'},{phone:'bad'},{dob:'2006-02-30'},{cccd:'123'}])assert.equal((await request('students/LH001','PATCH',body)).status,400);
 assert.deepEqual(db.students.find(s=>s.id==='LH001'),original);
 assert.equal(db.studentRevisions?.length||0,previousRevisions);
 assert.equal((await request('students/LH001','PATCH',{name:'Forbidden change'},canbo)).status,403);
 const edited=await request('students/LH001','PATCH',{name:'Updated synthetic name',phone:'0901234567'});assert.equal(edited.status,200);
 assert.deepEqual(db.studentRevisions.at(-1).before,original);
 assert.equal(db.studentRevisions.at(-1).studentId,'LH001');
 assert.equal(db.history[0].subject,'LH001');
});
test('UC04 support validates before writes, enforces grants and saves the original invoice',async()=>{
 const png={name:'Original invoice.png',mime:'image/png',data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='};
 const file=path.join(process.env.LIGHTHOUSE_DATA_DIR,'lighthouse.json');
 const snapshot=()=>({db:fs.readFileSync(file,'utf8'),uploads:fs.readdirSync(process.env.LIGHTHOUSE_UPLOADS_DIR).sort()});
 const before=snapshot();
 for(const body of [{name:''},{name:'Invalid',amount:-1},{name:'Invalid',amount:'NaN'},{name:'Invalid',date:'2026-02-30'},{name:'Invalid',evidenceFile:{...png,data:'data:image/png;base64,YmFk'}}]){
  assert.equal((await request('supports','POST',{studentId:'LH001',...body})).status,400);assert.deepEqual(snapshot(),before);
 }
 assert.equal((await request('supports','POST',{studentId:'LH001',name:'Forbidden',evidenceFile:png},canbo)).status,403);assert.deepEqual(snapshot(),before);
 const created=await request('supports','POST',{studentId:'LH001',name:'Synthetic tuition',type:'Học phí',amount:8500000,date:'2026-11-14',evidenceFile:png});
 assert.equal(created.status,201);assert.equal(created.data.item.evidenceName,png.name);
 const detail=(await request('students/LH001')).data.item;
 const row=detail.supports.find(s=>s.id===created.data.item.id);assert.equal(row.amount,8500000);assert.equal(row.date,'2026-11-14');
 const proof=await fetch(url+row.evidence);assert.equal(proof.status,200);assert.deepEqual(Buffer.from(await proof.arrayBuffer()),Buffer.from(png.data.split(',')[1],'base64'));
 assert.equal(db.history[0].action,'Thêm hỗ trợ');assert.equal(db.history[0].subject,'LH001');
});
test('UC04 deleting a reference image preserves the asset still used by another profile',async()=>{
 const file={mime:'image/png',data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='};
 const created=await request('images','POST',{studentId:'LH001',file});assert.equal(created.status,201);
 db.images.push({...created.data.item,id:'SHARED-PROOF',studentId:'LH002'});
 assert.equal((await request('images/'+created.data.item.id,'DELETE')).status,200);
 assert.equal((await fetch(url+created.data.item.url)).status,200);
 assert.ok(db.images.some(i=>i.id==='SHARED-PROOF'));
});
