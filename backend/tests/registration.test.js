'use strict';
process.env.LIGHTHOUSE_DEMO_DATASET='workflow';
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'lighthouse-registration-'));
process.env.LIGHTHOUSE_DATA_DIR=path.join(dir,'data');process.env.LIGHTHOUSE_UPLOADS_DIR=path.join(dir,'uploads');
assert.equal(spawnSync(process.execPath,['seed.js'],{cwd:path.resolve(__dirname,'..'),env:process.env}).status,0);
const {server,db}=require('../server');let url;
const valid={name:'Synthetic applicant',email:'applicant@example.test',phone:'0901234567',school:'Chưa chọn',major:'Chưa chọn',dob:'2006-01-15',cccd:'001001000001'};
const file={mime:'image/png',data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='};
before(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));url='http://127.0.0.1:'+server.address().port;});
after(async()=>{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});});
async function post(body){const r=await fetch(url+'/api/registrations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
test('UC02 stores distinct family and school proof groups and preserves long descriptions',async()=>{
 const description='Synthetic study plan. '.repeat(80).trim();
 const r=await post({...valid,description,familyFiles:[file],schoolFiles:[file]});assert.equal(r.status,201);
 const item=r.data.item;assert.equal(item.description,description);assert.equal(item.files.length,2);assert.equal(item.familyFiles.length,1);assert.equal(item.schoolFiles.length,1);
 assert.notEqual(item.familyFiles[0],item.schoolFiles[0]);assert.equal(db.registrations.find(x=>x.id===item.id).description,description);
 assert.equal(fs.readdirSync(process.env.LIGHTHOUSE_UPLOADS_DIR).length,2);
 assert.equal((await post({...valid,email:'APPLICANT@EXAMPLE.TEST'})).status,409);
});
test('UC02 rejects invalid supplied identity fields and oversized file lists before saving',async()=>{
 const count=db.registrations.length;
 for(const patch of [{phone:'123'},{cccd:'123'},{dob:'2006-02-30'},{dob:'2999-01-01'},{familyFiles:'bad'},{familyFiles:Array(7).fill(file)}])assert.equal((await post({...valid,email:'invalid@example.test',...patch})).status,400);
 assert.equal(db.registrations.length,count);assert.equal(fs.readdirSync(process.env.LIGHTHOUSE_UPLOADS_DIR).length,2);
});
test('UC02 invalid second proof rolls back new upload without deleting existing proofs',async()=>{
 const count=db.registrations.length;
 const r=await post({...valid,email:'invalid-proof@example.test',familyFiles:[file],schoolFiles:[{mime:'image/png',data:'data:image/png;base64,aW52YWxpZA=='}]});
 assert.equal(r.status,400);assert.equal(db.registrations.length,count);assert.equal(fs.readdirSync(process.env.LIGHTHOUSE_UPLOADS_DIR).length,2);
});
test('UC02 combined evidence preserves names, files and a neutral group without changing older registrations',async()=>{
 const old=JSON.stringify(db.registrations);
 const r=await post({...valid,email:'combined@example.test',evidenceMode:'combined',files:[{...file,name:'hoan-canh.png'},{...file,name:'hoc-ba.png'}]});
 assert.equal(r.status,201);assert.deepEqual(r.data.item.documents.map(d=>d.group),['general','general']);
 assert.deepEqual(r.data.item.documents.map(d=>d.name),['hoan-canh.png','hoc-ba.png']);
 assert.equal(r.data.item.files.length,2);assert.deepEqual(r.data.item.familyFiles,[]);assert.deepEqual(r.data.item.schoolFiles,[]);
 assert.equal(JSON.stringify(db.registrations.slice(0,-1)),old);
 const saved=JSON.parse(fs.readFileSync(path.join(dir,'data/lighthouse.json'),'utf8')).registrations.at(-1);
 assert.deepEqual(saved.documents,r.data.item.documents);
});
