'use strict';
const TYPES=['Tổng hợp tháng','Tổng hợp quý','Tổng hợp 6 tháng','Tổng hợp năm','Tổng hợp 5 năm'];
function validDay(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;}
function validate(from,to,type){if(!validDay(from)||!validDay(to)||from>to)throw Object.assign(new Error('Khoảng thời gian không hợp lệ!'),{status:400});if(type&&!TYPES.includes(type)&&!/^Báo cáo (tháng|quý|6 tháng|năm|5 năm)$/.test(type))throw Object.assign(new Error('Loại báo cáo không hợp lệ!'),{status:400});}
function aggregate(db,from,to,type='Tổng hợp tháng'){
 validate(from,to,type);const inPeriod=d=>{d=String(d||'').slice(0,10);return d>=from&&d<=to;};
 const students=db.students.filter(s=>validDay(s.joined));
 const beginning=students.filter(s=>s.joined<from&&(!validDay(s.endDate)||s.endDate>=from)).length;
 const entered=students.filter(s=>inPeriod(s.joined)).length,ended=students.filter(s=>inPeriod(s.endDate));
 const graduated=ended.filter(s=>/tốt nghiệp/i.test(s.endReason||'')).length,left=ended.length-graduated;
 const ending=students.filter(s=>s.joined<=to&&(!validDay(s.endDate)||s.endDate>to)).length;
 const grades=db.grades.filter(g=>g.status==='Hợp lệ'&&inPeriod(g.sent)),goals=db.goals.filter(g=>inPeriod(g.sent)),supports=db.supports.filter(s=>inPeriod(s.date));
 const debts=grades.filter(g=>Number(g.debts)>0).length,certs=grades.filter(g=>g.certificates&&g.certificates!=='—').length,achieved=goals.filter(g=>g.status==='Đạt').length;
 const changes=(db.studentRevisions||[]).filter(r=>inPeriod(r.time)).filter(r=>{const next=(db.studentRevisions||[]).filter(n=>n.studentId===r.studentId&&n.time>r.time).sort((a,b)=>a.time.localeCompare(b.time))[0]?.before||db.students.find(s=>s.id===r.studentId);return next&&['major','school','cohort'].some(k=>String(next[k]||'')!==String(r.before?.[k]||''));}).length;
 const supportAmount=supports.reduce((sum,s)=>sum+Number(s.amount||0),0),gpas=grades.map(g=>Number(g.gpa)).filter(Number.isFinite);
 const metrics={beginning,entered,graduated,left,ending,grades:grades.length,goals:goals.length,achieved,supports:supports.length,supportAmount};
 const money=supportAmount.toLocaleString('vi-VN')+' đ';
 const sections=[
 ['Sinh viên hiện tham gia',`Đầu kỳ: ${beginning} sinh viên. Cuối kỳ: ${ending} sinh viên đang tham gia chương trình Lighthouse.`],
 ['Biến động sinh viên',`Mới vào: ${entered}; tốt nghiệp: ${graduated}; rời chương trình: ${left}. Tổng cuối kỳ: ${beginning} + ${entered} − ${graduated} − ${left} = ${ending}.`],
 ['Học tập, kỹ năng, tiếng Anh và chứng chỉ',grades.length?`${grades.length} kết quả học tập hợp lệ được gửi trong kỳ. GPA trung bình: ${(gpas.reduce((a,b)=>a+b,0)/(gpas.length||1)).toFixed(2)}. ${certs} kết quả có chứng chỉ; ${debts} kết quả có môn nợ.`:'Chưa có kết quả học tập đã duyệt được gửi trong kỳ.'],
 ['Sức khỏe','Chưa có thông tin sức khỏe trong kỳ.'],
 ['Đời sống và sinh hoạt',`Bố trí phòng tại thời điểm tổng hợp: ${db.students.filter(s=>s.room&&s.status!=='Đã kết thúc hỗ trợ').length} sinh viên trong ${db.rooms.length} phòng. Chưa có thông tin sinh hoạt trong kỳ.`],
 ['Thách thức và giải pháp can thiệp',`${debts} kết quả học tập có môn nợ; ${goals.filter(g=>g.status==='Chưa đạt').length} mục tiêu chưa đạt. Chưa có thông tin giải pháp can thiệp trong kỳ.`],
 ['Thay đổi ngành và bậc học',`${changes} lần thay đổi trường, ngành hoặc niên khóa được lưu trong kỳ.`],
 ['Mục tiêu, kế hoạch và phát triển',`${goals.length} mục tiêu được gửi trong kỳ; ${achieved} đã đạt, ${goals.filter(g=>g.status==='Chưa đạt').length} chưa đạt. ${goals.filter(g=>!['Đạt','Chưa đạt'].includes(g.status)).length} đang chờ xử lý.`],
 ['Hỗ trợ học tập, tài chính, y tế và tinh thần',`${supports.length} khoản hỗ trợ trong kỳ cho ${new Set(supports.map(s=>s.studentId)).size} sinh viên, tổng số tiền ${money}.`],
 ['Vui chơi, nghỉ lễ và hỗ trợ bên ngoài','Chưa có thông tin hoạt động và hỗ trợ bên ngoài trong kỳ.']
 ].map(([title,text],i)=>({number:i+1,title,text}));
 const month=Number(from.slice(5,7)),year=from.slice(0,4);let suffix=type.replace(/^(Tổng hợp|Báo cáo) /,'');
 if(suffix==='tháng')suffix+=` ${month}/${year}`;else if(suffix==='quý')suffix+=` ${Math.ceil(month/3)}/${year}`;else suffix+=` ${year}`;
 return {version:1,title:'Báo cáo tổng hợp '+suffix,from,to,type,metrics,sections,hasData:!!(beginning||entered||ended.length||ending||grades.length||goals.length||supports.length||changes)};
}
module.exports={TYPES,validate,aggregate};
