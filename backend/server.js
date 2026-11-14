'use strict';
/** LIGHTHOUSE full workflow test build – no external Node dependencies.
 * Persistent JSON demo storage. Do not use with real personal student data.
 */
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {URL}=require('node:url');
const grants=require('../frontend/permissions');
const root=path.resolve(__dirname,'../frontend');
const {comparison,dataDir,dataFile}=require('./storage');
const uploadsDir=path.resolve(process.env.LIGHTHOUSE_UPLOADS_DIR||path.join(__dirname,'uploads'));
fs.mkdirSync(dataDir,{recursive:true});fs.mkdirSync(uploadsDir,{recursive:true});
if(!fs.existsSync(dataFile)||comparison)require('./seed');
let db=JSON.parse(fs.readFileSync(dataFile,'utf8'));
// Confirmed business rule: every room accommodates exactly six students.
const ROOM_CAPACITY=6;
if(db.rooms.some(r=>r.capacity!==ROOM_CAPACITY)){
if(db.rooms.some(r=>db.students.filter(s=>s.room===r.id).length>ROOM_CAPACITY))throw Error('Không thể cập nhật sức chứa: có phòng đang ở quá 6 sinh viên.');
const backup=dataFile+'.before-room-capacity-6.bak';
if(!fs.existsSync(backup))fs.copyFileSync(dataFile,backup,fs.constants.COPYFILE_EXCL);
for(const room of db.rooms)room.capacity=ROOM_CAPACITY;
save();
}
const sessions=new Map();
const limitBytes=15_000_000;const PORT=Number(process.env.PORT||3000);
const TEXT={'Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY'};
function reply(res,status,obj){res.writeHead(status,TEXT);res.end(JSON.stringify(obj));}
function error(status,msg){const e=new Error(msg);e.status=status;throw e;}
function save(){const temp=dataFile+'.tmp';fs.writeFileSync(temp,JSON.stringify(db,null,2));fs.renameSync(temp,dataFile);}
function nextId(rows,prefix){let i=Math.max(0,...rows.map(a=>Number((a.id||'').replace(/\D/g,''))||0));return prefix+String(i+1).padStart(3,'0')}
function today(){return new Date().toISOString().slice(0,10)}
function current(){return new Date().toISOString()}
function norm(v){return String(v??'').trim()}
function clean(v,max=500){return norm(v).slice(0,max)}
function required(v,name,max=500){const x=clean(v,max);if(!x)error(400,`Vui lòng nhập ${name}`);return x;}
function date(v){return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v}
function same(v,q){return norm(v).toLocaleLowerCase('vi').includes(q.toLocaleLowerCase('vi'))}
function find(rows,id,what){const r=rows.find(o=>o.id===id);if(!r)error(404,`Không tìm thấy ${what}`);return r;}
function body(req){return new Promise((resolve,reject)=>{let s='',bytes=0;req.on('data',v=>{bytes+=v.length;if(bytes>limitBytes){reject(Object.assign(new Error('Dữ liệu quá lớn'),{status:413}));req.destroy();return;}s+=v});req.on('end',()=>{try{resolve(s?JSON.parse(s):{})}catch{reject(Object.assign(new Error('JSON không hợp lệ'),{status:400}))}});req.on('error',reject)});}
function hash(pass,salt=crypto.randomBytes(16).toString('hex')){return salt+':'+crypto.scryptSync(pass,salt,64).toString('hex')}
function validatePassword(pass,stored){try{const [salt]=stored.split(':');return crypto.timingSafeEqual(Buffer.from(hash(pass,salt).split(':')[1],'hex'),Buffer.from(stored.split(':')[1],'hex'))}catch{return false}}
function publicUser(u){if(!u)return null;const {passwordHash,...rest}=u;const profile=u.role==='SinhVien'&&db.students.find(s=>s.id===u.studentId);return {...rest,permissions:grants.effective(u),...(profile?{name:profile.name}:{})}}
const MANAGER_ROLES=['QuanLy','GiamDoc','CanBo'];
function tokenUser(req){const t=(req.headers.authorization||'').replace(/^Bearer /,'');const ses=sessions.get(t);if(!ses||ses.expires<Date.now())return null;return db.users.find(x=>x.id===ses.id&&x.active)||null;}
function user(req){const u=tokenUser(req);if(!u)error(401,'Vui lòng đăng nhập');return u;}
function can(u,permission){return grants.hasFor(u,permission)}
function allow(req,permission){const u=user(req);if(u.role==='SinhVien'||!can(u,permission))error(403,'Bạn không có quyền thực hiện chức năng này');return u;}
function admin(req){const u=user(req);if(!['QuanLy','GiamDoc'].includes(u.role)||!can(u,'users.manage'))error(403,'Chỉ quản lý được phân quyền cao mới có thể thực hiện');return u;}
function validateGrants(value,role,actor,previous=null){
 if(!Array.isArray(value)||value.some(k=>typeof k!=='string'||!grants.known.includes(k)))error(400,'Quyền không hợp lệ!');
 if(value.some(k=>!grants.allowed(role,k)))error(400,'Vai trò không được cấp quyền đã chọn!');
 const next=[...new Set(grants.expand(value))],before=previous?grants.effective(previous):[];
 for(const key of grants.known)if(next.includes(key)!==before.includes(key)&&!can(actor,key))error(403,'Bạn không có quyền cấp hoặc thu hồi quyền đã chọn');
 return next;
}
function accountPassword(value){const p=typeof value==='string'?value:'';if(!p||p.length<4||p.length>128||/\s/.test(p))error(400,'Mật khẩu cần từ 4 đến 128 ký tự, không chứa khoảng trắng');return p;}
function validateRegistration(a){
 const labels={name:'họ tên',dob:'ngày sinh',hometown:'quê quán',address:'địa chỉ thường trú',phone:'số điện thoại',email:'email',cccd:'số căn cước công dân',family:'hoàn cảnh gia đình',school:'trường',major:'ngành',description:'mô tả ngành học'};
 const data={};for(const [key,label] of Object.entries(labels))data[key]=required(a[key],label,key==='description'?5000:key==='family'?2000:500);
 if(!/^\S+@\S+\.\S+$/.test(data.email))error(400,'Email không hợp lệ');
 if(!/^0[0-9]{9}$/.test(String(a.phone||'')))error(400,'Số điện thoại không hợp lệ');
 if(!/^\d{12}$/.test(data.cccd))error(400,'Số căn cước công dân phải gồm 12 chữ số');
 if(!date(data.dob)||data.dob>today())error(400,'Ngày sinh không hợp lệ');
 data.email=data.email.toLowerCase();return data;
}
function atomic(work,files=[]){const before=structuredClone(db);try{const result=work();save();return result;}catch(e){for(const k of Object.keys(db))delete db[k];Object.assign(db,before);for(const url of files){try{fs.unlinkSync(path.join(uploadsDir,path.basename(url)))}catch{}}try{fs.unlinkSync(dataFile+'.tmp')}catch{}throw e;}}

