'use strict';
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'lighthouse-figma-'));
process.env.LIGHTHOUSE_DATA_DIR=path.join(dir,'data');process.env.LIGHTHOUSE_UPLOADS_DIR=path.join(dir,'uploads');
process.env.DEMO_ONLY='1';process.env.LIGHTHOUSE_DEMO_DATASET='figma';
const cwd=path.resolve(__dirname,'..');
// A pre-existing database, including its edits, must not be replaced by the new demo.
assert.equal(spawnSync(process.execPath,['seed.js'],{cwd,env:{...process.env,LIGHTHOUSE_DEMO_DATASET:'workflow'}}).status,0);
const original=fs.readFileSync(path.join(dir,'data/lighthouse.json'),'utf8');
const {server,db}=require('../server');let url,token;
async function request(endpoint,options={}){
 const r=await fetch(url+endpoint,{...options,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...options.headers}});
 return {status:r.status,data:await r.json()};
}
before(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));url='http://127.0.0.1:'+server.address().port;
 token=(await request('/api/auth/login',{method:'POST',body:JSON.stringify({email:'quanly@lighthouse.test',password:'Demo@123'})})).data.token;
});
after(async()=>{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});});
test('Figma demo uses a separate persistent file and preserves previous workflow data',()=>{
 assert.equal(fs.readFileSync(path.join(dir,'data/lighthouse.json'),'utf8'),original);
 assert.ok(fs.existsSync(path.join(dir,'data/figma-demo-v1.json')));
 for(const kind of ['family','grades','invoice'])assert.deepEqual(fs.readFileSync(path.join(dir,'uploads',`figma-${kind}.png`)).subarray(0,8),Buffer.from('89504e470d0a1a0a','hex'));
});
test('UC03 and UC04 demo data match screenshot rows, counts and related profile tables',async()=>{
 const regs=(await request('/api/registrations')).data.items;
 assert.deepEqual(['Chờ kiểm tra','Chờ bổ sung','Đạt yêu cầu'].map(status=>regs.filter(r=>r.status===status).length),[12,8,4]);
 assert.deepEqual(regs.slice(0,7).map(r=>r.name),['Bùi Bích Phương','Vũ Thảo My','Lâm Bảo Ngọc','Khương Hoàn Mỹ','Nguyễn Lê Ngọc Ánh Sáng','Đào Di Quân','Phương Mỹ Chi']);
 assert.deepEqual(regs.slice(0,7).map(r=>r.created),['2026-10-21','2026-10-06','2026-09-27','2026-09-13','2026-08-24','2026-08-09','2026-07-18']);
 assert.equal(regs[5].dob,'1999-06-01');assert.equal(regs[5].documents.length,3);
 const students=(await request('/api/students')).data.items;
 assert.equal(students.length,35);assert.equal(new Set(students.map(s=>s.id)).size,35);
 assert.deepEqual(students.slice(0,3).map(s=>s.name),['Mai Hồng Ngọc','Nguyễn Khoa Tóc Tiên','Vũ Cát Tường']);
 const s=(await request('/api/students/LH001')).data.item;
 assert.equal(s.name,'Mai Hồng Ngọc');assert.equal(s.cohort,'2023-2027');assert.equal(s.files.length,1);assert.equal(db.students.find(x=>x.id==='LH001').files.length,2);assert.ok(s.files.every(f=>f.url));
 assert.deepEqual(s.grades.map(g=>g.gpa),['3.85','3.72','3.68','3.60']);
 assert.equal(s.goals[1].name,'Thành thạo Python');assert.ok(s.goals.every(g=>g.status==='Đạt'));
 assert.deepEqual(s.supports.map(x=>x.amount),[8500000,1500000,520000,1800000]);
 assert.equal(s.supports[1].endDate,'2026-10-31');
 assert.ok(db.rooms.every(r=>db.students.filter(s=>s.room===r.id).length<=6));
 const proof=await fetch(url+s.files[0].url);assert.equal(proof.status,200);assert.match(proof.headers.get('content-type'),/^image\/png/);
});
test('Restarting the comparison demo preserves saved edits instead of reseeding each startup',async()=>{
 const changed=await request('/api/students/LH001',{method:'PATCH',body:JSON.stringify({name:'Edited comparison profile'})});assert.equal(changed.status,200);
 const file=path.join(dir,'data/figma-demo-v1.json'),before=fs.readFileSync(file,'utf8');
 assert.equal(spawnSync(process.execPath,['seed.js'],{cwd,env:process.env}).status,0);
 assert.equal(fs.readFileSync(file,'utf8'),before);
 assert.equal(fs.readFileSync(path.join(dir,'data/lighthouse.json'),'utf8'),original);
});
test('UC04 updated reference gallery is idempotent and preserves team edits and existing images',()=>{
 const {upgradeUC34}=require('../fixtures/uc03-04-update');
 const base=()=>({demoFixture:{},students:[{id:'LH001',name:'Mai Hồng Ngọc'}],images:[],history:[],studentRevisions:[]});
 const fresh=base();assert.equal(upgradeUC34(fresh),true);assert.equal(fresh.images.length,11);assert.equal(upgradeUC34(fresh),false);assert.equal(fresh.images.length,11);
 for(const edited of [Object.assign(base(),{images:[{id:'HA001',studentId:'LH001',url:'/uploads/user.png'}]}),Object.assign(base(),{studentRevisions:[{studentId:'LH001'}]}),Object.assign(base(),{history:[{subject:'LH001',action:'Xóa ảnh'}]})]){
  const before=structuredClone({...edited,demoFixture:{}});upgradeUC34(edited);assert.deepEqual(edited.images,before.images);assert.deepEqual(edited.students,before.students);
 }
});
