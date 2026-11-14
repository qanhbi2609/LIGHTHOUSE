'use strict';
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'lighthouse-reports-'));
Object.assign(process.env,{LIGHTHOUSE_DEMO_DATASET:'workflow',LIGHTHOUSE_DATA_DIR:dir+'/data',LIGHTHOUSE_UPLOADS_DIR:dir+'/uploads'});
const {server,db}=require('../server'),{aggregate}=require('../report-data');let base,manager,viewer,student,id;
async function call(route,method='GET',body,token=manager){const r=await fetch(base+'/api/'+route,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
const snapshot=()=>({disk:fs.readFileSync(dir+'/data/lighthouse.json','utf8'),memory:JSON.stringify(db),uploads:fs.readdirSync(dir+'/uploads').sort()});
const range={type:'Tổng hợp tháng',from:'2026-10-01',to:'2026-10-31',generated:true,confirm:true};
const png={name:'Anh sinh hoat.png',mime:'image/png',data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='};
before(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
 for(const [email,set] of [['quanly@lighthouse.test',v=>manager=v],['canbo@lighthouse.test',v=>viewer=v],['sinhvien@lighthouse.test',v=>student=v]])set((await call('auth/login','POST',{email,password:'Demo@123'},'')).data.token);
});
after(async()=>{await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});});
test('UC09 period totals balance and use dated records without inventing health or activity facts',()=>{
 const sample=structuredClone(db);sample.students.push({id:'NEW',joined:'2026-10-05'},{id:'GRAD',joined:'2026-06-01',endDate:'2026-10-10',endReason:'Đã tốt nghiệp'},{id:'EARLY',joined:'2026-09-01',endDate:'2026-10-15',endReason:'Rời trước thời hạn'});
 sample.supports.push({studentId:'NEW',date:'2026-10-08',amount:1250000});sample.grades.push({sent:'2026-10-10',status:'Hợp lệ',gpa:3.8,debts:0,certificates:'B2'});
 const r=aggregate(sample,range.from,range.to,range.type);assert.equal(r.sections.length,10);assert.equal(r.metrics.beginning,5);assert.equal(r.metrics.entered,1);assert.equal(r.metrics.graduated,1);assert.equal(r.metrics.left,1);assert.equal(r.metrics.ending,4);assert.equal(r.metrics.supportAmount,1250000);assert.equal(r.metrics.grades,1);assert.match(r.sections[3].text,/Chưa có/);assert.equal(aggregate(sample,'1900-01-01','1900-01-31').hasData,false);
});
test('UC09 summary and create enforce real calendar dates, report types and grants before writes',async()=>{
 const before=snapshot();for(const body of [{...range,from:'2026-02-30'},{...range,to:'2026-09-01'},{...range,type:'Unknown'},{...range,files:'bad'},{...range,files:Array(7).fill(png)},{...range,from:'1900-01-01',to:'1900-01-31'}]){assert.equal((await call('reports','POST',body)).status,400);assert.deepEqual(snapshot(),before);}
 assert.equal((await call('reports/summary?from=2026-02-30&to=2026-03-01')).status,400);
 assert.equal((await call('reports','POST',range,viewer)).status,403);assert.equal((await call('reports/summary?from=2026-10-01&to=2026-10-31','GET',undefined,student)).status,403);assert.deepEqual(snapshot(),before);
 assert.equal((await call('reports/summary?from=2026-10-01&to=2026-10-31','GET',undefined,viewer)).status,200);
});
test('UC09 generated report stores an authoritative snapshot and preserves older reports',async()=>{
 const old=structuredClone(db.reports),expected=aggregate(db,range.from,range.to,range.type);
 const created=await call('reports','POST',{...range,content:'Forged totals',reportData:{metrics:{ending:9999}},notes:'Nhận xét tiếng Việt <script>plain text</script>',files:[png]});assert.equal(created.status,201);id=created.data.item.id;
 assert.deepEqual(created.data.item.reportData,expected);assert.notEqual(created.data.item.content,'Forged totals');assert.equal(created.data.item.fileDetails[0].name,png.name);assert.deepEqual(db.reports.slice(1),old);
 await call('supports','POST',{studentId:'LH001',name:'New data after report',amount:50000,date:'2026-10-20'});
 const saved=(await call('reports/'+id)).data.item;assert.deepEqual(saved.reportData,expected);
 await call('reports/'+id,'PATCH',{content:'Do not overwrite generated data'});assert.notEqual((await call('reports/'+id)).data.item.content,'Do not overwrite generated data');
});
test('UC09 invalid attachment rolls back new files and does not partially change reports or history',async()=>{
 const before=snapshot(),bad={...png,data:'data:image/png;base64,YmFk'};
 for(const [route,method,body] of [['reports','POST',{...range,files:[png,bad]}],['reports/'+id,'PATCH',{notes:'Must not persist',confirm:false,files:[png,bad]}],['reports/'+id,'PATCH',{files:Array(6).fill(png)}]]){assert.equal((await call(route,method,body)).status,400);assert.deepEqual(snapshot(),before);}
});
test('UC09 preserves draft compatibility and exports an actual PDF with embedded Vietnamese fonts',async()=>{
 const created=await call('reports','POST',{type:'Báo cáo tháng',from:'2026-10-01',to:'2026-10-31',content:'Báo cáo cũ vẫn giữ nguyên',confirm:false});assert.equal(created.status,201);assert.equal(created.data.item.status,'Bản nháp');
 assert.equal((await call('reports/'+created.data.item.id,'PATCH',{notes:'Đã xem',confirm:true})).status,200);assert.equal((await call('reports/'+created.data.item.id)).data.item.content,'Báo cáo cũ vẫn giữ nguyên');
 const response=await fetch(base+'/api/reports/'+id+'/pdf',{headers:{Authorization:'Bearer '+viewer}});assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/application\/pdf/);assert.match(response.headers.get('content-disposition'),new RegExp(id+'\\.pdf'));
 const bytes=Buffer.from(await response.arrayBuffer());assert.equal(bytes.subarray(0,5).toString(),'%PDF-');assert.ok(bytes.length>5000);
 const {PDFDocument}=require('../vendor/pdf-lib-1.17.1'),pdf=await PDFDocument.load(bytes);assert.equal(pdf.getPageCount(),2);assert.match(pdf.getTitle(),/10\/2026/);
 const fontkit=require('../vendor/fontkit-1.1.1'),font=fontkit.create(fs.readFileSync(path.resolve(__dirname,'../../frontend/assets/fonts/pdf/Roboto-Regular.ttf')));assert.ok(font.hasGlyphForCodePoint('ế'.codePointAt(0)));
 assert.equal((await fetch(base+'/api/reports/'+id+'/pdf',{headers:{Authorization:'Bearer '+student}})).status,403);
});

test('UC09 persistence failures roll back report data, history and newly written attachments',async()=>{
 const before=snapshot(),rename=fs.renameSync;fs.renameSync=(from,to)=>{if(to===dir+'/data/lighthouse.json')throw new Error('Synthetic disk failure');return rename(from,to);};
 try{for(const [route,method,body] of [['reports','POST',{...range,files:[png]}],['reports/'+id,'PATCH',{notes:'Must not persist',files:[png]}]]){assert.equal((await call(route,method,body)).status,500);assert.deepEqual(snapshot(),before);}}finally{fs.renameSync=rename;}
});