function log(u,action,subject){db.history.unshift({id:nextId(db.history,'LS'),userId:u.id,actor:publicUser(u).name,action,subject,time:current()});}
function localProof(url){try{return fs.statSync(path.join(uploadsDir,path.basename(url))).isFile()}catch{return false}}
function studentDocuments(s){const registration=db.registrations.find(r=>r.id===s.registrationId);return (s.files?.length?s.files:registration?.documents?.length?registration.documents:registration?.files||[]).map((f,i)=>typeof f==='string'?{url:f,name:'Giấy tờ liên quan '+(i+1),created:registration?.created||s.joined}:f).filter(f=>/^\/uploads\/[a-zA-Z0-9._-]+$/.test(f?.url||'')&&localProof(f.url));}
function studentScope(u,s){return u.role!=='SinhVien'||u.studentId===s.id}
function storeFile(file,related,max=1_500_000){if(!file)return '';const mime=file.mime;const m=/^data:(image\/png|image\/jpeg|application\/pdf);base64,(.*)$/s.exec(file.data||'');if(!m||m[1]!==mime)error(400,'Định dạng không phù hợp!');const data=Buffer.from(m[2],'base64');if(data.length===0||data.length>max)error(400,'Dung lượng tệp không hợp lệ!');const isPng=mime==='image/png'&&data.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'));
const isJpg=mime==='image/jpeg'&&data.subarray(0,3).equals(Buffer.from('ffd8ff','hex'));
const isPdf=mime==='application/pdf'&&data.subarray(0,5).toString()==='%PDF-';if(!isPng&&!isJpg&&!isPdf)error(400,'Định dạng không phù hợp!');
const ext=isPng?'.png':isJpg?'.jpg':'.pdf',filename=crypto.randomBytes(14).toString('hex')+ext;fs.writeFileSync(path.join(uploadsDir,filename),data,{flag:'wx'});return '/uploads/'+filename;}
function activeStudent(req){const actor=user(req),profile=db.students.find(s=>s.id===actor.studentId);if(actor.role!=='SinhVien'||!profile||profile.status!=='Đang hỗ trợ')error(403,'Hồ sơ sinh viên không ở trạng thái đang hỗ trợ');return actor;}
function gradeFields(a){
 const supplied=v=>(typeof v==='string'&&v.trim()!=='')||typeof v==='number';
 const gpa=Number(a.gpa),debts=Number(a.debts);
 if(!supplied(a.gpa)||!supplied(a.debts)||!Number.isFinite(gpa)||gpa<0||gpa>4||!Number.isInteger(debts)||debts<0)error(400,'GPA hoặc số môn nợ không hợp lệ');
 return {term:required(a.term,'học kỳ'),year:required(a.year,'năm học'),gpa,rank:required(a.rank,'xếp loại'),debts,certificates:clean(a.certificates)};
}
function studentWrite(kind,work,files=[]){
 const before=structuredClone(db[kind]),history=[...db.history],key=kind==='goals'?'goalRevisions':'gradeRevisions',revisions=db[key]?structuredClone(db[key]):null;
 try{work();save();}catch(e){db[kind]=before;db.history=history;if(revisions)db[key]=revisions;else delete db[key];for(const url of files){try{fs.unlinkSync(path.join(uploadsDir,path.basename(url)))}catch{}}try{fs.unlinkSync(dataFile+'.tmp')}catch{}throw e;}
}
function counts(){return {students:db.students.length,active:db.students.filter(s=>s.status!=='Đã kết thúc hỗ trợ').length,alumni:db.students.filter(s=>s.status==='Đã kết thúc hỗ trợ').length,rooms:db.rooms.length,goals:db.goals.length,grades:db.grades.length,supportAmount:db.supports.reduce((s,x)=>s+Number(x.amount||0),0)}}
async function route(req,res,u){let p=u.pathname,method=req.method,B=null;const parts=p.split('/').filter(Boolean);const id=parts[2];const read=async()=>B||(B=await body(req));
if(p==='/api/health'&&method==='GET')return reply(res,200,{status:'ok',app:'LIGHTHOUSE',mode:'JSON DEMO',users:db.users.length});
if(p==='/api/auth/login'&&method==='POST'){const a=await read();if(!norm(a.email)||!a.password)error(400,'Vui lòng không để trống thông tin');const email=norm(a.email);const who=db.users.find(x=>x.email.toLowerCase()===email.toLowerCase()&&x.active);if(!/^\S+@\S+\.\S+$/.test(email)||!who)error(401,'Email không hợp lệ');if(!validatePassword(String(a.password),who.passwordHash))error(401,'Email hoặc mật khẩu sai!');const t=crypto.randomBytes(32).toString('hex');sessions.set(t,{id:who.id,expires:Date.now()+7*86400000});return reply(res,200,{token:t,user:publicUser(who)});}
if(p==='/api/auth/logout'&&method==='POST'){sessions.delete((req.headers.authorization||'').replace(/^Bearer /,''));return reply(res,200,{message:'Đã đăng xuất'});}
if(p==='/api/auth/me'&&method==='GET')return reply(res,200,{item:publicUser(user(req))});
if(['/api/auth/forgot','/api/auth/verify','/api/auth/reset'].includes(p))error(410,'Chức năng khôi phục mật khẩu đã được gỡ bỏ');
if(p==='/api/registrations'&&method==='POST'){
const a=await read(),validated=validateRegistration(a),{name,email,phone,school,major,dob,cccd}=validated;
if(db.registrations.some(r=>r.email.toLowerCase()===email&&r.status!=='Từ chối'))error(409,'Email đã có hồ sơ đăng ký');
for(const key of ['files','familyFiles','schoolFiles'])if(a[key]!==undefined&&!Array.isArray(a[key]))error(400,'Danh sách tệp không hợp lệ');
const family=a.familyFiles||[],education=a.schoolFiles||[],legacy=a.files||[];
if(family.length+education.length+legacy.length>6)error(400,'Chỉ được tải lên tối đa 6 tệp');
const written=[],documents=[];const upload=(f,group)=>{const url=storeFile(f,'registration');if(!url)error(400,'Tệp minh chứng không hợp lệ');written.push(url);documents.push({url,name:clean(f.name)||'Giấy tờ minh chứng',group,created:current()});return url;};
let familyFiles,schoolFiles,files;
try{familyFiles=family.map(f=>upload(f,'family'));schoolFiles=education.map(f=>upload(f,'school'));files=[...familyFiles,...schoolFiles,...legacy.map(f=>upload(f,a.evidenceMode==='combined'?'general':'family'))];}
catch(e){for(const url of written)fs.unlinkSync(path.join(uploadsDir,path.basename(url)));throw e;}
const item={id:nextId(db.registrations,'HS'),name,email,phone,dob,cccd,hometown:clean(a.hometown),address:clean(a.address),school,major,family:clean(a.family,2000),description:clean(a.description,5000),files,familyFiles,schoolFiles,documents,status:'Chờ kiểm tra',note:'',created:today()};
atomic(()=>db.registrations.push(item),written);return reply(res,201,{item,message:'Đăng ký thành công!'});
}
if(p==='/api/registrations'&&method==='GET'){allow(req,'registrations.view');const q=norm(u.searchParams.get('q'));return reply(res,200,{items:db.registrations.filter(r=>!q||same(r.name,q)||same(r.id,q)||same(r.status,q))});}
if(parts[1]==='registrations'&&id&&parts.length===3&&method==='PATCH'){
const actor=allow(req,'registrations.review'),a=await read(),r=find(db.registrations,id,'hồ sơ');
if(r.status==='Đã tiếp nhận')error(409,'Hồ sơ đã được tiếp nhận');
if(!['Đạt yêu cầu','Chờ kiểm tra','Chờ bổ sung','Từ chối'].includes(a.status))error(400,'Trạng thái không hợp lệ');
const changes=validateRegistration({...r,...a});
const note=a.status==='Chờ bổ sung'?(Object.hasOwn(a,'note')?clean(a.note,1000):r.note||''):r.note||'';
if(a.status!=='Chờ bổ sung'&&Object.hasOwn(a,'note')&&clean(a.note,1000)!==(r.note||''))error(400,'Chỉ được chỉnh sửa thông tin cần bổ sung khi Chờ bổ sung');
if(a.status==='Chờ bổ sung'&&!note.trim())error(400,'Vui lòng nhập thông tin cần bổ sung.');
atomic(()=>{Object.assign(r,changes,{status:a.status,note});log(actor,'Xử lý hồ sơ',r.id+' → '+r.status);});return reply(res,200,{item:r,message:'Đã lưu thành công!'});
}
if(parts[1]==='registrations'&&id&&parts[3]==='accept'&&method==='POST'){const actor=allow(req,'registrations.review'),r=find(db.registrations,id,'hồ sơ');if(db.students.some(s=>s.registrationId===id))error(409,'Hồ sơ đã được tiếp nhận');if(r.status!=='Đạt yêu cầu')error(400,'Hồ sơ chưa đủ điều kiện tiếp nhận!');validateRegistration(r);const studentId=nextId(db.students,'LH'),usrId=nextId(db.users,'ND');const temp='Temp@'+crypto.randomInt(100000,999999);const stud={id:studentId,registrationId:r.id,userId:usrId,name:r.name,email:r.email,cccd:r.cccd,dob:r.dob,hometown:r.hometown,address:r.address,phone:r.phone,cohort:'',studentCode:'',school:r.school,major:r.major,family:r.family,room:null,status:'Đang hỗ trợ',joined:today(),endDate:'',endReason:''};atomic(()=>{db.students.push(stud);db.users.push({id:usrId,name:r.name,email:r.email,role:'SinhVien',studentId,permissions:[],passwordHash:hash(temp),active:true});r.status='Đã tiếp nhận';log(actor,'Tiếp nhận hồ sơ',r.id+' / '+studentId);});return reply(res,201,{item:stud,demoStudentPassword:process.env.NODE_ENV==='production'?undefined:temp,message:'Đã tạo hồ sơ sinh viên thành công!'});}
if(p==='/api/students'&&method==='GET'){const actor=user(req),q=norm(u.searchParams.get('q'));if(actor.role!=='SinhVien'&&!can(actor,'students.view'))error(403,'Không có quyền xem hồ sơ');const arr=db.students.filter(s=>studentScope(actor,s)&&(!q||[s.id,s.name,s.school,s.major,s.room].some(x=>same(x,q))));return reply(res,200,{items:arr});}
if(parts[1]==='students'&&id&&parts.length===3&&method==='GET'){const actor=user(req),s=find(db.students,id,'sinh viên');if(actor.role!=='SinhVien'&&!can(actor,'students.view')&&!(s.status==='Đã kết thúc hỗ trợ'&&can(actor,'alumni.view')))error(403,'Không có quyền xem hồ sơ');if(!studentScope(actor,s))error(403,'Bạn không có quyền xem hồ sơ này');return reply(res,200,{item:{...s,files:studentDocuments(s),images:db.images.filter(x=>x.studentId===id),goals:db.goals.filter(x=>x.studentId===id&&['Đạt','Chưa đạt'].includes(x.status)),grades:db.grades.filter(x=>x.studentId===id&&x.status==='Hợp lệ'),supports:db.supports.filter(x=>x.studentId===id)}});}
if(parts[1]==='students'&&id&&parts.length===3&&method==='PATCH'){
const actor=user(req),s=find(db.students,id,'sinh viên'),a=await read(),changes={};
if(actor.role==='SinhVien'||(!can(actor,'students.edit')&&!(can(actor,'alumni.edit')&&Object.hasOwn(a,'status')&&Object.keys(a).every(k=>['status','endDate','endReason'].includes(k)))))error(403,'Bạn không có quyền thực hiện chức năng này');
for(const k of ['name','email','phone','cccd','dob','hometown','address','school','major','family','cohort','studentCode'])if(Object.hasOwn(a,k))changes[k]=clean(a[k]);
if(Object.hasOwn(changes,'name')&&!changes.name)error(400,'Dữ liệu không hợp lệ: họ tên');
if(Object.hasOwn(changes,'email')&&!/^\S+@\S+\.\S+$/.test(changes.email))error(400,'Dữ liệu không hợp lệ: email');
if(Object.hasOwn(changes,'phone')&&!/^0\d{9}$/.test(changes.phone))error(400,'Dữ liệu không hợp lệ: số điện thoại');
if(changes.cccd&&!/^\d{12}$/.test(changes.cccd))error(400,'Dữ liệu không hợp lệ: CCCD');
if(changes.dob&&(!/^\d{4}-\d{2}-\d{2}$/.test(changes.dob)||!Number.isFinite(Date.parse(changes.dob))||new Date(changes.dob).toISOString().slice(0,10)!==changes.dob||changes.dob>today()))error(400,'Dữ liệu không hợp lệ: ngày sinh');
if(Object.hasOwn(a,'status')){if(!['Đang hỗ trợ','Tạm dừng hỗ trợ','Đã kết thúc hỗ trợ'].includes(a.status))error(400,'Trạng thái hỗ trợ không hợp lệ');changes.status=a.status;if(a.status==='Đã kết thúc hỗ trợ'){if(a.endDate&&!date(a.endDate))error(400,'Ngày kết thúc không hợp lệ');changes.endDate=clean(a.endDate,10)||today();changes.endReason=clean(a.endReason);changes.room=null;}}
atomic(()=>{(db.studentRevisions||=[]).push({id:nextId(db.studentRevisions||[],'RV'),studentId:s.id,userId:actor.id,time:current(),before:JSON.parse(JSON.stringify(s))});Object.assign(s,changes);log(actor,'Chỉnh sửa hồ sơ',s.id);});return reply(res,200,{item:s,message:'Lưu hồ sơ thành công!'});
}
if(p==='/api/alumni'&&method==='GET'){allow(req,'alumni.view');const q=norm(u.searchParams.get('q'));return reply(res,200,{items:db.students.filter(s=>s.status==='Đã kết thúc hỗ trợ'&&(!q||[s.name,s.id,s.email].some(v=>same(v,q))))});}
if(p==='/api/rooms/residents'&&method==='GET'){allow(req,'rooms.view');return reply(res,200,{items:db.students.map(({id,name,room,status})=>({id,name,room,status}))});}
if(p==='/api/rooms'&&method==='GET'){allow(req,'rooms.view');return reply(res,200,{items:db.rooms.map(r=>({...r,students:db.students.filter(s=>s.room===r.id).map(({id,name,room,status})=>({id,name,room,status}))}))});}
if(p==='/api/rooms'&&method==='POST'){
const actor=allow(req,'rooms.create'),a=await read(),id=required(a.id,'mã phòng').toUpperCase(),capacity=Number(a.capacity);
if(!/^[A-Z0-9][A-Z0-9_-]{0,19}$/.test(id))error(400,'Thông tin không hợp lệ!');
if(capacity!==ROOM_CAPACITY)error(400,'Sức chứa mỗi phòng phải là 6 sinh viên');
if(db.rooms.some(r=>r.id===id))error(409,'Tên phòng đã tồn tại');
if(a.studentIds!==undefined&&!Array.isArray(a.studentIds))error(400,'Danh sách sinh viên không hợp lệ');
const ids=[...new Set(a.studentIds||[])];if(ids.length>ROOM_CAPACITY)error(400,'Phòng đầy!');
const residents=ids.map(sId=>find(db.students,sId,'sinh viên'));if(residents.some(s=>s.status==='Đã kết thúc hỗ trợ'))error(400,'Không thể xếp Alumni vào phòng');
db.rooms.push({id,capacity});for(const s of residents)s.room=id;log(actor,'Tạo phòng',id);save();return reply(res,201,{message:'Tạo mới thành công!'});
}
if(parts[1]==='rooms'&&id&&method==='PUT'){
 const actor=allow(req,'rooms.assign'),r=find(db.rooms,id,'phòng'),a=await read();
 if(!Array.isArray(a.studentIds))error(400,'Danh sách sinh viên không hợp lệ');
 const ids=[...new Set(a.studentIds)];if(ids.length>r.capacity)error(400,'Phòng đầy!');
 const residents=ids.map(sId=>find(db.students,sId,'sinh viên'));if(residents.some(s=>s.status==='Đã kết thúc hỗ trợ'))error(400,'Không thể xếp Alumni vào phòng');
 for(const s of db.students)if(s.room===id&&!ids.includes(s.id))s.room=null;
 for(const s of residents)s.room=id;log(actor,'Sửa bố trí phòng',id);save();return reply(res,200,{message:'Cập nhật thành công!'});
}
if(parts[1]==='rooms'&&id&&method==='DELETE'){const actor=allow(req,'rooms.delete');find(db.rooms,id,'phòng');db.rooms=db.rooms.filter(x=>x.id!==id);for(const s of db.students)if(s.room===id)s.room=null;log(actor,'Xóa phòng',id);save();return reply(res,200,{message:'Xóa phòng thành công!'});}
if(p==='/api/images'&&method==='POST'){const actor=allow(req,'students.edit'),a=await read();find(db.students,a.studentId,'sinh viên');if(!['image/png','image/jpeg'].includes(a.file?.mime))error(400,'Định dạng không phù hợp!');const url=storeFile(a.file,a.studentId);if(!url.startsWith('/uploads/'))error(400,'Thiếu ảnh');const row={id:nextId(db.images,'HA'),studentId:a.studentId,url,created:current()};db.images.push(row);log(actor,'Thêm hình ảnh',a.studentId);save();return reply(res,201,{item:row,message:'Tải ảnh thành công!'});}
if(parts[1]==='images'&&id&&method==='DELETE'){const actor=allow(req,'students.edit'),img=find(db.images,id,'hình ảnh');db.images=db.images.filter(x=>x.id!==id);if(!db.images.some(x=>x.url===img.url)){try{fs.unlinkSync(path.join(uploadsDir,path.basename(img.url)))}catch{}}log(actor,'Xóa hình ảnh',img.studentId);save();return reply(res,200,{message:'Đã xóa hình ảnh!'});}
if(p==='/api/goals'&&method==='GET'){const actor=user(req),q=norm(u.searchParams.get('q'));if(actor.role!=='SinhVien'&&!can(actor,'goals.view'))error(403,'Không có quyền xem mục tiêu');return reply(res,200,{items:db.goals.filter(g=>(actor.role!=='SinhVien'||(actor.studentId&&g.studentId===actor.studentId))&&(!q||same(g.name,q)||same(g.studentId,q))).map(g=>({...g,studentName:db.students.find(x=>x.id===g.studentId)?.name}))});}
if(p==='/api/goals'&&method==='POST'){const actor=activeStudent(req),a=await read(),row={id:nextId(db.goals,'MT'),studentId:actor.studentId,name:required(a.name,'mục tiêu'),detail:required(a.detail,'chi tiết',10000),sent:today(),status:'Chờ đánh giá',feedback:''};studentWrite('goals',()=>{db.goals.push(row);log(actor,'Gửi mục tiêu',row.id);});return reply(res,201,{message:'Gửi thành công!',item:row});}
if(parts[1]==='goals'&&id&&parts[3]==='review'&&method==='PATCH'){const actor=allow(req,'goals.review'),row=find(db.goals,id,'mục tiêu'),a=await read();if(!['Đạt','Chưa đạt','Chờ bổ sung'].includes(a.status))error(400,'Đánh giá không hợp lệ');row.status=a.status;row.feedback=clean(a.feedback,1000);log(actor,'Đánh giá mục tiêu',id);save();return reply(res,200,{message:'Cập nhật thành công!',item:row});}
if(parts[1]==='goals'&&id&&parts[3]==='resubmit'&&method==='PATCH'){
 const actor=activeStudent(req),row=find(db.goals,id,'mục tiêu');if(actor.studentId!==row.studentId||row.status!=='Chờ bổ sung')error(403,'Không thể gửi lại mục tiêu');
 const a=await read(),changes={name:required(a.name,'mục tiêu'),detail:required(a.detail,'chi tiết',10000),status:'Chờ đánh giá',sent:today()};
 studentWrite('goals',()=>{(db.goalRevisions||=[]).push({id:nextId(db.goalRevisions||[],'GM'),goalId:id,userId:actor.id,time:current(),before:structuredClone(row)});Object.assign(row,changes);log(actor,'Gửi lại mục tiêu',id);});return reply(res,200,{message:'Gửi thành công!'});
}
if(p==='/api/grades'&&method==='GET'){const actor=user(req);if(actor.role!=='SinhVien'&&!can(actor,'grades.view'))error(403,'Không có quyền xem kết quả học tập');return reply(res,200,{items:db.grades.filter(g=>actor.role!=='SinhVien'||(actor.studentId&&g.studentId===actor.studentId)).map(g=>({...g,studentName:db.students.find(x=>x.id===g.studentId)?.name}))});}
if(p==='/api/grades'&&method==='POST'){
 const actor=activeStudent(req),a=await read(),fields=gradeFields(a),evidence=a.evidenceFile?storeFile(a.evidenceFile,'grade'):'';
 const row={id:nextId(db.grades,'KQ'),studentId:actor.studentId,...fields,evidence,evidenceName:a.evidenceFile?clean(a.evidenceFile.name):'',status:'Chờ xét duyệt',requestNote:'',sent:today()};
 studentWrite('grades',()=>{db.grades.push(row);log(actor,'Gửi kết quả học tập',row.id);},evidence?[evidence]:[]);return reply(res,201,{message:'Gửi thành công!',item:row});
}
if(parts[1]==='grades'&&id&&parts[3]==='review'&&method==='PATCH'){const actor=allow(req,'grades.review'),row=find(db.grades,id,'kết quả học tập'),a=await read();if(!['Hợp lệ','Yêu cầu gửi lại'].includes(a.status))error(400,'Trạng thái không hợp lệ');const note=clean(a.note,1000);if(a.status==='Yêu cầu gửi lại'&&!note)error(400,'Vui lòng nhập nội dung yêu cầu bổ sung.');row.status=a.status;row.requestNote=note;log(actor,'Xét duyệt KQHT',id);save();return reply(res,200,{message:a.status==='Hợp lệ'?'Cập nhật thành công!':'Gửi yêu cầu thành công!'});}
if(parts[1]==='grades'&&id&&parts[3]==='resubmit'&&method==='PATCH'){
 const actor=activeStudent(req),row=find(db.grades,id,'kết quả học tập');if(row.studentId!==actor.studentId||row.status!=='Yêu cầu gửi lại')error(403,'Không thể gửi lại KQHT');
 const a=await read(),changes={...gradeFields(a),status:'Chờ xét duyệt',sent:today()};
 if(a.evidenceFile){changes.evidence=storeFile(a.evidenceFile,'grade');changes.evidenceName=clean(a.evidenceFile.name);}
 studentWrite('grades',()=>{(db.gradeRevisions||=[]).push({id:nextId(db.gradeRevisions||[],'GR'),gradeId:id,userId:actor.id,time:current(),before:structuredClone(row)});Object.assign(row,changes);if(a.evidenceFile)delete row.previewRegion;log(actor,'Bổ sung KQHT',id);},a.evidenceFile?[changes.evidence]:[]);return reply(res,200,{message:'Gửi thành công!'});
}
if(p==='/api/supports'&&method==='GET'){const actor=user(req);if(actor.role!=='SinhVien'&&!can(actor,'students.view'))error(403,'Không có quyền xem hỗ trợ');return reply(res,200,{items:db.supports.filter(s=>actor.role!=='SinhVien'||s.studentId===actor.studentId)});}
if(p==='/api/supports'&&method==='POST'){
 const actor=allow(req,'students.edit'),a=await read();find(db.students,a.studentId,'sinh viên');
 const name=required(a.name,'tên hỗ trợ'),type=required(a.type,'loại hỗ trợ'),day=required(a.date,'ngày hỗ trợ'),amount=Number(a.amount);
 if(!['Học phí','Phí sinh hoạt','Y tế','Chi phí khác'].includes(type))error(400,'Loại hỗ trợ không hợp lệ');
 if(a.amount===undefined||a.amount===null||typeof a.amount==='boolean'||String(a.amount).trim()==='')error(400,'Vui lòng nhập số tiền hỗ trợ');
 if(!date(day))error(400,'Ngày hỗ trợ không hợp lệ');
 if(!Number.isFinite(amount)||amount<0)error(400,'Số tiền không hợp lệ');
 if(a.date&&(typeof a.date!=='string'||!date(a.date)||!Number.isFinite(Date.parse(a.date))||new Date(a.date).toISOString().slice(0,10)!==a.date))error(400,'Ngày hỗ trợ không hợp lệ');
 const row={id:nextId(db.supports,'HT'),studentId:a.studentId,name,type,amount,date:day,evidence:a.evidenceFile?storeFile(a.evidenceFile,'support'):'',evidenceName:a.evidenceFile?clean(a.evidenceFile.name):''};
 atomic(()=>{db.supports.push(row);log(actor,'Thêm hỗ trợ',row.studentId);},row.evidence?[row.evidence]:[]);return reply(res,201,{item:row,message:'Cập nhật thành công!'});
}
if(p==='/api/users'&&method==='GET'){allow(req,'users.view');return reply(res,200,{items:db.users.map(publicUser)});}
if(p==='/api/users'&&method==='POST'){
 const actor=admin(req),a=await read(),email=required(a.email,'email').toLowerCase();
 if(!/^\S+@\S+\.\S+$/.test(email))error(400,'Email không hợp lệ!');
 if(db.users.some(x=>x.email.toLowerCase()===email))error(409,'Email đã tồn tại!');
 const name=required(a.name,'họ tên');if(!['QuanLy','CanBo','GiamDoc','SinhVien'].includes(a.role))error(400,'Vai trò không hợp lệ');
 const permissions=validateGrants(a.permissions||[],a.role,actor),password=accountPassword(a.password);
 const row={id:nextId(db.users,'ND'),name,email,role:a.role,studentId:null,permissions,passwordHash:hash(password),active:true};
 atomic(()=>{db.users.push(row);log(actor,'Thêm người dùng',row.id);});return reply(res,201,{message:'Cập nhật thành công!',item:publicUser(row)});
}
if(parts[1]==='users'&&id&&method==='PATCH'){
 const actor=admin(req),row=find(db.users,id,'người dùng'),a=await read(),changes={};
 if(Object.hasOwn(a,'id')&&a.id!==row.id)error(400,'Mã người dùng không được chỉnh sửa');
 if(Object.hasOwn(a,'name'))changes.name=required(a.name,'họ tên');
 if(Object.hasOwn(a,'email')){changes.email=required(a.email,'email').toLowerCase();if(!/^\S+@\S+\.\S+$/.test(changes.email))error(400,'Email không hợp lệ!');if(db.users.some(x=>x.id!==id&&x.email.toLowerCase()===changes.email))error(409,'Email đã tồn tại!');}
 if(Object.hasOwn(a,'password'))changes.passwordHash=hash(accountPassword(a.password));
 const role=a.role===undefined?row.role:a.role;if(!['QuanLy','CanBo','GiamDoc','SinhVien'].includes(role))error(400,'Vai trò không hợp lệ');
 changes.role=role;changes.permissions=validateGrants(a.permissions===undefined?grants.effective({...row,role}):a.permissions,role,actor,row);
 if(Object.hasOwn(a,'active'))changes.active=!!a.active;
 if(actor.id===id&&(!['QuanLy','GiamDoc'].includes(role)||!grants.hasFor({...row,...changes},'users.manage')||changes.active===false))error(400,'Không thể tự thu hồi quyền quản lý đang sử dụng!');
 atomic(()=>{const profile=row.studentId&&db.students.find(s=>s.id===row.studentId);if(profile&&(Object.hasOwn(changes,'name')||Object.hasOwn(changes,'email'))){(db.studentRevisions||=[]).push({id:nextId(db.studentRevisions||[],'RV'),studentId:profile.id,userId:actor.id,time:current(),before:structuredClone(profile)});for(const key of ['name','email'])if(Object.hasOwn(changes,key))profile[key]=changes[key];}Object.assign(row,changes);log(actor,'Sửa phân quyền',id);});return reply(res,200,{message:'Cập nhật thành công!',item:publicUser(row)});
}
if(parts[1]==='users'&&id&&method==='DELETE'){
 const actor=admin(req);if(actor.id===id)error(400,'Không thể tự xóa tài khoản đang đăng nhập');
 const row=find(db.users,id,'người dùng');row.permissions=[];row.active=false;
 for(const [key,session] of sessions)if(session.id===id)sessions.delete(key);
 log(actor,'Xóa phân quyền',id);save();return reply(res,200,{message:'Xóa thành công!'});
}
const reportData=require('./report-data');
const reportWithAuthor=r=>({...r,authorName:r.authorName||db.users.find(u=>u.id===r.author)?.name||r.author});
if(p==='/api/reports'&&method==='GET'){allow(req,'reports.view');return reply(res,200,{items:db.reports.map(reportWithAuthor)});}
if(p==='/api/reports/summary'&&method==='GET'){
 allow(req,'reports.view');const from=u.searchParams.get('from'),to=u.searchParams.get('to');
 if(from!==null||to!==null)return reply(res,200,{item:reportData.aggregate(db,from,to,u.searchParams.get('type')||'Tổng hợp tháng')});
 return reply(res,200,{summary:counts()});
}
if(parts[1]==='reports'&&id&&id!=='summary'&&method==='GET'){
 allow(req,'reports.view');const r=reportWithAuthor(find(db.reports,id,'báo cáo'));
 if(parts[3]==='pdf'){const bytes=await require('./report-pdf').reportPDF(r,uploadsDir);res.writeHead(200,{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${r.id.replace(/[^A-Za-z0-9_-]/g,'')}.pdf"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});return res.end(bytes);}
 return reply(res,200,{item:r});
}
function reportUploads(files){
 if(files===undefined)return {urls:[],details:[]};if(!Array.isArray(files)||files.length>6)error(400,'Chỉ được tải lên tối đa 6 tệp');
 if(files.reduce((sum,f)=>sum+Buffer.from(String(f?.data||'').split(',')[1]||'','base64').length,0)>8_000_000)error(400,'Tổng dung lượng tệp tối đa 8 MB');
 const urls=[],details=[];try{for(const file of files){const url=storeFile(file,'report',2_000_000);if(!url)error(400,'Tệp đính kèm không hợp lệ');urls.push(url);details.push({url,name:clean(file.name)||path.basename(url),mime:file.mime,size:Buffer.from(file.data.split(',')[1],'base64').length});}return {urls,details};}catch(e){for(const url of urls){try{fs.unlinkSync(path.join(uploadsDir,path.basename(url)))}catch{}}throw e;}
}
function rollbackReportFiles(uploaded){for(const url of uploaded.urls){try{fs.unlinkSync(path.join(uploadsDir,path.basename(url)))}catch{}}try{fs.unlinkSync(dataFile+'.tmp')}catch{}}
if(p==='/api/reports'&&method==='POST'){
 const actor=allow(req,'reports.edit'),a=await read();reportData.validate(a.from,a.to,a.type);const type=required(a.type,'loại báo cáo');
 const generated=a.generated?reportData.aggregate(db,a.from,a.to,type):null;if(generated&&!generated.hasData)error(400,'Chưa có dữ liệu.');
 const content=generated?generated.sections.map(s=>`${s.number}. ${s.title}\n${s.text}`).join('\n\n'):clean(a.content,10000),notes=clean(a.notes,10000);
 const uploaded=reportUploads(a.files),row={id:nextId(db.reports,'BC'),type,from:a.from,to:a.to,content,notes,files:uploaded.urls,fileDetails:uploaded.details,status:a.confirm?'Đã lưu':'Bản nháp',author:actor.id,authorName:actor.name,created:current(),updated:current(),summary:counts(),...(generated?{reportData:generated}:{})};
 const previous=[...db.reports],history=[...db.history];try{db.reports.unshift(row);log(actor,'Lập báo cáo',row.id);save();}catch(e){db.reports=previous;db.history=history;rollbackReportFiles(uploaded);throw e;}return reply(res,201,{item:row,message:a.confirm?'Lưu thành công!':'Đã giữ bản nháp'});
}
if(parts[1]==='reports'&&id&&method==='PATCH'){
 const actor=allow(req,'reports.edit'),r=find(db.reports,id,'báo cáo'),a=await read(),changes={};
 if(Object.hasOwn(a,'content')&&!r.reportData)changes.content=clean(a.content,10000);
 if(Object.hasOwn(a,'notes'))changes.notes=clean(a.notes,10000);if(Object.hasOwn(a,'confirm'))changes.status=a.confirm?'Đã lưu':'Bản nháp';
 if(Array.isArray(a.files)&&r.files.length+a.files.length>6)error(400,'Chỉ được tải lên tối đa 6 tệp');
 const existingSize=(r.files||[]).reduce((sum,url)=>{if(!/^\/uploads\/[a-zA-Z0-9._-]+$/.test(url))return sum;try{return sum+fs.statSync(path.join(uploadsDir,path.basename(url))).size;}catch{return sum;}},0);
 if(Array.isArray(a.files)&&a.files.length&&existingSize+a.files.reduce((sum,f)=>sum+Buffer.from(String(f?.data||'').split(',')[1]||'','base64').length,0)>8_000_000)error(400,'Tổng dung lượng tệp tối đa 8 MB');
 const uploaded=reportUploads(a.files),previous=structuredClone(r),history=[...db.history];
 try{Object.assign(r,changes);r.files.push(...uploaded.urls);r.fileDetails=[...(r.fileDetails||[]),...uploaded.details];r.updated=current();log(actor,'Chỉnh sửa báo cáo',id);save();}catch(e){for(const key of Object.keys(r))delete r[key];Object.assign(r,previous);db.history=history;rollbackReportFiles(uploaded);throw e;}return reply(res,200,{message:'Cập nhật thành công!',item:r});
}
if(p==='/api/history'&&method==='GET'){allow(req,'history.view');const from=norm(u.searchParams.get('from')),to=norm(u.searchParams.get('to'));if((from&&!date(from))||(to&&!date(to))||(from&&to&&from>to))error(400,'Khoảng thời gian không hợp lệ!');const items=db.history.filter(x=>(!from||x.time.slice(0,10)>=from)&&(!to||x.time.slice(0,10)<=to)).sort((a,b)=>String(b.time).localeCompare(String(a.time))||String(b.id).localeCompare(String(a.id))); return reply(res,200,{items});}
error(404,'Không tìm thấy API');}
function serve(req,res,u){const pathname=u.pathname==='/'?'index.html':u.pathname.slice(1);const file=path.resolve(root,decodeURIComponent(pathname));const fileUpload=u.pathname.startsWith('/uploads/')?path.resolve(uploadsDir,u.pathname.slice(9)):null;const full=fileUpload||file;const allowed=fileUpload?full.startsWith(uploadsDir+path.sep):full.startsWith(root+path.sep);if(!allowed||!fs.existsSync(full)||!fs.statSync(full).isFile()){res.writeHead(404);res.end('Not found');return;}
if(fileUpload&&!tokenUser(req)){/* for demo images only: browser img cannot send bearer header; hashed URL is opaque */}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.pdf':'application/pdf','.woff2':'font/woff2'};const ext=path.extname(full);res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':fileUpload?'private, max-age=300':'no-cache'});fs.createReadStream(full).pipe(res);}
const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost');if(u.pathname.startsWith('/api/'))return await route(req,res,u);if(req.method!=='GET')error(405,'Method không được hỗ trợ');return serve(req,res,u);}catch(e){if(e.status!==401&&e.status!==403)console.error('[LIGHTHOUSE]',e.message);if(!res.headersSent)reply(res,e.status||500,{error:e.status?e.message:'Đã xảy ra lỗi hệ thống!'});else res.end()}});
if(require.main===module)server.listen(PORT,'0.0.0.0',()=>console.log('LIGHTHOUSE UC01–UC11 demo:',`http://localhost:${PORT}`));
module.exports={server,db};
