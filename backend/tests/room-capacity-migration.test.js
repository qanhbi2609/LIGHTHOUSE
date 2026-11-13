'use strict';
process.env.LIGHTHOUSE_DEMO_DATASET='workflow';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const base=path.resolve(__dirname,'..');

function fixture(run){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'lighthouse-capacity-'));
  try{run(dir);}finally{fs.rmSync(dir,{recursive:true,force:true});}
}
function boot(dir){
  return spawnSync(process.execPath,['-e',"require('./server')"],{
    cwd:base,env:{...process.env,LIGHTHOUSE_DATA_DIR:dir,LIGHTHOUSE_UPLOADS_DIR:path.join(dir,'uploads')},encoding:'utf8'
  });
}

test('legacy rooms become six without losing records; migration backs up and is repeatable',()=>fixture(dir=>{
  const file=path.join(dir,'lighthouse.json');
  const original={rooms:[{id:'A101',capacity:4}],students:[{id:'LH001',room:'A101'}],history:[{id:'KEEP'}]};
  const text=JSON.stringify(original);fs.writeFileSync(file,text);
  assert.equal(boot(dir).status,0);
  assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),{...original,rooms:[{id:'A101',capacity:6}]});
  assert.equal(fs.readFileSync(file+'.before-room-capacity-6.bak','utf8'),text);
  const migrated=fs.readFileSync(file,'utf8');
  assert.equal(boot(dir).status,0);
  assert.equal(fs.readFileSync(file,'utf8'),migrated);
  assert.equal(fs.readFileSync(file+'.before-room-capacity-6.bak','utf8'),text);
}));

test('overcrowded legacy room blocks migration without deleting residents or changing disk',()=>fixture(dir=>{
  const file=path.join(dir,'lighthouse.json');
  const text=JSON.stringify({rooms:[{id:'A101',capacity:8}],students:Array.from({length:7},(_,i)=>({id:'LH'+i,room:'A101'}))});
  fs.writeFileSync(file,text);
  const result=boot(dir);assert.notEqual(result.status,0);assert.match(result.stderr,/quá 6 sinh viên/);
  assert.equal(fs.readFileSync(file,'utf8'),text);
  assert.equal(fs.existsSync(file+'.before-room-capacity-6.bak'),false);
}));
