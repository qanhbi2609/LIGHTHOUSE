'use strict';
module.exports=function({db,fs,path,uploadsDir,storeFile,error,can,studentDocuments}){
 const valid=url=>typeof url==='string'&&/^\/uploads\/[a-zA-Z0-9._-]+$/.test(url);
 const existing=f=>{try{return valid(f?.url)&&fs.statSync(path.join(uploadsDir,path.basename(f.url))).isFile()}catch{return false}};
 const list=r=>(r.evidenceFiles?.length?r.evidenceFiles:r.evidence?[{url:r.evidence,name:r.evidenceName||path.basename(r.evidence),previewRegion:r.previewRegion}]:[]).filter(existing);
 function write(files,required=false){
  if(!Array.isArray(files)||files.length>6||required&&!files.length)error(400,required?'Vui lòng tải lên minh chứng bắt buộc':'Tối đa 6 tệp minh chứng');
  if(files.reduce((n,f)=>n+Buffer.from(String(f?.data||'').split(',')[1]||'','base64').length,0)>8_000_000)error(400,'Tổng dung lượng minh chứng tối đa 8 MB');
  const rows=[];try{for(const f of files){const url=storeFile(f,'evidence');if(!url)error(400,'Minh chứng không hợp lệ');rows.push({url,name:String(f.name||'Minh chứng').slice(0,500),mime:f.mime});}return rows;}catch(e){for(const f of rows)fs.unlinkSync(path.join(uploadsDir,path.basename(f.url)));throw e;}
 }
 const input=a=>a.evidenceFiles!==undefined?a.evidenceFiles:a.evidenceFile?[a.evidenceFile]:[];
 const normalize=r=>({...r,evidenceFiles:list(r),evidence:list(r)[0]?.url||'',evidenceName:list(r)[0]?.name||''});
 function profile(actor,s){return actor.role==='SinhVien'?actor.studentId===s.id:actor.role==='GiamDoc'?s.status==='Đang hỗ trợ'&&can(actor,'students.view'):(s.status==='Đã kết thúc hỗ trợ'?can(actor,'alumni.view'):can(actor,'students.view'));}
 function authorized(actor,url){
  if(!valid(url))return false;
  const matches=r=>list(r).some(f=>f.url===url);
  if(db.students.some(s=>profile(actor,s)&&(studentDocuments(s).some(f=>f.url===url)||db.images.some(i=>i.studentId===s.id&&i.url===url))))return true;
  if(db.registrations.some(r=>(can(actor,'registrations.view')||actor.role==='SinhVien'&&db.students.some(s=>s.id===actor.studentId&&s.registrationId===r.id))&&[...(r.files||[]),...(r.documents||[]).map(f=>f.url)].includes(url)))return true;
  if((db.gradeRevisions||[]).some(r=>matches(r.before)&&(actor.role==='SinhVien'?r.before.studentId===actor.studentId:can(actor,'grades.view'))))return true;
  for(const [key,permission] of [['grades','grades.view'],['supports','students.view']])if(db[key].some(r=>matches(r)&&(actor.role==='SinhVien'?actor.studentId===r.studentId:key==='grades'&&can(actor,permission)&&actor.role!=='GiamDoc'||db.students.some(s=>s.id===r.studentId&&profile(actor,s)&&(key!=='grades'||r.status==='Hợp lệ')))))return true;
  if(db.reports.some(r=>(r.files||[]).includes(url)&&can(actor,'reports.view')&&(actor.role!=='GiamDoc'||r.status==='Đã lưu')))return true;
  return false;
 }
 function nameFor(url){const all=[...db.students.flatMap(studentDocuments),...db.registrations.flatMap(r=>r.documents||[]),...db.grades.flatMap(list),...db.supports.flatMap(list),...db.reports.flatMap(r=>r.fileDetails||[])];return all.find(f=>f.url===url)?.name||path.basename(url);}
 return {list,write,input,normalize,authorized,existing,nameFor};
};
