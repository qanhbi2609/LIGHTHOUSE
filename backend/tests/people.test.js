'use strict';
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'lighthouse-people-'));
Object.assign(process.env,{LIGHTHOUSE_DEMO_DATASET:'figma',LIGHTHOUSE_DATA_DIR:dir+'/data',LIGHTHOUSE_UPLOADS_DIR:dir+'/uploads'});
const {server,db}=require('../server');let base,manager;
async function call(route,method='GET',body,token=manager){const r=await fetch(base+'/api/'+route,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
const disk=()=>fs.readFileSync(dir+'/data/figma-demo-v1.json','utf8');
before(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;manager=(await call('auth/login','POST',{email:'quanly@lighthouse.test',password:'Demo@123'},'')).data.token;});
after(async()=>{await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});});
async function account(permissions,role='CanBo'){
 const email='qa'+Math.random()+'@example.test',result=await call('users','POST',{name:'QA',email,role,permissions,password:'Demo@123'});assert.equal(result.status,201);
 return {id:result.data.item.id,token:(await call('auth/login','POST',{email,password:'Demo@123'},'')).data.token};
}
test('UC07 canonical profiles, email search and alumni-only authorization retain history',async()=>{
 const alumni=(await call('alumni')).data.items;assert.equal(alumni.length,20);
 assert.equal(new Set(db.students.map(s=>s.id)).size,db.students.length);
 const tu=alumni.find(s=>s.name==='Trần Cẩm Tú');assert.equal(tu.id,'LH034');assert.equal(alumni.find(s=>s.id==='LH023').name,'Phạm Thị Ngọc');
 const viewer=await account(['alumni.view']);
 assert.equal((await call('students','GET',undefined,viewer.token)).status,403);
 assert.equal((await call('students/LH001','GET',undefined,viewer.token)).status,403);
 const detail=await call('students/'+tu.id,'GET',undefined,viewer.token);assert.equal(detail.status,200);assert.equal(detail.data.item.name,tu.name);assert.equal(detail.data.item.email,tu.email);
 assert.equal(detail.data.item.grades.length,8);assert.equal(detail.data.item.goals.length,6);assert.equal(detail.data.item.supports.length,4);assert.equal(detail.data.item.images.length,11);
 assert.equal((await call('alumni?q='+tu.email)).data.items[0].id,tu.id);assert.equal((await call('alumni?q=missing')).data.items.length,0);
 assert.ok(db.rooms.every(r=>r.capacity===6&&db.students.filter(s=>s.room===r.id).length<=6));
});
test('UC08 invalid payloads are atomic and cannot grant manager rights to other roles',async()=>{
 const before=disk();
 for(const body of [{name:' ',email:'valid@example.test',role:'CanBo',permissions:[]},{name:'Valid',email:'bad',role:'CanBo',permissions:[]},{name:'Valid',email:'valid@example.test',role:'CanBo',permissions:['*']},{name:'Valid',email:'valid@example.test',role:'CanBo',permissions:['users.manage']},{name:'Valid',email:'valid@example.test',role:'QuanLy',permissions:['unknown']}]){
  assert.equal((await call('users','POST',body)).status,400);assert.equal(disk(),before);
 }
 const result=await account(['alumni.view']);const current=disk();
 assert.equal((await call('users/'+result.id,'PATCH',{permissions:['rooms.create'],name:' '})).status,400);assert.equal(disk(),current);
 assert.equal((await call('users/ND001','PATCH',{permissions:[]})).status,400);assert.equal(disk(),current);
 assert.equal((await call('users','POST',{name:'Duplicate',email:db.users[0].email.toUpperCase(),role:'CanBo',permissions:[]})).status,409);assert.equal(disk(),current);
});
test('UC08 fourteen choices enforce room actions separately and revoke live session grants',async()=>{
 const actor=await account(['rooms.create']);
 assert.equal((await call('rooms','GET',undefined,actor.token)).status,200);
 const residents=await call('rooms/residents','GET',undefined,actor.token);assert.equal(residents.status,200);assert.deepEqual(Object.keys(residents.data.items[0]).sort(),['id','name','room','status']);
 assert.equal((await call('students','GET',undefined,actor.token)).status,403);
 assert.equal((await call('rooms','POST',{id:'QA01',capacity:6},actor.token)).status,201);
 assert.equal((await call('rooms/QA01','PUT',{studentIds:[]},actor.token)).status,403);
 assert.equal((await call('rooms/QA01','DELETE',undefined,actor.token)).status,403);
 await call('users/'+actor.id,'PATCH',{permissions:['rooms.delete']});
 assert.equal((await call('rooms','POST',{id:'QA02',capacity:6},actor.token)).status,403);
 assert.equal((await call('rooms/QA01','DELETE',undefined,actor.token)).status,200);
 await call('users/'+actor.id,'DELETE');
 assert.equal((await call('auth/me','GET',undefined,actor.token)).status,401);
 const stored=db.users.find(u=>u.id===actor.id);assert.deepEqual(stored.permissions,[]);assert.equal(stored.active,false);assert.equal(db.history[0].action,'Xóa phân quyền');
});
test('UC08 delegated management is role-restricted, reads are separate and alumni edit cannot change personal data',async()=>{
 const delegated=await account(['users.manage'],'QuanLy');assert.equal((await call('users','GET',undefined,delegated.token)).status,200);
 const viewer=await account(['users.view'],'QuanLy');assert.equal((await call('users','GET',undefined,viewer.token)).status,200);assert.equal((await call('users/ND002','DELETE',undefined,viewer.token)).status,403);
 const editor=await account(['alumni.edit']);const before=disk();
 assert.equal((await call('students/LH032','PATCH',{name:'Unexpected'},editor.token)).status,403);assert.equal(disk(),before);
 assert.equal((await call('students/LH032','PATCH',{status:'Đã kết thúc hỗ trợ',endReason:'Đã tốt nghiệp'},editor.token)).status,200);
});
test('UC07/08 migration preserves edits and is repeatable',()=>{
 const {applyFigmaFixture}=require('../fixtures/figma'),{upgradeUC56}=require('../fixtures/uc05-06'),{upgradeUC78}=require('../fixtures/uc07-08');
 const sample=applyFigmaFixture({users:db.users.slice(0,4)});upgradeUC56(sample);sample.students.find(s=>s.id==='LH015').name='Saved edit';sample.students.find(s=>s.id==='LH013').room='A103';
 const first=JSON.stringify(sample.students[0]),grants=JSON.stringify(sample.users[0]);assert.equal(upgradeUC78(sample),true);assert.equal(sample.students.find(s=>s.id==='LH015').name,'Saved edit');assert.equal(sample.students.find(s=>s.id==='LH013').room,'A103');assert.equal(JSON.stringify(sample.students[0]),first);assert.equal(JSON.stringify(sample.users[0]),grants);
 const snapshot=JSON.stringify(sample);assert.equal(upgradeUC78(sample),false);assert.equal(JSON.stringify(sample),snapshot);
});
