'use strict';
const {test,before,after,beforeEach}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'lighthouse-auth-'));
process.env.LIGHTHOUSE_DATA_DIR=path.join(dir,'data');
process.env.LIGHTHOUSE_UPLOADS_DIR=path.join(dir,'uploads');
process.env.DEMO_ONLY='1';
process.env.LIGHTHOUSE_DEMO_DATASET='workflow';
const seeded=spawnSync(process.execPath,['seed.js'],{cwd:path.resolve(__dirname,'..'),env:process.env,encoding:'utf8'});
assert.equal(seeded.status,0);
const {server,db}=require('../server');
const email='sinhvien@lighthouse.test';
let url;
async function post(endpoint,body){const response=await fetch(url+'/api/auth/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:response.status,data:await response.json()};}
before(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));url='http://127.0.0.1:'+server.address().port;});
beforeEach(()=>{db.otps=[];});
after(async()=>{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});});

test('UC01 missing recovery email shows the Design notice without creating a code',async()=>{
 const before=fs.readFileSync(path.join(process.env.LIGHTHOUSE_DATA_DIR,'lighthouse.json'),'utf8');
 const result=await post('forgot',{email:'missing@example.test'});assert.equal(result.status,404);assert.equal(result.data.error,'Kiểm tra lại địa chỉ Email');
 assert.equal(fs.readFileSync(path.join(process.env.LIGHTHOUSE_DATA_DIR,'lighthouse.json'),'utf8'),before);assert.equal(db.otps.length,0);
});

test('UC01 issues four digits, masks recipient and enforces resend cooldown',async()=>{
 const issued=await post('forgot',{email});assert.equal(issued.status,200);assert.match(issued.data.demoCode,/^\d{4}$/);
 assert.equal(issued.data.maskedEmail,'si**@lighthouse.test');assert.equal(issued.data.resendAfter,60);
 assert.equal((await post('forgot',{email})).status,429);
 const old=issued.data.demoCode;db.otps[0].resendAt=0;
 assert.equal((await post('forgot',{email})).status,200);assert.equal(db.otps.length,1);
 assert.equal(db.otps[0].attempts,0);assert.ok(!JSON.stringify(db.otps).includes('"'+old+'"'));
});
test('UC01 distinguishes invalid and expired codes and caps guesses',async()=>{
 const issued=await post('forgot',{email});
 const invalid=await post('verify',{email,code:'0000'});assert.equal(invalid.status,400);assert.equal(invalid.data.error,'Mã xác thực không hợp lệ');
 for(let i=0;i<4;i++)assert.equal((await post('verify',{email,code:'0000'})).status,400);
 assert.equal((await post('verify',{email,code:issued.data.demoCode})).status,400);
 db.otps[0].expiry=Date.now()-1;
 const expired=await post('verify',{email,code:issued.data.demoCode});assert.equal(expired.status,400);assert.equal(expired.data.error,'Mã xác thực hết hạn!');
});
test('UC01 reset requires verified token, validates password, revokes sessions and cannot replay',async()=>{
 const session=await post('login',{email,password:'Demo@123'});assert.equal(session.status,200);
 const issued=await post('forgot',{email});
 assert.equal((await post('reset',{email,code:issued.data.demoCode,password:'NewDemo@123'})).status,400);
 const verified=await post('verify',{email,code:issued.data.demoCode});assert.equal(verified.status,200);
 assert.equal((await post('verify',{email,code:issued.data.demoCode})).status,400);
 const resetToken=verified.data.resetToken;
 for(const password of ['short','alllowercase1!','ALLUPPERCASE1!','NoNumbers!','NoSymbol123'])assert.equal((await post('reset',{email,resetToken,password})).status,400);
 assert.equal((await post('reset',{email,resetToken,password:'NewDemo@123'})).status,200);
 assert.equal((await post('reset',{email,resetToken,password:'OtherDemo@123'})).status,400);
 assert.equal((await post('login',{email,password:'Demo@123'})).status,401);
 assert.equal((await post('login',{email,password:'NewDemo@123'})).status,200);
 const oldSession=await fetch(url+'/api/auth/me',{headers:{Authorization:'Bearer '+session.data.token}});assert.equal(oldSession.status,401);
});
test('UC01 expired reset authorization cannot update password',async()=>{
 const issued=await post('forgot',{email});const verified=await post('verify',{email,code:issued.data.demoCode});
 db.otps[0].expiry=Date.now()-1;
 assert.equal((await post('reset',{email,resetToken:verified.data.resetToken,password:'OtherDemo@123'})).status,400);
});
