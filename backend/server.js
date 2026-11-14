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
function required(v,name){const x=clean(v);if(!x)error(400,`Vui lòng nhập ${name}`);return x;}
function date(v){return /^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(new Date(v+'T00:00:00Z').getTime())}
function same(v,q){return norm(v).toLocaleLowerCase('vi').includes(q.toLocaleLowerCase('vi'))}
function find(rows,id,what){const r=rows.find(o=>o.id===id);if(!r)error(404,`Không tìm thấy ${what}`);return r;}
function body(req){return new Promise((resolve,reject)=>{let s='',bytes=0;req.on('data',v=>{bytes+=v.length;if(bytes>limitBytes){reject(Object.assign(new Error('Dữ liệu quá lớn'),{status:413}));req.destroy();return;}s+=v});req.on('end',()=>{try{resolve(s?JSON.parse(s):{})}catch{reject(Object.assign(new Error('JSON không hợp lệ'),{status:400}))}});req.on('error',reject)});}
function hash(pass,salt=crypto.randomBytes(16).toString('hex')){return salt+':'+crypto.scryptSync(pass,salt,64).toString('hex')}
function validatePassword(pass,stored){try{const [salt]=stored.split(':');return crypto.timingSafeEqual(Buffer.from(hash(pass,salt).split(':')[1],'hex'),Buffer.from(stored.split(':')[1],'hex'))}catch{return false}}
function publicUser(u){if(!u)return null;const {passwordHash,...rest}=u;return rest}
const MANAGER_ROLES=['QuanLy','GiamDoc','CanBo'];
function tokenUser(req){const t=(req.headers.authorization||'').replace(/^Bearer /,'');const ses=sessions.get(t);if(!ses||ses.expires<Date.now())return null;return db.users.find(x=>x.id===ses.id&&x.active)||null;}
function user(req){const u=tokenUser(req);if(!u)error(401,'Vui lòng đăng nhập');return u;}
function can(u,permission){return grants.has(u.permissions||[],permission)}
function allow(req,permission){const u=user(req);if(u.role==='SinhVien'||!can(u,permission))error(403,'Bạn không có quyền thực hiện chức năng này');return u;}
function admin(req){const u=user(req);if(!['QuanLy','GiamDoc'].includes(u.role)||!can(u,'users.manage'))error(403,'Chỉ quản lý được phân quyền cao mới có thể thực hiện');return u;}
function validateGrants(value,role){
 if(!Array.isArray(value)||value.some(k=>typeof k!=='string'||!['*','students.edit','rooms.edit','history.view','users.view','registrations.view','grades.view',...grants.items.map(i=>i[0])].includes(k)))error(400,'Quyền không hợp lệ!');
 if(value.includes('users.manage')&&!['QuanLy','GiamDoc'].includes(role))error(400,'Chỉ quản lý hoặc giám đốc được cấp quyền quản lý người dùng!');
 if(value.includes('*')&&!['QuanLy','GiamDoc'].includes(role))error(400,'Vai trò không được cấp toàn quyền!');
 return role==='SinhVien'?[]:[...new Set(value)];
}
function log(u,action,subject){db.history.unshift({id:nextId(db.history,'LS'),userId:u.id,actor:u.name,action,subject,time:current()});}
function studentDocuments(s){const registration=db.registrations.find(r=>r.id===s.registrationId);return (s.files?.length?s.files:registration?.documents?.length?registration.documents:registration?.files||[]).map((f,i)=>typeof f==='string'?{url:f,name:'Giấy tờ liên quan '+(i+1),created:registration?.created||s.joined}:f);}
function studentScope(u,s){return u.role!=='SinhVien'||u.studentId===s.id}
function storeFile(file,related,max=1_500_000){if(!file)return '';const mime=file.mime;const m=/^data:(image\/png|image\/jpeg|application\/pdf);base64,(.*)$/s.exec(file.data||'');if(!m||m[1]!==mime)error(400,'Định dạng không phù hợp!');const data=Buffer.from(m[2],'base64');if(data.length===0||data.length>max)error(400,'Dung lượng tệp không hợp lệ!');const isPng=mime==='image/png'&&data.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'));
const isJpg=mime==='image/jpeg'&&data.subarray(0,3).equals(Buffer.from('ffd8ff','hex'));
const isPdf=mime==='application/pdf'&&data.subarray(0,5).toString()==='%PDF-';if(!isPng&&!isJpg&&!isPdf)error(400,'Định dạng không phù hợp!');
const ext=isPng?'.png':isJpg?'.jpg':'.pdf',filename=crypto.randomBytes(14).toString('hex')+ext;fs.writeFileSync(path.join(uploadsDir,filename),data,{flag:'wx'});return '/uploads/'+filename;}
function counts(){return {students:db.students.length,active:db.students.filter(s=>s.status!=='Đã kết thúc hỗ trợ').length,alumni:db.students.filter(s=>s.status==='Đã kết thúc hỗ trợ').length,rooms:db.rooms.length,goals:db.goals.length,grades:db.grades.length,supportAmount:db.supports.reduce((s,x)=>s+Number(x.amount||0),0)}}
async function route(req,res,u){let p=u.pathname,method=req.method,B=null;const parts=p.split('/').filter(Boolean);const id=parts[2];const read=async()=>B||(B=await body(req));
if(p==='/api/health'&&method==='GET')return reply(res,200,{status:'ok',app:'LIGHTHOUSE',mode:'JSON DEMO',users:db.users.length});
if(p==='/api/auth/login'&&method==='POST'){const a=await read();const who=db.users.find(x=>x.email.toLowerCase()===norm(a.email).toLowerCase()&&x.active);if(!who||!validatePassword(String(a.password||''),who.passwordHash))error(401,'Email hoặc mật khẩu sai!');const t=crypto.randomBytes(32).toString('hex');sessions.set(t,{id:who.id,expires:Date.now()+7*86400000});return reply(res,200,{token:t,user:publicUser(who)});}
if(p==='/api/auth/logout'&&method==='POST'){sessions.delete((req.headers.authorization||'').replace(/^Bearer /,''));return reply(res,200,{message:'Đã đăng xuất'});}
if(p==='/api/auth/me'&&method==='GET')return reply(res,200,{item:publicUser(user(req))});
if(p==='/api/auth/forgot'&&method==='POST'){
const a=await read(),email=norm(a.email).toLowerCase();if(!/^\S+@\S+\.\S+$/.test(email))error(400,'Email không hợp lệ');
const account=db.users.find(x=>x.email.toLowerCase()===email&&x.active);let code=null;
if(!account)error(404,'Kiểm tra lại địa chỉ Email');
if(account){
const old=db.otps.find(x=>x.userId===account.id);if(old?.resendAt>Date.now())error(429,'Vui lòng chờ trước khi gửi lại mã');
code=String(crypto.randomInt(1000,10000));db.otps=db.otps.filter(x=>x.userId!==account.id);
db.otps.push({userId:account.id,hash:crypto.createHash('sha256').update(code).digest('hex'),expiry:Date.now()+5*60000,resendAt:Date.now()+60000,attempts:0});save();
}
const [local,domain]=email.split('@');
return reply(res,200,{message:'Nếu email tồn tại, hệ thống đã tạo mã xác minh. Bản thử nghiệm không gửi email.',maskedEmail:local.slice(0,2)+'**@'+domain,resendAfter:60,demoCode:(process.env.DEMO_ONLY==='1'||process.env.NODE_ENV!=='production')?code:undefined});
}
if(p==='/api/auth/verify'&&method==='POST'){
const a=await read(),account=db.users.find(x=>x.email.toLowerCase()===norm(a.email).toLowerCase()&&x.active),otp=account&&db.otps.find(x=>x.userId===account.id);
if(!otp)error(400,'Mã xác thực không hợp lệ');
if(otp.expiry<=Date.now())error(400,'Mã xác thực hết hạn!');
if(otp.verifiedHash||otp.attempts>=5)error(400,'Mã xác thực không hợp lệ');
if(!/^\d{4}$/.test(norm(a.code))||otp.hash!==crypto.createHash('sha256').update(norm(a.code)).digest('hex')){otp.attempts=(otp.attempts||0)+1;save();error(400,'Mã xác thực không hợp lệ');}
const resetToken=crypto.randomBytes(32).toString('hex');otp.verifiedHash=crypto.createHash('sha256').update(resetToken).digest('hex');save();return reply(res,200,{resetToken});
}
if(p==='/api/auth/reset'&&method==='POST'){
const a=await read(),account=db.users.find(x=>x.email.toLowerCase()===norm(a.email).toLowerCase()&&x.active),otp=account&&db.otps.find(x=>x.userId===account.id);
if(!otp||otp.expiry<=Date.now()||!otp.verifiedHash||otp.verifiedHash!==crypto.createHash('sha256').update(norm(a.resetToken)).digest('hex'))error(400,'Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
const password=String(a.password||'');if(password.length<8||!/[A-Z]/.test(password)||!/[a-z]/.test(password)||!/[0-9]/.test(password)||!/[^A-Za-z0-9\s]/.test(password))error(400,'Mật khẩu không hợp lệ!');
account.passwordHash=hash(password);db.otps=db.otps.filter(x=>x!==otp);for(const [key,session] of sessions)if(session.id===account.id)sessions.delete(key);save();return reply(res,200,{message:'Đổi mật khẩu thành công!'});
}
if(p==='/api/registrations'&&method==='POST'){
const a=await read(),name=required(a.name,'họ tên'),email=required(a.email,'email').toLowerCase(),phone=required(a.phone,'số điện thoại'),school=required(a.school,'trường'),major=required(a.major,'ngành');
if(!/^\S+@\S+\.\S+$/.test(email))error(400,'Email không hợp lệ');
if(!/^0\d{9}$/.test(phone))error(400,'Số điện thoại không hợp lệ');
const dob=clean(a.dob,10),cccd=clean(a.cccd);
if(cccd&&!/^\d{12}$/.test(cccd))error(400,'Số căn cước công dân phải gồm 12 chữ số');
if(dob&&(!/^\d{4}-\d{2}-\d{2}$/.test(dob)||!Number.isFinite(Date.parse(dob))||new Date(dob).toISOString().slice(0,10)!==dob||dob>today()))error(400,'Ngày sinh không hợp lệ');
if(db.registrations.some(r=>r.email.toLowerCase()===email&&r.status!=='Từ chối'))error(409,'Email đã có hồ sơ đăng ký');
for(const key of ['files','familyFiles','schoolFiles'])if(a[key]!==undefined&&!Array.isArray(a[key]))error(400,'Danh sách tệp không hợp lệ');
const family=a.familyFiles||[],education=a.schoolFiles||[],legacy=a.files||[];
if(family.length+education.length+legacy.length>6)error(400,'Chỉ được tải lên tối đa 6 tệp');
const written=[],documents=[];const upload=(f,group)=>{const url=storeFile(f,'registration');if(!url)error(400,'Tệp minh chứng không hợp lệ');written.push(url);documents.push({url,name:clean(f.name)||'Giấy tờ minh chứng',group,created:current()});return url;};
let familyFiles,schoolFiles,files;
try{familyFiles=family.map(f=>upload(f,'family'));schoolFiles=education.map(f=>upload(f,'school'));files=[...familyFiles,...schoolFiles,...legacy.map(f=>upload(f,'family'))];}
catch(e){for(const url of written)fs.unlinkSync(path.join(uploadsDir,path.basename(url)));throw e;}
const item={id:nextId(db.registrations,'HS'),name,email,phone,dob,cccd,hometown:clean(a.hometown),address:clean(a.address),school,major,family:clean(a.family,2000),description:clean(a.description,5000),files,familyFiles,schoolFiles,documents,status:'Chờ kiểm tra',note:'',created:today()};
db.registrations.push(item);save();return reply(res,201,{item,message:'Đăng ký thành công!'});
}
if(p==='/api/registrations'&&method==='GET'){allow(req,'registrations.view');const q=norm(u.searchParams.get('q'));return reply(res,200,{items:db.registrations.filter(r=>!q||same(r.name,q)||same(r.id,q)||same(r.status,q))});}
if(parts[1]==='registrations'&&id&&parts.length===3&&method==='PATCH'){
const actor=allow(req,'registrations.review'),a=await read(),r=find(db.registrations,id,'hồ sơ');
if(r.status==='Đã tiếp nhận')error(409,'Hồ sơ đã được tiếp nhận');
if(!['Đạt yêu cầu','Chờ kiểm tra','Chờ bổ sung','Từ chối'].includes(a.status))error(400,'Trạng thái không hợp lệ');
const note=Object.hasOwn(a,'note')?clean(a.note,1000):r.note||'';
if(a.status==='Chờ bổ sung'&&!note.trim())error(400,'Vui lòng nhập thông tin cần bổ sung.');
r.status=a.status;r.note=note;log(actor,'Xử lý hồ sơ',r.id+' → '+r.status);save();return reply(res,200,{item:r,message:'Đã lưu thành công!'});
}
if(parts[1]==='registrations'&&id&&parts[3]==='accept'&&method==='POST'){const actor=allow(req,'registrations.review'),r=find(db.registrations,id,'hồ sơ');if(db.students.some(s=>s.registrationId===id))error(409,'Hồ sơ đã được tiếp nhận');if(r.status!=='Đạt yêu cầu')error(400,'Hồ sơ chưa đủ điều kiện tiếp nhận!');const studentId=nextId(db.students,'LH'),usrId=nextId(db.users,'ND');const temp='Temp@'+crypto.randomInt(100000,999999);const stud={id:studentId,registrationId:r.id,userId:usrId,name:r.name,email:r.email,cccd:r.cccd,dob:r.dob,hometown:r.hometown,address:r.address,phone:r.phone,cohort:'',studentCode:'',school:r.school,major:r.major,family:r.family,room:null,status:'Đang hỗ trợ',joined:today(),endDate:'',endReason:''};db.students.push(stud);db.users.push({id:usrId,name:r.name,email:r.email,role:'SinhVien',studentId,permissions:[],passwordHash:hash(temp),active:true});r.status='Đã tiếp nhận';log(actor,'Tiếp nhận hồ sơ',r.id+' / '+studentId);save();return reply(res,201,{item:stud,demoStudentPassword:process.env.NODE_ENV==='production'?undefined:temp,message:'Đã tạo hồ sơ sinh viên thành công!'});}
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
if(Object.hasOwn(a,'status')){if(!['Đang hỗ trợ','Tạm dừng hỗ trợ','Đã kết thúc hỗ trợ'].includes(a.status))error(400,'Trạng thái hỗ trợ không hợp lệ');changes.status=a.status;if(a.status==='Đã kết thúc hỗ trợ'){changes.endDate=clean(a.endDate,10)||today();changes.endReason=clean(a.endReason);changes.room=null;}}
(db.studentRevisions||=[]).push({id:nextId(db.studentRevisions||[],'RV'),studentId:s.id,userId:actor.id,time:current(),before:JSON.parse(JSON.stringify(s))});
Object.assign(s,changes);log(actor,'Chỉnh sửa hồ sơ',s.id);save();return reply(res,200,{item:s,message:'Lưu hồ sơ thành công!'});
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
if(parts[1]==='rooms'&&id&&method==='PUT'){const actor=allow(req,'rooms.assign'),r=find(db.rooms,id,'phòng'),a=await read(),ids=Array.isArray(a.studentIds)?[...new Set(a.studentIds)]:[];if(ids.length>r.capacity)error(400,'Phòng đầy!');for(const sId of ids){const s=find(db.students,sId,'sinh viên');if(s.status==='Đã kết thúc hỗ trợ')error(400,'Không thể xếp Alumni vào phòng');}for(const s of db.students)if(s.room===id&&!ids.includes(s.id))s.room=null;for(const sId of ids)find(db.students,sId,'sinh viên').room=id;log(actor,'Sửa bố trí phòng',id);save();return reply(res,200,{message:'Cập nhật thành công!'});}
if(parts[1]==='rooms'&&id&&method==='DELETE'){const actor=allow(req,'rooms.delete');find(db.rooms,id,'phòng');db.rooms=db.rooms.filter(x=>x.id!==id);for(const s of db.students)if(s.room===id)s.room=null;log(actor,'Xóa phòng',id);save();return reply(res,200,{message:'Xóa phòng thành công!'});}
if(p==='/api/images'&&method==='POST'){const actor=allow(req,'students.edit'),a=await read();find(db.students,a.studentId,'sinh viên');if(!['image/png','image/jpeg'].includes(a.file?.mime))error(400,'Định dạng không phù hợp!');const url=storeFile(a.file,a.studentId);if(!url.startsWith('/uploads/'))error(400,'Thiếu ảnh');const row={id:nextId(db.images,'HA'),studentId:a.studentId,url,created:current()};db.images.push(row);log(actor,'Thêm hình ảnh',a.studentId);save();return reply(res,201,{item:row,message:'Tải ảnh thành công!'});}
if(parts[1]==='images'&&id&&method==='DELETE'){const actor=allow(req,'students.edit'),img=find(db.images,id,'hình ảnh');db.images=db.images.filter(x=>x.id!==id);try{fs.unlinkSync(path.join(uploadsDir,path.basename(img.url)))}catch{}log(actor,'Xóa hình ảnh',img.studentId);save();return reply(res,200,{message:'Đã xóa hình ảnh!'});}
if(p==='/api/goals'&&method==='GET'){const actor=user(req),q=norm(u.searchParams.get('q'));if(actor.role!=='SinhVien'&&!can(actor,'goals.view'))error(403,'Không có quyền xem mục tiêu');return reply(res,200,{items:db.goals.filter(g=>(actor.role!=='SinhVien'||g.studentId===actor.studentId)&&(!q||same(g.name,q)||same(g.studentId,q))).map(g=>({...g,studentName:db.students.find(x=>x.id===g.studentId)?.name}))});}
if(p==='/api/goals'&&method==='POST'){const actor=user(req);if(actor.role!=='SinhVien')error(403,'Chức năng dành cho sinh viên');const a=await read(),row={id:nextId(db.goals,'MT'),studentId:actor.studentId,name:required(a.name,'mục tiêu'),detail:required(a.detail,'chi tiết'),sent:today(),status:'Chờ đánh giá',feedback:''};db.goals.push(row);log(actor,'Gửi mục tiêu',row.id);save();return reply(res,201,{message:'Đã gửi mục tiêu!',item:row});}
if(parts[1]==='goals'&&id&&parts[3]==='review'&&method==='PATCH'){const actor=allow(req,'goals.review'),row=find(db.goals,id,'mục tiêu'),a=await read();if(!['Đạt','Chưa đạt','Chờ bổ sung'].includes(a.status))error(400,'Đánh giá không hợp lệ');row.status=a.status;row.feedback=clean(a.feedback,1000);log(actor,'Đánh giá mục tiêu',id);save();return reply(res,200,{message:'Cập nhật thành công!',item:row});}
if(parts[1]==='goals'&&id&&parts[3]==='resubmit'&&method==='PATCH'){const actor=user(req),row=find(db.goals,id,'mục tiêu');if(actor.role!=='SinhVien'||actor.studentId!==row.studentId||row.status!=='Chờ bổ sung')error(403,'Không thể gửi lại mục tiêu');const a=await read();row.name=required(a.name,'mục tiêu');row.detail=required(a.detail,'chi tiết');row.status='Chờ đánh giá';row.sent=today();log(actor,'Gửi lại mục tiêu',id);save();return reply(res,200,{message:'Đã gửi mục tiêu!'});}
if(p==='/api/grades'&&method==='GET'){const actor=user(req);if(actor.role!=='SinhVien'&&!can(actor,'grades.view'))error(403,'Không có quyền xem kết quả học tập');return reply(res,200,{items:db.grades.filter(g=>actor.role!=='SinhVien'||g.studentId===actor.studentId).map(g=>({...g,studentName:db.students.find(x=>x.id===g.studentId)?.name}))});}
if(p==='/api/grades'&&method==='POST'){const actor=user(req);if(actor.role!=='SinhVien')error(403,'Chỉ sinh viên gửi kết quả học tập');const a=await read(),gpa=Number(a.gpa),debts=Number(a.debts);if(!(gpa>=0&&gpa<=4)||!Number.isInteger(debts)||debts<0)error(400,'GPA hoặc số môn nợ không hợp lệ');const row={id:nextId(db.grades,'KQ'),studentId:actor.studentId,term:required(a.term,'học kỳ'),year:required(a.year,'năm học'),gpa,rank:clean(a.rank),debts,certificates:clean(a.certificates),evidence:a.evidenceFile?storeFile(a.evidenceFile,'grade'):'',status:'Chờ xét duyệt',requestNote:'',sent:today()};db.grades.push(row);log(actor,'Gửi kết quả học tập',row.id);save();return reply(res,201,{message:'Gửi thành công!',item:row});}
if(parts[1]==='grades'&&id&&parts[3]==='review'&&method==='PATCH'){const actor=allow(req,'grades.review'),row=find(db.grades,id,'kết quả học tập'),a=await read();if(!['Hợp lệ','Yêu cầu gửi lại'].includes(a.status))error(400,'Trạng thái không hợp lệ');const note=clean(a.note,1000);if(a.status==='Yêu cầu gửi lại'&&!note)error(400,'Vui lòng nhập nội dung yêu cầu bổ sung.');row.status=a.status;row.requestNote=note;log(actor,'Xét duyệt KQHT',id);save();return reply(res,200,{message:a.status==='Hợp lệ'?'Cập nhật thành công!':'Gửi yêu cầu thành công!'});}
if(parts[1]==='grades'&&id&&parts[3]==='resubmit'&&method==='PATCH'){const actor=user(req),row=find(db.grades,id,'kết quả học tập');if(actor.role!=='SinhVien'||row.studentId!==actor.studentId||row.status!=='Yêu cầu gửi lại')error(403,'Không thể gửi lại KQHT');const a=await read(),gpa=Number(a.gpa),debts=Number(a.debts);if(!(gpa>=0&&gpa<=4)||!Number.isInteger(debts)||debts<0)error(400,'GPA hoặc số môn nợ không hợp lệ');Object.assign(row,{term:required(a.term,'học kỳ'),year:required(a.year,'năm học'),gpa,rank:clean(a.rank),debts,certificates:clean(a.certificates),status:'Chờ xét duyệt',sent:today()});if(a.evidenceFile)row.evidence=storeFile(a.evidenceFile,'grade');log(actor,'Bổ sung KQHT',id);save();return reply(res,200,{message:'Gửi thành công!'});}
if(p==='/api/supports'&&method==='GET'){const actor=user(req);if(actor.role!=='SinhVien'&&!can(actor,'students.view'))error(403,'Không có quyền xem hỗ trợ');return reply(res,200,{items:db.supports.filter(s=>actor.role!=='SinhVien'||s.studentId===actor.studentId)});}
if(p==='/api/supports'&&method==='POST'){const actor=allow(req,'students.edit'),a=await read();find(db.students,a.studentId,'sinh viên');const row={id:nextId(db.supports,'HT'),studentId:a.studentId,name:required(a.name,'tên hỗ trợ'),type:clean(a.type),amount:Number(a.amount||0),date:date(a.date)?a.date:today(),evidence:''};if(row.amount<0)error(400,'Số tiền không hợp lệ');db.supports.push(row);log(actor,'Thêm hỗ trợ',row.studentId);save();return reply(res,201,{message:'Cập nhật thành công!'});}
if(p==='/api/users'&&method==='GET'){allow(req,'users.view');return reply(res,200,{items:db.users.map(publicUser)});}
if(p==='/api/users'&&method==='POST'){
 const actor=admin(req),a=await read(),email=required(a.email,'email').toLowerCase();
 if(!/^\S+@\S+\.\S+$/.test(email))error(400,'Email không hợp lệ!');
 if(db.users.some(x=>x.email.toLowerCase()===email))error(409,'Email đã tồn tại!');
 const name=required(a.name,'họ tên');if(!['QuanLy','CanBo','GiamDoc','SinhVien'].includes(a.role))error(400,'Vai trò không hợp lệ');
 const permissions=validateGrants(a.permissions,a.role),password=a.password===undefined?'Temp@'+crypto.randomBytes(16).toString('hex'):String(a.password);
 if(password.length<8)error(400,'Mật khẩu cần tối thiểu 8 ký tự');
 const row={id:nextId(db.users,'ND'),name,email,role:a.role,studentId:null,permissions,passwordHash:hash(password),active:true};
 db.users.push(row);log(actor,'Thêm người dùng',row.id);save();return reply(res,201,{message:'Cập nhật thành công!',item:publicUser(row)});
}
if(parts[1]==='users'&&id&&method==='PATCH'){
 const actor=admin(req),row=find(db.users,id,'người dùng'),a=await read(),changes={};
 if(Object.hasOwn(a,'name'))changes.name=required(a.name,'họ tên');
 const role=a.role===undefined?row.role:a.role;if(!['QuanLy','CanBo','GiamDoc','SinhVien'].includes(role))error(400,'Vai trò không hợp lệ');
 changes.role=role;changes.permissions=validateGrants(a.permissions===undefined?row.permissions:a.permissions,role);
 if(Object.hasOwn(a,'active'))changes.active=!!a.active;
 if(actor.id===id&&(!['QuanLy','GiamDoc'].includes(role)||!grants.has(changes.permissions,'users.manage')||changes.active===false))error(400,'Không thể tự thu hồi quyền quản lý đang sử dụng!');
 Object.assign(row,changes);log(actor,'Sửa phân quyền',id);save();return reply(res,200,{message:'Cập nhật thành công!',item:publicUser(row)});
}
if(parts[1]==='users'&&id&&method==='DELETE'){
 const actor=admin(req);if(actor.id===id)error(400,'Không thể tự xóa tài khoản đang đăng nhập');
 const row=find(db.users,id,'người dùng');row.permissions=[];row.active=false;
 for(const [key,session] of sessions)if(session.id===id)sessions.delete(key);
 log(actor,'Xóa phân quyền',id);save();return reply(res,200,{message:'Xóa thành công!'});
}
if(p==='/api/reports'&&method==='GET'){allow(req,'reports.view');return reply(res,200,{items:db.reports.map(r=>({...r,authorName:db.users.find(u=>u.id===r.author)?.name}))});}
if(p==='/api/reports/summary'&&method==='GET'){allow(req,'reports.view');return reply(res,200,{summary:counts()});}
if(p==='/api/reports'&&method==='POST'){const actor=allow(req,'reports.edit'),a=await read();if(!date(a.from)||!date(a.to)||a.from>a.to)error(400,'Khoảng thời gian không hợp lệ!');const row={id:nextId(db.reports,'BC'),type:required(a.type,'loại báo cáo'),from:a.from,to:a.to,content:clean(a.content,10000),notes:clean(a.notes,10000),files:Array.isArray(a.files)?a.files.slice(0,6).map(f=>storeFile(f,'report')):[],status:a.confirm?'Đã lưu':'Bản nháp',author:actor.id,created:current(),updated:current(),summary:counts()};db.reports.unshift(row);log(actor,'Lập báo cáo',row.id);save();return reply(res,201,{item:row,message:a.confirm?'Lưu thành công':'Đã giữ bản nháp'});}
if(parts[1]==='reports'&&id&&method==='PATCH'){const actor=allow(req,'reports.edit'),r=find(db.reports,id,'báo cáo'),a=await read();if(Object.hasOwn(a,'content'))r.content=clean(a.content,10000);if(Object.hasOwn(a,'notes'))r.notes=clean(a.notes,10000);if(Object.hasOwn(a,'confirm'))r.status=a.confirm?'Đã lưu':'Bản nháp';if(Array.isArray(a.files))r.files.push(...a.files.slice(0,6).map(f=>storeFile(f,'report')));r.updated=current();log(actor,'Chỉnh sửa báo cáo',id);save();return reply(res,200,{message:'Cập nhật thành công!',item:r});}
if(p==='/api/history'&&method==='GET'){allow(req,'history.view');const from=norm(u.searchParams.get('from')),to=norm(u.searchParams.get('to'));if((from&&!date(from))||(to&&!date(to))||(from&&to&&from>to))error(400,'Khoảng thời gian không hợp lệ!');const items=db.history.filter(x=>(!from||x.time.slice(0,10)>=from)&&(!to||x.time.slice(0,10)<=to));return reply(res,200,{items});}
error(404,'Không tìm thấy API');}
function serve(req,res,u){const pathname=u.pathname==='/'?'index.html':u.pathname.slice(1);const file=path.resolve(root,decodeURIComponent(pathname));const fileUpload=u.pathname.startsWith('/uploads/')?path.resolve(uploadsDir,u.pathname.slice(9)):null;const full=fileUpload||file;const allowed=fileUpload?full.startsWith(uploadsDir+path.sep):full.startsWith(root+path.sep);if(!allowed||!fs.existsSync(full)||!fs.statSync(full).isFile()){res.writeHead(404);res.end('Not found');return;}
if(fileUpload&&!tokenUser(req)){/* for demo images only: browser img cannot send bearer header; hashed URL is opaque */}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.pdf':'application/pdf','.woff2':'font/woff2'};const ext=path.extname(full);res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':fileUpload?'private, max-age=300':'no-cache'});fs.createReadStream(full).pipe(res);}
const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost');if(u.pathname.startsWith('/api/'))return await route(req,res,u);if(req.method!=='GET')error(405,'Method không được hỗ trợ');return serve(req,res,u);}catch(e){if(e.status!==401&&e.status!==403)console.error('[LIGHTHOUSE]',e.message);if(!res.headersSent)reply(res,e.status||500,{error:e.status?e.message:'Đã xảy ra lỗi hệ thống!'});else res.end()}});
if(require.main===module)server.listen(PORT,'0.0.0.0',()=>console.log('LIGHTHOUSE UC01–UC11 demo:',`http://localhost:${PORT}`));
module.exports={server,db};
