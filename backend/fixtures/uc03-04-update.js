'use strict';
// Reference gallery only: never replace uploads or a profile changed by the team.
function upgradeUC34(db){
 if(!db.demoFixture||db.demoFixture.uc34Updated)return false;
 const s=db.students.find(s=>s.id==='LH001');
 const touched=db.studentRevisions?.some(r=>r.studentId==='LH001')||db.history?.some(h=>h.subject==='LH001'&&/ảnh|hình ảnh/i.test(h.action));
 if(s?.name==='Mai Hồng Ngọc'&&!touched&&!db.images.some(i=>i.studentId===s.id)){
  const start=Math.max(0,...db.images.map(i=>Number(i.id.replace(/\D/g,''))||0))+1;
  for(let i=0;i<11;i++)db.images.push({id:'HA'+String(start+i).padStart(3,'0'),studentId:s.id,url:`/uploads/alumni-photo-${i}.png`,created:`2026-${i<3?'09':i<8?'08':'07'}-01T00:00:00Z`});
 }
 db.demoFixture.uc34Updated=true;return true;
}
module.exports={upgradeUC34};
