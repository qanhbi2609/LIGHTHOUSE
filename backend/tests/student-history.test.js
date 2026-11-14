'use strict';
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'lighthouse-student-history-'));
Object.assign(process.env,{LIGHTHOUSE_DEMO_DATASET:'workflow',LIGHTHOUSE_DATA_DIR:dir+'/data',LIGHTHOUSE_UPLOADS_DIR:dir+'/uploads'});
const {server,db}=require('../server');let base,manager,student,other,unlinked,goalId,gradeId;
const body={term:'II',year:'2025-2026',gpa:0,rank:'Chưa xếp loại',debts:0,certificates:''};
const png={name:'Bang diem.png',mime:'image/png',data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='};
async function call(route,method='GET',body,token=manager){const r=await fetch(base+'/api/'+route,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
const snapshot=()=>({disk:fs.readFileSync(dir+'/data/lighthouse.json','utf8'),memory:JSON.stringify(db),uploads:fs.readdirSync(dir+'/uploads').sort()});
before(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
 manager=(await call('auth/login','POST',{email:'quanly@lighthouse.test',password:'Demo@123'},'')).data.token;
 student=(await call('auth/login','POST',{email:'sinhvien@lighthouse.test',password:'Demo@123'},'')).data.token;
 db.users.push({...db.users.find(u=>u.id==='ND003'),id:'OTHER',name:'Other student',email:'other@example.test',studentId:'LH002'});
 other=(await call('auth/login','POST',{email:'other@example.test',password:'Demo@123'},'')).data.token;
 const u=await call('users','POST',{name:'Unlinked',email:'unlinked@example.test',role:'SinhVien',permissions:[],password:'Demo@123'});assert.equal(u.status,201);
 unlinked=(await call('auth/login','POST',{email:'unlinked@example.test',password:'Demo@123'},'')).data.token;
});
after(async()=>{await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});});
test('UC10 validates actual dates, sorts audit rows, includes end-day records and protects access',async()=>{
 db.history.push({id:'H-A',time:'2026-11-05T00:00:00Z',actor:'Saved actor',action:'Test',subject:'A'},{id:'H-B',time:'2026-11-05T23:59:59Z',actor:'Saved actor',action:'Test',subject:'B'},{id:'H-C',time:'2026-11-04T23:59:59Z',actor:'Other',action:'Test',subject:'C'});
 const before=snapshot();
 assert.deepEqual((await call('history?from=2026-11-05&to=2026-11-05')).data.items.map(x=>x.id),['H-B','H-A']);
 for(const query of ['from=2026-02-30','from=2026-12-01&to=2026-11-01'])assert.equal((await call('history?'+query)).status,400);
 assert.deepEqual((await call('history?from=2100-01-01&to=2100-01-31')).data.items,[]);assert.equal((await call('history','GET',undefined,student)).status,403);assert.deepEqual(snapshot(),before);
});
test('UC11 goal resubmission validates atomically, keeps long plans and records the prior revision',async()=>{
 const detail='Kế hoạch học tập và phát triển cá nhân.\n'.repeat(80).trim(),created=await call('goals','POST',{name:'Mục tiêu mới',detail,studentId:'LH002'},student);assert.equal(created.status,201);goalId=created.data.item.id;assert.equal(created.data.item.studentId,'LH001');assert.equal(created.data.item.detail,detail);
 assert.equal((await call('goals/'+goalId+'/review','PATCH',{status:'Chờ bổ sung',feedback:'Bổ sung thời hạn'})).status,200);
 const before=snapshot();assert.equal((await call('goals/'+goalId+'/resubmit','PATCH',{name:'Must not change',detail:''},student)).status,400);assert.deepEqual(snapshot(),before);
 assert.equal((await call('goals/'+goalId+'/resubmit','PATCH',{name:'Other cannot change',detail:'No'},other)).status,403);assert.deepEqual(snapshot(),before);
 assert.equal((await call('goals/'+goalId+'/resubmit','PATCH',{name:'Mục tiêu đầy đủ',detail,feedback:'Forged',status:'Đạt'},student)).status,200);
 const row=db.goals.find(g=>g.id===goalId);assert.equal(row.status,'Chờ đánh giá');assert.equal(row.feedback,'Bổ sung thời hạn');assert.equal(db.goalRevisions.at(-1).before.name,'Mục tiêu mới');assert.equal(db.goalRevisions.at(-1).goalId,goalId);
});
test('UC11 rejects missing GPA, debt count or rank but accepts zero and preserves requested grade revisions',async()=>{
 const before=snapshot();for(const invalid of [{gpa:''},{gpa:null},{gpa:5},{debts:''},{debts:1.5},{debts:-1},{rank:''},{evidenceFile:{...png,data:'data:image/png;base64,YmFk'}}]){assert.equal((await call('grades','POST',{...body,...invalid},student)).status,400);assert.deepEqual(snapshot(),before);}
 const created=await call('grades','POST',{...body,studentId:'LH002',evidenceFile:png},student);assert.equal(created.status,201);gradeId=created.data.item.id;assert.equal(created.data.item.studentId,'LH001');assert.equal(created.data.item.gpa,0);
 assert.equal((await call('grades/'+gradeId+'/review','PATCH',{status:'Yêu cầu gửi lại',note:'Bổ sung chứng chỉ'})).status,200);
 const original=structuredClone(db.grades.find(g=>g.id===gradeId)),failed=snapshot();
 assert.equal((await call('grades/'+gradeId+'/resubmit','PATCH',{...body,evidenceFile:{...png,data:'bad'}},student)).status,400);assert.deepEqual(snapshot(),failed);
 assert.equal((await call('grades/'+gradeId+'/resubmit','PATCH',{...body,gpa:3.85,certificates:'B2',requestNote:'Forged',status:'Hợp lệ'},student)).status,200);
 const row=db.grades.find(g=>g.id===gradeId);assert.equal(row.status,'Chờ xét duyệt');assert.equal(row.requestNote,'Bổ sung chứng chỉ');assert.equal(row.evidence,original.evidence);assert.deepEqual(db.gradeRevisions.at(-1).before,original);
});
test('UC11 authenticated ownership and canonical profile names hold for students including unlinked accounts',async()=>{
 const foreign=await call('grades','POST',body,other);assert.equal(foreign.status,201);
 const own=(await call('grades','GET',undefined,student)).data.items;assert.ok(own.every(g=>g.studentId==='LH001'));assert.ok(!own.some(g=>g.id===foreign.data.item.id));
 assert.equal((await call('grades/'+gradeId+'/resubmit','PATCH',body,other)).status,403);assert.equal((await call('students/LH002','GET',undefined,student)).status,403);
 db.goals.push({id:'ORPHAN',studentId:null});db.grades.push({id:'ORPHAN',studentId:null});
 for(const route of ['goals','grades'])assert.deepEqual((await call(route,'GET',undefined,unlinked)).data.items,[]);
 const profile=db.students.find(s=>s.id==='LH001');assert.equal((await call('auth/me','GET',undefined,student)).data.item.name,profile.name);
 assert.equal(db.history.find(h=>h.action==='Gửi kết quả học tập'&&h.subject===gradeId).actor,profile.name);
});
test('UC11 paused profiles can read their submitted data but cannot send new or revised data',async()=>{
 await call('goals/'+goalId+'/review','PATCH',{status:'Chờ bổ sung',feedback:'Bổ sung'});await call('grades/'+gradeId+'/review','PATCH',{status:'Yêu cầu gửi lại',note:'Bổ sung'});
 await call('students/LH001','PATCH',{status:'Tạm dừng hỗ trợ'});const before=snapshot();
 for(const [route,method,payload] of [['goals','POST',{name:'No',detail:'No'}],['grades','POST',body],['goals/'+goalId+'/resubmit','PATCH',{name:'No',detail:'No'}],['grades/'+gradeId+'/resubmit','PATCH',body]])assert.equal((await call(route,method,payload,student)).status,403);
 assert.equal((await call('grades','GET',undefined,student)).status,200);assert.deepEqual(snapshot(),before);await call('students/LH001','PATCH',{status:'Đang hỗ trợ'});
});
test('UC11 disk failures roll back goals, grades, revisions, history and new proof files',async()=>{
 const before=snapshot(),rename=fs.renameSync;fs.renameSync=(from,to)=>{if(to===dir+'/data/lighthouse.json')throw new Error('Synthetic student write failure');return rename(from,to);};
 try{for(const [route,method,payload] of [['goals','POST',{name:'No',detail:'No'}],['grades','POST',{...body,evidenceFile:png}],['goals/'+goalId+'/resubmit','PATCH',{name:'No',detail:'No'}],['grades/'+gradeId+'/resubmit','PATCH',{...body,evidenceFile:png}]]){assert.equal((await call(route,method,payload,student)).status,500);assert.deepEqual(snapshot(),before);}}finally{fs.renameSync=rename;}
});
