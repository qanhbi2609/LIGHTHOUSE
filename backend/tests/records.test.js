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
 assert.equal((await request('registrations/HS005','PATCH',{status:'Chờ bổ sung',note:''})).status,400);
 assert.equal(fs.readFileSync(path.join(process.env.LIGHTHOUSE_DATA_DIR,'lighthouse.json'),'utf8'),before);
 assert.equal((await request('registrations/HS005','PATCH',{status:'Chờ bổ sung',note:'Cần giấy tờ học tập'})).status,200);
 assert.equal((await request('registrations/HS005/accept','POST')).status,400);
 assert.equal((await request('registrations/HS005','PATCH',{status:'Đạt yêu cầu'},canbo)).status,403);
});
test('UC03 acceptance exposes original proof metadata in UC04 and prevents duplicate intake',async()=>{
 const file={name:'Synthetic proof.png',mime:'image/png',data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='};
 const reg=await request('registrations','POST',{name:'Synthetic applicant',email:'records-proof@example.test',phone:'0901234567',school:'Test school',major:'Test major',familyFiles:[file],schoolFiles:[{...file,name:'Synthetic school.png'}]});assert.equal(reg.status,201);
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
