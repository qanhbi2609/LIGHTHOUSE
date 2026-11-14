'use strict';
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'lighthouse-auth-'));
Object.assign(process.env,{LIGHTHOUSE_DATA_DIR:dir+'/data',LIGHTHOUSE_UPLOADS_DIR:dir+'/uploads',LIGHTHOUSE_DEMO_DATASET:'workflow',DEMO_ONLY:'1'});
const {server,db}=require('../server');let url;
async function post(endpoint,body){const r=await fetch(url+'/api/auth/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
const disk=()=>fs.readFileSync(dir+'/data/lighthouse.json','utf8');
before(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));url='http://127.0.0.1:'+server.address().port;});
after(async()=>{await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});});
test('UC01 missing credentials use the required shared inline error contract',async()=>{
 const before=disk();for(const body of [{},{email:'quanly@lighthouse.test'},{password:'Demo@123'},{email:'  ',password:'Demo@123'}]){const r=await post('login',body);assert.equal(r.status,400);assert.equal(r.data.error,'Vui lòng không để trống thông tin');}assert.equal(disk(),before);
});
test('UC01 syntax and unknown or inactive email use the requested email error',async()=>{
 for(const email of ['bad','missing@example.test']){const r=await post('login',{email,password:'Demo@123'});assert.equal(r.status,401);assert.equal(r.data.error,'Email không hợp lệ');}
});
test('UC01 a real account with wrong password cannot authenticate',async()=>{const r=await post('login',{email:'quanly@lighthouse.test',password:'wrong'});assert.equal(r.status,401);assert.equal(r.data.error,'Email hoặc mật khẩu sai!');});
test('UC01 all removed recovery endpoints reject old links/tokens without mutation',async()=>{
 const before=disk(),memory=structuredClone(db);for(const endpoint of ['forgot','verify','reset'])for(const method of ['POST','GET']){const r=await fetch(url+'/api/auth/'+endpoint,{method,...(method==='POST'?{headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'quanly@lighthouse.test',resetToken:'old-token',password:'Changed@123'})}:{})});assert.equal(r.status,410);}assert.equal(disk(),before);assert.deepEqual(db,memory);
});
test('UC01 all existing demo roles can still authenticate using unchanged password hashes',async()=>{
 const before=disk();for(const email of ['quanly','giamdoc','canbo','sinhvien']){const r=await post('login',{email:email+'@lighthouse.test',password:'Demo@123'});assert.equal(r.status,200);assert.ok(r.data.token);assert.equal(r.data.user.passwordHash,undefined);}assert.equal(disk(),before);
});
