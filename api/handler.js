'use strict';
// LIGHTHOUSE – Vercel + Neon serverless adapter
// Adapted from backend/server.js; replaces JSON file storage with Neon PostgreSQL.
const { neon } = require('@neondatabase/serverless');
const crypto = require('node:crypto');
const path = require('node:path');
const grants = require('../frontend/permissions');

// ── Neon connection (reused across warm invocations) ─────────────────────────
let _sql = null;
function getSql() {
  if (!_sql) _sql = neon(process.env.DATABASE_URL);
  return _sql;
}

// ── Schema + seed (runs once per cold start) ─────────────────────────────────
let _ready = false;
async function ensureReady() {
  if (_ready) return;
  const sql = getSql();
  await Promise.all([
    sql`CREATE TABLE IF NOT EXISTS app_state(id TEXT PRIMARY KEY,data JSONB NOT NULL,updated_at TIMESTAMPTZ DEFAULT NOW())`,
    sql`CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires_at TIMESTAMPTZ NOT NULL)`,
    sql`CREATE TABLE IF NOT EXISTS uploads(filename TEXT PRIMARY KEY,mime_type TEXT NOT NULL,data TEXT NOT NULL,created_at TIMESTAMPTZ DEFAULT NOW())`,
    sql`CREATE TABLE IF NOT EXISTS otp_requests(id SERIAL PRIMARY KEY,email TEXT NOT NULL,code TEXT NOT NULL,expires_at TIMESTAMPTZ NOT NULL)`
  ]);
  const rows = await sql`SELECT id FROM app_state WHERE id='main'`;
  if (!rows.length) {
    const seed = buildSeed();
    await sql`INSERT INTO app_state(id,data) VALUES('main',${JSON.stringify(seed)})`;
  }
  _ready = true;
}

async function loadDb() {
  const r = await getSql()`SELECT data FROM app_state WHERE id='main'`;
  return r[0]?.data || {};
}
async function saveDb(db) {
  await getSql()`UPDATE app_state SET data=${JSON.stringify(db)},updated_at=NOW() WHERE id='main'`;
}

// ── Seed data ─────────────────────────────────────────────────────────────────
function buildSeed() {
  const h = p => { const s = crypto.randomBytes(16).toString('hex'); return s + ':' + crypto.scryptSync(p, s, 64).toString('hex'); };
  const now = new Date().toISOString();
  return {
    users: [
      ['ND001','Quản lý Lighthouse','quanly@lighthouse.test','QuanLy',null,['*']],
      ['ND002','Cán bộ hỗ trợ','canbo@lighthouse.test','CanBo',null,['students.view','rooms.view','registrations.view','goals.view','grades.view','alumni.view','reports.view','history.view']],
      ['ND003','Sinh viên Demo','sinhvien@lighthouse.test','SinhVien','LH001',[]],
      ['ND004','Giám đốc Demo','giamdoc@lighthouse.test','GiamDoc',null,['*']]
    ].map(([id,name,email,role,studentId,permissions])=>({id,name,email,role,studentId,permissions,passwordHash:h('Demo@123'),active:true})),
    students:[
      {id:'LH001',registrationId:'HS001',userId:'ND003',name:'Nguyễn Minh An',cccd:'',dob:'2004-06-12',hometown:'Quảng Nam',address:'Đà Nẵng',phone:'0900000001',email:'sinhvien@lighthouse.test',cohort:'2022-2026',studentCode:'SV001',school:'Đại học Bách khoa - Đại học Đà Nẵng',major:'Công nghệ thông tin',family:'Hộ khó khăn',room:'A101',status:'Đang hỗ trợ',joined:'2024-09-01',endDate:'',endReason:''},
      {id:'LH002',registrationId:'HS002',userId:null,name:'Trần Thanh Bình',cccd:'',dob:'2003-03-22',hometown:'Quảng Ngãi',address:'Đà Nẵng',phone:'0900000002',email:'teststudent2@example.test',cohort:'2021-2025',studentCode:'SV002',school:'Đại học Kinh tế - Đại học Đà Nẵng',major:'Marketing',family:'Hộ cận nghèo',room:'A101',status:'Đang hỗ trợ',joined:'2023-09-01',endDate:'',endReason:''},
      {id:'LH003',registrationId:'HS003',userId:null,name:'Lê Thu Hà',cccd:'',dob:'2005-02-02',hometown:'Huế',address:'Đà Nẵng',phone:'0900000003',email:'teststudent3@example.test',cohort:'2023-2027',studentCode:'SV003',school:'Đại học Sư phạm - Đại học Đà Nẵng',major:'Sư phạm',family:'Hộ khó khăn',room:'A102',status:'Đang hỗ trợ',joined:'2025-08-01',endDate:'',endReason:''},
      {id:'LH004',registrationId:'HS004',userId:null,name:'Phạm Ngọc Lan',cccd:'',dob:'2001-09-17',hometown:'Quảng Bình',address:'Đà Nẵng',phone:'0900000004',email:'teststudent4@example.test',cohort:'2019-2023',studentCode:'SV004',school:'Đại học Ngoại ngữ - Đại học Đà Nẵng',major:'Ngôn ngữ Anh',family:'Hộ khó khăn',room:null,status:'Đã kết thúc hỗ trợ',joined:'2020-09-01',endDate:'2025-07-01',endReason:'Đã tốt nghiệp'}
    ],
    registrations:[
      {id:'HS001',name:'Nguyễn Minh An',email:'sinhvien@lighthouse.test',phone:'0900000001',dob:'2004-06-12',cccd:'',hometown:'Quảng Nam',address:'Đà Nẵng',school:'Đại học Bách khoa',major:'Công nghệ thông tin',family:'Hộ khó khăn',description:'',files:[],documents:[],status:'Đã tiếp nhận',note:'',created:'2024-09-01'},
      {id:'HS002',name:'Trần Thanh Bình',email:'teststudent2@example.test',phone:'0900000002',dob:'2003-03-22',cccd:'',hometown:'Quảng Ngãi',address:'Đà Nẵng',school:'Đại học Kinh tế',major:'Marketing',family:'Hộ cận nghèo',description:'',files:[],documents:[],status:'Đã tiếp nhận',note:'',created:'2023-09-01'},
      {id:'HS003',name:'Lê Thu Hà',email:'teststudent3@example.test',phone:'0900000003',dob:'2005-02-02',cccd:'',hometown:'Huế',address:'Đà Nẵng',school:'Đại học Sư phạm',major:'Sư phạm',family:'Hộ khó khăn',description:'',files:[],documents:[],status:'Đã tiếp nhận',note:'',created:'2025-08-01'},
      {id:'HS004',name:'Phạm Ngọc Lan',email:'teststudent4@example.test',phone:'0900000004',dob:'2001-09-17',cccd:'',hometown:'Quảng Bình',address:'Đà Nẵng',school:'Đại học Ngoại ngữ',major:'Ngôn ngữ Anh',family:'Hộ khó khăn',description:'',files:[],documents:[],status:'Đã tiếp nhận',note:'',created:'2020-09-01'},
      {id:'HS005',name:'Đỗ Mai Chi',email:'maychi@example.test',phone:'0900000005',dob:'2006-05-05',cccd:'',hometown:'Quảng Trị',address:'Đà Nẵng',school:'Đại học Kinh tế',major:'Kế toán',family:'Hộ khó khăn',description:'Cần hỗ trợ chỗ ở',files:[],documents:[],status:'Chờ kiểm tra',note:'',created:now.slice(0,10)}
    ],
    rooms:[{id:'A101',capacity:6},{id:'A102',capacity:6},{id:'B101',capacity:6}],
    images:[],
    goals:[
      {id:'MT001',studentId:'LH001',name:'Hoàn thành các học phần',detail:'Đạt GPA tối thiểu 3.0 trong học kỳ tới',sent:'2026-09-20',status:'Chờ đánh giá',feedback:''},
      {id:'MT002',studentId:'LH002',name:'Tiếng Anh B1',detail:'Ôn luyện và thi chứng chỉ tiếng Anh B1',sent:'2026-09-22',status:'Chờ đánh giá',feedback:''}
    ],
    grades:[
      {id:'KQ001',studentId:'LH001',term:'1',year:'2025-2026',gpa:3.45,rank:'Giỏi',debts:0,certificates:'Tiếng Anh B1',evidence:'',evidenceFiles:[],status:'Chờ xét duyệt',requestNote:'',sent:'2026-09-21'},
      {id:'KQ002',studentId:'LH002',term:'2',year:'2025-2026',gpa:3.2,rank:'Giỏi',debts:0,certificates:'Tin học',evidence:'',evidenceFiles:[],status:'Chờ xét duyệt',requestNote:'',sent:'2026-09-25'}
    ],
    supports:[
      {id:'HT001',studentId:'LH001',name:'Học phí kỳ 1',type:'Học phí',amount:3000000,date:'2026-06-10',evidence:'',evidenceFiles:[]},
      {id:'HT002',studentId:'LH003',name:'Mua sách vở',type:'Chi phí khác',amount:450000,date:'2026-08-21',evidence:'',evidenceFiles:[]}
    ],
    reports:[
      {id:'BC001',type:'Tổng hợp tháng',from:'2026-10-01',to:'2026-10-31',content:'Tổng hợp hoạt động hỗ trợ sinh viên trong tháng.',notes:'Báo cáo minh họa.',files:[],fileDetails:[],status:'Đã lưu',author:'ND001',authorName:'Quản lý Lighthouse',created:now,updated:now}
    ],
    history:[{id:'LS001',userId:'ND001',actor:'Quản lý Lighthouse',action:'Tạo phòng',subject:'A101',time:now}],
    goalRevisions:[],gradeRevisions:[],studentRevisions:[],otps:[]
  };
}

// ── Main Vercel export ────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  try {
    await ensureReady();
  } catch (e) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Database init failed: ' + e.message }));
    return;
  }

  const sql = getSql();
  const ROOM_CAPACITY = 6;

  // ── Upload buffers (flush to Neon at end of request) ──────────────────────
  const pendingUploads = new Map(); // filename → {mime, data}
  const deletedUploads = new Set();

  const rawToken = (req.headers.authorization || '').replace(/^Bearer /, '') ||
    (/(?:^|; )lh_media=([a-f0-9]+)/.exec(req.headers.cookie || '') || [])[1] || '';

  // ── Independent Neon reads run concurrently (one network round-trip instead of three) ──
  const [db, uploadRows, sr] = await Promise.all([
    loadDb(),
    sql`SELECT filename FROM uploads`,
    rawToken ? sql`SELECT user_id,expires_at FROM sessions WHERE token=${rawToken} AND expires_at>NOW()` : Promise.resolve([])
  ]);
  const existingUploads = new Set(uploadRows.map(r => r.filename));

  // ── Session (pre-loaded for this request) ─────────────────────────────────
  let currentSession = null;
  if (sr.length) currentSession = { id: sr[0].user_id, expires: new Date(sr[0].expires_at).getTime() };

  // ── Dirty flag ────────────────────────────────────────────────────────────
  let dirty = false;
  function save() { dirty = true; }

  // ── Helpers (adapted from server.js) ─────────────────────────────────────
  const TEXT = { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY' };
  function reply(r, status, obj) { r.writeHead(status, TEXT); r.end(JSON.stringify(obj)); }
  function error(status, msg) { const e = new Error(msg); e.status = status; throw e; }
  function nextId(rows, prefix) { let i = Math.max(0, ...rows.map(a => Number((a.id || '').replace(/\D/g, '')) || 0)); return prefix + String(i + 1).padStart(3, '0'); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function vietnamDay(value) { return new Date(Date.parse(value) + 7 * 3600000).toISOString().slice(0, 10); }
  function current() { return new Date().toISOString(); }
  function norm(v) { return String(v ?? '').trim(); }
  function clean(v, max = 500) { return norm(v).slice(0, max); }
  function required(v, name, max = 500) { const x = clean(v, max); if (!x) error(400, `Vui lòng nhập ${name}`); return x; }
  function date(v) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v; }
  function same(v, q) { return norm(v).toLocaleLowerCase('vi').includes(q.toLocaleLowerCase('vi')); }
  function find(rows, id, what) { const r = rows.find(o => o.id === id); if (!r) error(404, `Không tìm thấy ${what}`); return r; }
  function bodyParse(r) { return new Promise((resolve, reject) => { let s = '', bytes = 0; r.on('data', v => { bytes += v.length; if (bytes > 15_000_000) { reject(Object.assign(new Error('Dữ liệu quá lớn'), { status: 413 })); r.destroy(); return; } s += v; }); r.on('end', () => { try { resolve(s ? JSON.parse(s) : {}); } catch { reject(Object.assign(new Error('JSON không hợp lệ'), { status: 400 })); } }); r.on('error', reject); }); }
  function hashPw(pass, salt = crypto.randomBytes(16).toString('hex')) { return salt + ':' + crypto.scryptSync(pass, salt, 64).toString('hex'); }
  function validatePassword(pass, stored) { try { const [salt] = stored.split(':'); return crypto.timingSafeEqual(Buffer.from(hashPw(pass, salt).split(':')[1], 'hex'), Buffer.from(stored.split(':')[1], 'hex')); } catch { return false; } }
  function accountEnabled(u) { const profile = u.role === 'SinhVien' && db.students.find(s => s.id === u.studentId || s.userId === u.id); return !!u.active && !(profile && ['Đã kết thúc hỗ trợ', 'Rời trước thời hạn'].includes(profile.status)); }
  function publicUser(u) { if (!u) return null; const { passwordHash, ...rest } = u; const profile = u.role === 'SinhVien' && db.students.find(s => s.id === u.studentId); return { ...rest, active: accountEnabled(u), permissions: grants.effective(u), ...(profile ? { name: profile.name } : {}), }; }
  function tokenUser(request) {
    const t = (request.headers.authorization || '').replace(/^Bearer /, '') || (/(?:^|; )lh_media=([a-f0-9]+)/.exec(request.headers.cookie || '') || [])[1] || '';
    if (!currentSession || t !== rawToken) return null;
    if (currentSession.expires < Date.now()) return null;
    return db.users.find(x => x.id === currentSession.id && accountEnabled(x)) || null;
  }
  function user(request) { const u = tokenUser(request); if (!u) error(401, 'Vui lòng đăng nhập'); return u; }
  function can(u, permission) { return grants.hasFor(u, permission); }
  function allow(request, permission) { const u = user(request); if (u.role === 'SinhVien' || !can(u, permission)) error(403, 'Bạn không có quyền thực hiện chức năng này'); return u; }
  function admin(request) { const u = user(request); if (!['QuanLy', 'GiamDoc'].includes(u.role) || !can(u, 'users.manage')) error(403, 'Chỉ quản lý được phân quyền cao mới có thể thực hiện'); return u; }
  function validateGrants(value, role, actor, previous = null) {
    if (!Array.isArray(value) || value.some(k => typeof k !== 'string' || !grants.known.includes(k))) error(400, 'Quyền không hợp lệ!');
    if (value.some(k => !grants.allowed(role, k))) error(400, 'Vai trò không được cấp quyền đã chọn!');
    const next = [...new Set(grants.expand(value))], before = previous ? grants.effective(previous) : [];
    for (const key of grants.known) if (next.includes(key) !== before.includes(key) && !can(actor, key)) error(403, 'Bạn không có quyền cấp hoặc thu hồi quyền đã chọn');
    return next;
  }
  function accountPassword(value) { const p = typeof value === 'string' ? value : ''; if (!p || p.length < 4 || p.length > 128 || /\s/.test(p)) error(400, 'Mật khẩu cần từ 4 đến 128 ký tự, không chứa khoảng trắng'); return p; }
  function validateRegistration(a) {
    const labels = { name: 'họ tên', dob: 'ngày sinh', hometown: 'quê quán', address: 'địa chỉ thường trú', phone: 'số điện thoại', email: 'email', cccd: 'số căn cước công dân', family: 'hoàn cảnh gia đình', school: 'trường', major: 'ngành', description: 'mô tả ngành học' };
    const data = {}; for (const [key, label] of Object.entries(labels)) data[key] = required(a[key], label, key === 'description' ? 5000 : key === 'family' ? 2000 : 500);
    if (!/^\S+@\S+\.\S+$/.test(data.email)) error(400, 'Email không hợp lệ');
    if (!/^0[0-9]{9}$/.test(String(a.phone || ''))) error(400, 'Số điện thoại không hợp lệ');
    if (!/^\d{12}$/.test(data.cccd)) error(400, 'Số căn cước công dân phải gồm 12 chữ số');
    if (!date(data.dob) || data.dob > today()) error(400, 'Ngày sinh không hợp lệ');
    data.email = data.email.toLowerCase(); return data;
  }
  function gradeFields(a) {
    const supplied = v => (typeof v === 'string' && v.trim() !== '') || typeof v === 'number';
    const gpa = Number(a.gpa), debts = Number(a.debts);
    if (!supplied(a.gpa) || !supplied(a.debts) || !Number.isFinite(gpa) || gpa < 0 || gpa > 4 || !Number.isInteger(debts) || debts < 0) error(400, 'GPA hoặc số môn nợ không hợp lệ');
    return { term: required(a.term, 'học kỳ'), year: required(a.year, 'năm học'), gpa, rank: required(a.rank, 'xếp loại'), debts, certificates: clean(a.certificates) };
  }
  function log(u, action, subject) { db.history.unshift({ id: nextId(db.history, 'LS'), userId: u.id, actor: publicUser(u).name, action, subject, time: current() }); }
  function localProof(url) { if (!url) return false; const fn = path.basename(url); return existingUploads.has(fn) || pendingUploads.has(fn); }

  // ── File storage (Neon-backed) ────────────────────────────────────────────
  function storeFile(file, related, max = 1_500_000) {
    if (!file) return '';
    const mime = file.mime;
    const m = /^data:(image\/png|image\/jpeg|application\/pdf);base64,(.*)$/s.exec(file.data || '');
    if (!m || m[1] !== mime) error(400, 'Định dạng không phù hợp!');
    const data = Buffer.from(m[2], 'base64');
    if (data.length === 0 || data.length > max) error(400, 'Dung lượng tệp không hợp lệ!');
    const isPng = mime === 'image/png' && data.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
    const isJpg = mime === 'image/jpeg' && data.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'));
    const isPdf = mime === 'application/pdf' && data.subarray(0, 5).toString() === '%PDF-';
    if (!isPng && !isJpg && !isPdf) error(400, 'Định dạng không phù hợp!');
    const ext = isPng ? '.png' : isJpg ? '.jpg' : '.pdf';
    const filename = crypto.randomBytes(14).toString('hex') + ext;
    pendingUploads.set(filename, { mime, data: m[2] });
    return '/uploads/' + filename;
  }

  // Fake fs for attachments.js (uses pendingUploads + existingUploads instead of disk)
  const fakeFs = {
    statSync: fp => {
      const fn = path.basename(fp);
      if (existingUploads.has(fn) || pendingUploads.has(fn)) return { isFile: () => true };
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    },
    unlinkSync: fp => {
      const fn = path.basename(fp);
      pendingUploads.delete(fn);
      deletedUploads.add(fn);
    }
  };

  function studentDocuments(s) {
    const registration = db.registrations.find(r => r.id === s.registrationId);
    return (s.files?.length ? s.files : registration?.documents?.length ? registration.documents : registration?.files || [])
      .map((f, i) => typeof f === 'string' ? { url: f, name: 'Giấy tờ liên quan ' + (i + 1), created: registration?.created || s.joined } : f)
      .filter(f => /^\/uploads\/[a-zA-Z0-9._-]+$/.test(f?.url || '') && localProof(f.url));
  }

  const attachments = require('../backend/attachments')({ db, fs: fakeFs, path, uploadsDir: '/tmp', storeFile, error, can, studentDocuments });

  function atomic(work, files = []) {
    const before = structuredClone(db);
    try { const result = work(); save(); return result; }
    catch (e) {
      for (const k of Object.keys(db)) delete db[k]; Object.assign(db, before);
      for (const url of files) { const fn = path.basename(url); pendingUploads.delete(fn); deletedUploads.add(fn); }
      throw e;
    }
  }
  function studentWrite(kind, work, files = []) {
    const before = structuredClone(db[kind]), history = [...db.history];
    const key = kind === 'goals' ? 'goalRevisions' : 'gradeRevisions';
    const revisions = db[key] ? structuredClone(db[key]) : null;
    try { work(); save(); }
    catch (e) {
      db[kind] = before; db.history = history;
      if (revisions) db[key] = revisions; else delete db[key];
      for (const url of files) { const fn = path.basename(url); pendingUploads.delete(fn); deletedUploads.add(fn); }
      throw e;
    }
  }
  function counts() { return { students: db.students.length, active: db.students.filter(s => s.status !== 'Đã kết thúc hỗ trợ').length, alumni: db.students.filter(s => s.status === 'Đã kết thúc hỗ trợ').length, rooms: db.rooms.length, goals: db.goals.length, grades: db.grades.length, supportAmount: db.supports.reduce((s, x) => s + Number(x.amount || 0), 0) }; }
  function studentScope(u, s) { return u.role !== 'SinhVien' || u.studentId === s.id; }

  // ── Route handler ─────────────────────────────────────────────────────────
  async function route(request, response, u) {
    let p = u.pathname, method = request.method, B = null;
    const parts = p.split('/').filter(Boolean), id = parts[2];
    const read = async () => B || (B = await bodyParse(request));

    if (p === '/api/health' && method === 'GET') return reply(response, 200, { status: 'ok', app: 'LIGHTHOUSE', mode: 'Neon PostgreSQL', users: db.users.length });

    // ── Auth ──
    if (p === '/api/auth/login' && method === 'POST') {
      const a = await read(); if (!norm(a.email) || !a.password) error(400, 'Vui lòng không để trống thông tin');
      const email = norm(a.email); const who = db.users.find(x => x.email.toLowerCase() === email.toLowerCase() && accountEnabled(x));
      if (!/^\S+@\S+\.\S+$/.test(email) || !who) error(401, 'Email không hợp lệ');
      if (!validatePassword(String(a.password), who.passwordHash)) error(401, 'Email hoặc mật khẩu sai!');
      const t = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
      await sql`INSERT INTO sessions(token,user_id,expires_at) VALUES(${t},${who.id},${expiresAt}) ON CONFLICT(token) DO UPDATE SET user_id=EXCLUDED.user_id,expires_at=EXCLUDED.expires_at`;
      response.setHeader('Set-Cookie', `lh_media=${t}; HttpOnly; SameSite=Strict; Path=/uploads; Max-Age=604800; Secure`);
      return reply(response, 200, { token: t, user: publicUser(who) });
    }
    if (p === '/api/auth/logout' && method === 'POST') {
      response.setHeader('Set-Cookie', 'lh_media=; HttpOnly; SameSite=Strict; Path=/uploads; Max-Age=0');
      await sql`DELETE FROM sessions WHERE token=${rawToken}`;
      return reply(response, 200, { message: 'Đã đăng xuất' });
    }
    if (p === '/api/auth/me' && method === 'GET') return reply(response, 200, { item: publicUser(user(request)) });
    if (p === '/api/auth/forgot' && method === 'POST') {
      const a = await read();
      const email = norm(a.email).toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) error(400, 'Email không hợp lệ');
      const who = db.users.find(x => x.email.toLowerCase() === email);
      // Always return success to avoid user enumeration
      if (who && accountEnabled(who)) {
        const code = String(Math.floor(100000 + Math.random() * 900000));
        const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();
        await sql`DELETE FROM otp_requests WHERE email=${email}`;
        await sql`INSERT INTO otp_requests(email,code,expires_at) VALUES(${email},${code},${expiresAt})`;
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey) {
          try {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                from: process.env.RESEND_FROM || 'LIGHTHOUSE <onboarding@resend.dev>',
                to: [email],
                subject: '[LIGHTHOUSE] Mã OTP đặt lại mật khẩu',
                html: `<div style="font-family:sans-serif;max-width:480px"><h2 style="color:#1a3a5c">LIGHTHOUSE</h2><p>Mã OTP đặt lại mật khẩu của bạn:</p><div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1a3a5c;margin:20px 0">${code}</div><p>Mã có hiệu lực trong <strong>10 phút</strong>.</p><p style="color:#888;font-size:12px">Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p></div>`
              })
            });
          } catch { /* log silently, don't expose email errors to client */ }
          return reply(response, 200, { message: 'Đã gửi mã OTP đến email của bạn.' });
        } else {
          // Dev mode: return code in response so it can be tested without email
          return reply(response, 200, { message: 'Đã gửi mã OTP đến email của bạn.', devOtp: code });
        }
      }
      return reply(response, 200, { message: 'Đã gửi mã OTP đến email của bạn.' });
    }
    if (p === '/api/auth/reset' && method === 'POST') {
      const a = await read();
      const email = norm(a.email).toLowerCase();
      const code = norm(a.otp);
      const newPass = typeof a.password === 'string' ? a.password : '';
      if (!email || !code || !newPass) error(400, 'Vui lòng điền đầy đủ thông tin');
      accountPassword(newPass);
      const rows = await sql`SELECT code,expires_at FROM otp_requests WHERE email=${email} AND code=${code}`;
      if (!rows.length) error(400, 'Mã OTP không đúng');
      if (new Date(rows[0].expires_at) < new Date()) { await sql`DELETE FROM otp_requests WHERE email=${email}`; error(400, 'Mã OTP đã hết hạn'); }
      const who = db.users.find(x => x.email.toLowerCase() === email);
      if (!who) error(400, 'Mã OTP không đúng');
      await sql`DELETE FROM otp_requests WHERE email=${email}`;
      atomic(() => { who.passwordHash = hashPw(newPass); log(who, 'Đặt lại mật khẩu', who.id); });
      return reply(response, 200, { message: 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.' });
    }
    if (p === '/api/auth/verify' && method === 'POST') error(410, 'Dùng /api/auth/reset để đặt lại mật khẩu sau khi có OTP');

    // ── Registrations ──
    if (p === '/api/registrations' && method === 'POST') {
      const a = await read(), validated = validateRegistration(a), { name, email, phone, school, major, dob, cccd } = validated;
      if (db.registrations.some(r => r.email.toLowerCase() === email && r.status !== 'Từ chối')) error(409, 'Email đã có hồ sơ đăng ký');
      for (const key of ['files', 'familyFiles', 'schoolFiles']) if (a[key] !== undefined && !Array.isArray(a[key])) error(400, 'Danh sách tệp không hợp lệ');
      const family = a.familyFiles || [], education = a.schoolFiles || [], legacy = a.files || [];
      if (!family.length && !education.length && !legacy.length) error(400, 'Vui lòng tải lên giấy tờ minh chứng');
      if (family.length + education.length + legacy.length > 6) error(400, 'Chỉ được tải lên tối đa 6 tệp');
      const written = [], documents = [];
      const upload = (f, group) => { const url = storeFile(f, 'registration'); if (!url) error(400, 'Tệp minh chứng không hợp lệ'); written.push(url); documents.push({ url, name: clean(f.name) || 'Giấy tờ minh chứng', group, created: current() }); return url; };
      let familyFiles, schoolFiles, files;
      try { familyFiles = family.map(f => upload(f, 'family')); schoolFiles = education.map(f => upload(f, 'school')); files = [...familyFiles, ...schoolFiles, ...legacy.map(f => upload(f, a.evidenceMode === 'combined' ? 'general' : 'family'))]; }
      catch (e) { for (const url of written) { const fn = path.basename(url); pendingUploads.delete(fn); } throw e; }
      const item = { id: nextId(db.registrations, 'HS'), name, email, phone, dob, cccd, hometown: clean(a.hometown), address: clean(a.address), school, major, family: clean(a.family, 2000), description: clean(a.description, 5000), files, familyFiles, schoolFiles, documents, status: 'Chờ kiểm tra', note: '', created: today() };
      atomic(() => db.registrations.push(item), written); return reply(response, 201, { item, message: 'Đăng ký thành công!' });
    }
    if (p === '/api/registrations' && method === 'GET') { allow(request, 'registrations.view'); const q = norm(u.searchParams.get('q')); return reply(response, 200, { items: db.registrations.filter(r => !q || same(r.name, q) || same(r.id, q) || same(r.status, q)) }); }
    if (parts[1] === 'registrations' && id && parts[3] === 'files' && method === 'POST') {
      const actor = allow(request, 'registrations.review'), r = find(db.registrations, id, 'hồ sơ'), a = await read();
      if (r.status === 'Đã tiếp nhận') error(409, 'Hồ sơ đã được tiếp nhận');
      if (!Array.isArray(a.files) || (r.files || []).length + a.files.length > 6) error(400, 'Tối đa 6 tệp minh chứng');
      const added = attachments.write(a.files, true).map(f => ({ ...f, group: 'school', created: current() }));
      atomic(() => { r.files = [...(r.files || []), ...added.map(f => f.url)]; r.documents = [...(r.documents || []), ...added]; r.schoolFiles = [...(r.schoolFiles || []), ...added.map(f => f.url)]; log(actor, 'Bổ sung minh chứng hồ sơ', id); }, added.map(f => f.url));
      return reply(response, 201, { item: r, message: 'Tải tệp thành công!' });
    }
    if (parts[1] === 'registrations' && id && parts.length === 3 && method === 'PATCH') {
      const actor = allow(request, 'registrations.review'), a = await read(), r = find(db.registrations, id, 'hồ sơ');
      if (r.status === 'Đã tiếp nhận') error(409, 'Hồ sơ đã được tiếp nhận');
      if (!['Đạt yêu cầu', 'Chờ kiểm tra', 'Chờ bổ sung', 'Từ chối'].includes(a.status)) error(400, 'Trạng thái không hợp lệ');
      const changes = validateRegistration({ ...r, ...a });
      const note = a.status === 'Chờ bổ sung' ? (Object.hasOwn(a, 'note') ? clean(a.note, 1000) : r.note || '') : r.note || '';
      if (a.status !== 'Chờ bổ sung' && Object.hasOwn(a, 'note') && clean(a.note, 1000) !== (r.note || '')) error(400, 'Chỉ được chỉnh sửa thông tin cần bổ sung khi Chờ bổ sung');
      if (a.status === 'Chờ bổ sung' && !note.trim()) error(400, 'Vui lòng nhập thông tin cần bổ sung.');
      atomic(() => { Object.assign(r, changes, { status: a.status, note }); log(actor, 'Xử lý hồ sơ', r.id + ' → ' + r.status); });
      return reply(response, 200, { item: r, message: 'Đã lưu thành công!' });
    }
    if (parts[1] === 'registrations' && id && parts[3] === 'accept' && method === 'POST') {
      const actor = allow(request, 'registrations.review'), r = find(db.registrations, id, 'hồ sơ');
      if (db.students.some(s => s.registrationId === id)) error(409, 'Hồ sơ đã được tiếp nhận');
      if (r.status !== 'Đạt yêu cầu') error(400, 'Hồ sơ chưa đủ điều kiện tiếp nhận!');
      validateRegistration(r);
      const studentId = nextId(db.students, 'LH'), usrId = nextId(db.users, 'ND');
      if (db.users.some(u => u.email.toLowerCase() === r.email.toLowerCase())) error(409, 'Email đã có tài khoản');
      const temp = r.dob.slice(8, 10) + r.dob.slice(5, 7);
      const stud = { id: studentId, registrationId: r.id, userId: usrId, name: r.name, email: r.email, cccd: r.cccd, dob: r.dob, hometown: r.hometown, address: r.address, phone: r.phone, cohort: '', studentCode: '', school: r.school, major: r.major, family: r.family, room: null, status: 'Đang hỗ trợ', joined: today(), endDate: '', endReason: '' };
      atomic(() => { db.students.push(stud); db.users.push({ id: usrId, name: r.name, email: r.email, role: 'SinhVien', studentId, permissions: [], passwordHash: hashPw(temp), active: true }); r.status = 'Đã tiếp nhận'; log(actor, 'Tiếp nhận hồ sơ', r.id + ' / ' + studentId); });
      return reply(response, 201, { item: stud, message: 'Đã tạo hồ sơ sinh viên thành công!' });
    }

    // ── Students ──
    if (p === '/api/students' && method === 'GET') {
      const actor = user(request), q = norm(u.searchParams.get('q'));
      if (actor.role !== 'SinhVien' && !can(actor, 'students.view')) error(403, 'Không có quyền xem hồ sơ');
      return reply(response, 200, { items: db.students.filter(s => studentScope(actor, s) && s.status === 'Đang hỗ trợ' && (!q || [s.id, s.name, s.school, s.major, s.room].some(x => same(x, q)))) });
    }
    if (parts[1] === 'students' && id && parts.length === 3 && method === 'GET') {
      const actor = user(request), s = find(db.students, id, 'sinh viên');
      if (actor.role === 'GiamDoc' && s.status !== 'Đang hỗ trợ') error(403, 'Chỉ được xem hồ sơ đang hỗ trợ');
      if (actor.role !== 'SinhVien' && !(s.status === 'Đã kết thúc hỗ trợ' ? can(actor, 'alumni.view') : can(actor, 'students.view'))) error(403, 'Không có quyền xem hồ sơ');
      if (!studentScope(actor, s)) error(403, 'Bạn không có quyền xem hồ sơ này');
      return reply(response, 200, { item: { ...s, files: studentDocuments(s), images: db.images.filter(x => x.studentId === id), goals: db.goals.filter(x => x.studentId === id && ['Đạt', 'Chưa đạt'].includes(x.status)), grades: db.grades.filter(x => x.studentId === id && x.status === 'Hợp lệ').map(attachments.normalize), supports: db.supports.filter(x => x.studentId === id).map(attachments.normalize) } });
    }
    if (parts[1] === 'students' && id && parts.length === 3 && method === 'PATCH') {
      const actor = user(request), s = find(db.students, id, 'sinh viên'), a = await read(), changes = {};
      if (actor.role === 'SinhVien' || (!can(actor, 'students.edit') && !(can(actor, 'alumni.edit') && Object.hasOwn(a, 'status') && Object.keys(a).every(k => ['status', 'endDate', 'endReason'].includes(k))))) error(403, 'Bạn không có quyền thực hiện chức năng này');
      for (const k of ['name', 'email', 'phone', 'cccd', 'dob', 'hometown', 'address', 'school', 'major', 'family', 'cohort', 'studentCode']) if (Object.hasOwn(a, k)) changes[k] = clean(a[k]);
      if (Object.hasOwn(changes, 'name') && !changes.name) error(400, 'Dữ liệu không hợp lệ: họ tên');
      if (Object.hasOwn(changes, 'email') && !/^\S+@\S+\.\S+$/.test(changes.email)) error(400, 'Dữ liệu không hợp lệ: email');
      if (Object.hasOwn(changes, 'phone') && !/^0\d{9}$/.test(changes.phone)) error(400, 'Dữ liệu không hợp lệ: số điện thoại');
      if (changes.cccd && !/^\d{12}$/.test(changes.cccd)) error(400, 'Dữ liệu không hợp lệ: CCCD');
      if (changes.dob && (!/^\d{4}-\d{2}-\d{2}$/.test(changes.dob) || !Number.isFinite(Date.parse(changes.dob)) || changes.dob > today())) error(400, 'Dữ liệu không hợp lệ: ngày sinh');
      if (Object.hasOwn(a, 'status')) {
        if (!['Đang hỗ trợ', 'Tạm dừng hỗ trợ', 'Đã kết thúc hỗ trợ'].includes(a.status)) error(400, 'Trạng thái hỗ trợ không hợp lệ');
        changes.status = a.status;
        if (a.status === 'Đã kết thúc hỗ trợ') { if (a.endDate && !date(a.endDate)) error(400, 'Ngày kết thúc không hợp lệ'); changes.endDate = clean(a.endDate, 10) || today(); changes.endReason = clean(a.endReason); changes.room = null; }
      }
      atomic(() => {
        (db.studentRevisions || (db.studentRevisions = [])).push({ id: nextId(db.studentRevisions, 'RV'), studentId: s.id, userId: actor.id, time: current(), before: JSON.parse(JSON.stringify(s)) });
        Object.assign(s, changes);
        if (s.status === 'Đã kết thúc hỗ trợ') for (const account of db.users) if (account.role === 'SinhVien' && (account.studentId === s.id || account.id === s.userId)) { account.active = false; account.disabledReason = 'Kết thúc hỗ trợ'; }
        log(actor, 'Chỉnh sửa hồ sơ', s.id);
      });
      if (s.status === 'Đã kết thúc hỗ trợ') await sql`DELETE FROM sessions WHERE user_id=${s.userId || ''}`;
      return reply(response, 200, { item: s, message: 'Lưu hồ sơ thành công!' });
    }

    // ── Alumni ──
    if (p === '/api/alumni' && method === 'GET') { allow(request, 'alumni.view'); const q = norm(u.searchParams.get('q')); return reply(response, 200, { items: db.students.filter(s => s.status === 'Đã kết thúc hỗ trợ' && (!q || [s.name, s.id, s.email].some(v => same(v, q)))) }); }

    // ── Rooms ──
    if (p === '/api/rooms/residents' && method === 'GET') { allow(request, 'rooms.view'); return reply(response, 200, { items: db.students.filter(s => s.status === 'Đang hỗ trợ').map(({ id: i, name, room, status }) => ({ id: i, name, room, status })) }); }
    if (p === '/api/rooms' && method === 'GET') { allow(request, 'rooms.view'); return reply(response, 200, { items: db.rooms.map(r => ({ ...r, students: db.students.filter(s => s.room === r.id).map(({ id: i, name, room, status }) => ({ id: i, name, room, status })) })) }); }
    if (p === '/api/rooms' && method === 'POST') {
      const actor = allow(request, 'rooms.create'), a = await read(), roomId = required(a.id, 'mã phòng').toUpperCase(), capacity = Number(a.capacity);
      if (!/^[A-Z0-9][A-Z0-9_-]{0,19}$/.test(roomId)) error(400, 'Thông tin không hợp lệ!');
      if (capacity !== ROOM_CAPACITY) error(400, 'Sức chứa mỗi phòng phải là 6 sinh viên');
      if (db.rooms.some(r => r.id === roomId)) error(409, 'Tên phòng đã tồn tại');
      if (a.studentIds !== undefined && !Array.isArray(a.studentIds)) error(400, 'Danh sách sinh viên không hợp lệ');
      const ids = [...new Set(a.studentIds || [])]; if (ids.length > ROOM_CAPACITY) error(400, 'Phòng đầy!');
      const residents = ids.map(sId => find(db.students, sId, 'sinh viên')); if (residents.some(s => s.status !== 'Đang hỗ trợ')) error(400, 'Không thể xếp Alumni vào phòng');
      atomic(() => { db.rooms.push({ id: roomId, capacity }); for (const s of residents) s.room = roomId; log(actor, 'Tạo phòng', roomId); });
      return reply(response, 201, { message: 'Tạo mới thành công!' });
    }
    if (parts[1] === 'rooms' && id && method === 'PUT') {
      const actor = allow(request, 'rooms.assign'), r = find(db.rooms, id, 'phòng'), a = await read();
      if (!Array.isArray(a.studentIds)) error(400, 'Danh sách sinh viên không hợp lệ');
      const ids = [...new Set(a.studentIds)]; if (ids.length > r.capacity) error(400, 'Phòng đầy!');
      const residents = ids.map(sId => find(db.students, sId, 'sinh viên')); if (residents.some(s => s.status !== 'Đang hỗ trợ')) error(400, 'Không thể xếp Alumni vào phòng');
      atomic(() => { for (const s of db.students) if (s.room === id && !ids.includes(s.id)) s.room = null; for (const s of residents) s.room = id; log(actor, 'Sửa bố trí phòng', id); });
      return reply(response, 200, { message: 'Cập nhật thành công!' });
    }
    if (parts[1] === 'rooms' && id && method === 'DELETE') {
      const actor = allow(request, 'rooms.delete'); find(db.rooms, id, 'phòng');
      atomic(() => { db.rooms = db.rooms.filter(x => x.id !== id); for (const s of db.students) if (s.room === id) s.room = null; log(actor, 'Xóa phòng', id); });
      return reply(response, 200, { message: 'Xóa phòng thành công!' });
    }

    // ── Images ──
    if (p === '/api/images' && method === 'POST') {
      const actor = allow(request, 'students.edit'), a = await read(); find(db.students, a.studentId, 'sinh viên');
      const files = a.files || [a.file]; if (!Array.isArray(files) || files.some(f => !['image/png', 'image/jpeg'].includes(f?.mime))) error(400, 'Định dạng không phù hợp!');
      const added = attachments.write(files, true); const rows = [];
      atomic(() => { for (const f of added) { const row = { id: nextId(db.images, 'HA'), studentId: a.studentId, url: f.url, created: current() }; db.images.push(row); rows.push(row); } log(actor, 'Thêm hình ảnh', a.studentId); }, added.map(f => f.url));
      return reply(response, 201, { item: rows[0], items: rows, message: 'Tải ảnh thành công!' });
    }
    if (parts[1] === 'images' && id && method === 'DELETE') {
      const actor = allow(request, 'students.edit'), img = find(db.images, id, 'hình ảnh');
      atomic(() => { db.images = db.images.filter(x => x.id !== id); if (!db.images.some(x => x.url === img.url)) { const fn = path.basename(img.url); deletedUploads.add(fn); } log(actor, 'Xóa hình ảnh', img.studentId); });
      return reply(response, 200, { message: 'Đã xóa hình ảnh!' });
    }

    // ── Goals ──
    if (p === '/api/goals' && method === 'GET') {
      const actor = user(request), q = norm(u.searchParams.get('q'));
      if (actor.role !== 'SinhVien' && !can(actor, 'goals.view')) error(403, 'Không có quyền xem mục tiêu');
      return reply(response, 200, { items: db.goals.filter(g => (actor.role !== 'SinhVien' || (actor.studentId && g.studentId === actor.studentId)) && (!q || same(g.name, q) || same(g.studentId, q))).map(g => ({ ...g, studentName: db.students.find(x => x.id === g.studentId)?.name })) });
    }
    if (p === '/api/goals' && method === 'POST') {
      const actor = (() => { const u2 = user(request); const profile = db.students.find(s => s.id === u2.studentId); if (u2.role !== 'SinhVien' || !profile || profile.status !== 'Đang hỗ trợ') error(403, 'Hồ sơ sinh viên không ở trạng thái đang hỗ trợ'); return u2; })();
      const a = await read(), row = { id: nextId(db.goals, 'MT'), studentId: actor.studentId, name: required(a.name, 'mục tiêu'), detail: required(a.detail, 'chi tiết', 10000), sent: today(), status: 'Chờ đánh giá', feedback: '' };
      studentWrite('goals', () => { db.goals.push(row); log(actor, 'Gửi mục tiêu', row.id); }); return reply(response, 201, { message: 'Gửi thành công!', item: row });
    }
    if (parts[1] === 'goals' && id && parts[3] === 'review' && method === 'PATCH') {
      const actor = allow(request, 'goals.review'), row = find(db.goals, id, 'mục tiêu'), a = await read();
      if (!['Đạt', 'Chưa đạt', 'Chờ bổ sung'].includes(a.status)) error(400, 'Đánh giá không hợp lệ');
      atomic(() => { row.status = a.status; row.feedback = clean(a.feedback, 1000); log(actor, 'Đánh giá mục tiêu', id); });
      return reply(response, 200, { message: 'Cập nhật thành công!', item: row });
    }
    if (parts[1] === 'goals' && id && parts[3] === 'resubmit' && method === 'PATCH') {
      const actor = (() => { const u2 = user(request); const profile = db.students.find(s => s.id === u2.studentId); if (u2.role !== 'SinhVien' || !profile || profile.status !== 'Đang hỗ trợ') error(403, 'Hồ sơ sinh viên không ở trạng thái đang hỗ trợ'); return u2; })();
      const row = find(db.goals, id, 'mục tiêu'); if (actor.studentId !== row.studentId || row.status !== 'Chờ bổ sung') error(403, 'Không thể gửi lại mục tiêu');
      const a = await read(), changes = { name: required(a.name, 'mục tiêu'), detail: required(a.detail, 'chi tiết', 10000), status: 'Chờ đánh giá', sent: today() };
      studentWrite('goals', () => { (db.goalRevisions || (db.goalRevisions = [])).push({ id: nextId(db.goalRevisions, 'GM'), goalId: id, userId: actor.id, time: current(), before: structuredClone(row) }); Object.assign(row, changes); log(actor, 'Gửi lại mục tiêu', id); });
      return reply(response, 200, { message: 'Gửi thành công!' });
    }

    // ── Grades ──
    if (p === '/api/grades' && method === 'GET') {
      const actor = user(request); if (actor.role !== 'SinhVien' && !can(actor, 'grades.view')) error(403, 'Không có quyền xem kết quả học tập');
      return reply(response, 200, { items: db.grades.filter(g => actor.role !== 'SinhVien' || (actor.studentId && g.studentId === actor.studentId)).map(g => ({ ...attachments.normalize(g), studentName: db.students.find(x => x.id === g.studentId)?.name })) });
    }
    if (p === '/api/grades' && method === 'POST') {
      const actor = (() => { const u2 = user(request); const profile = db.students.find(s => s.id === u2.studentId); if (u2.role !== 'SinhVien' || !profile || profile.status !== 'Đang hỗ trợ') error(403, 'Hồ sơ sinh viên không ở trạng thái đang hỗ trợ'); return u2; })();
      const a = await read(), fields = gradeFields(a), evidenceFiles = attachments.write(attachments.input(a)), evidence = evidenceFiles[0]?.url || '';
      const row = { id: nextId(db.grades, 'KQ'), studentId: actor.studentId, ...fields, evidenceFiles, evidence, evidenceName: evidenceFiles[0]?.name || '', status: 'Chờ xét duyệt', requestNote: '', sent: today() };
      studentWrite('grades', () => { db.grades.push(row); log(actor, 'Gửi kết quả học tập', row.id); }, evidenceFiles.map(f => f.url));
      return reply(response, 201, { message: 'Gửi thành công!', item: row });
    }
    if (parts[1] === 'grades' && id && parts[3] === 'review' && method === 'PATCH') {
      const actor = allow(request, 'grades.review'), row = find(db.grades, id, 'kết quả học tập'), a = await read();
      if (!['Hợp lệ', 'Yêu cầu gửi lại'].includes(a.status)) error(400, 'Trạng thái không hợp lệ');
      const note = clean(a.note, 1000); if (a.status === 'Yêu cầu gửi lại' && !note) error(400, 'Vui lòng nhập nội dung yêu cầu bổ sung.');
      atomic(() => { row.status = a.status; row.requestNote = note; log(actor, 'Xét duyệt KQHT', id); });
      return reply(response, 200, { message: a.status === 'Hợp lệ' ? 'Cập nhật thành công!' : 'Gửi yêu cầu thành công!' });
    }
    if (parts[1] === 'grades' && id && parts[3] === 'resubmit' && method === 'PATCH') {
      const actor = (() => { const u2 = user(request); const profile = db.students.find(s => s.id === u2.studentId); if (u2.role !== 'SinhVien' || !profile || profile.status !== 'Đang hỗ trợ') error(403, 'Hồ sơ sinh viên không ở trạng thái đang hỗ trợ'); return u2; })();
      const row = find(db.grades, id, 'kết quả học tập'); if (row.studentId !== actor.studentId || row.status !== 'Yêu cầu gửi lại') error(403, 'Không thể gửi lại KQHT');
      const a = await read(), changes = { ...gradeFields(a), status: 'Chờ xét duyệt', sent: today() };
      const oldFiles = attachments.list(row);
      if (a.keepEvidenceUrls !== undefined && (!Array.isArray(a.keepEvidenceUrls) || a.keepEvidenceUrls.some(url => !oldFiles.some(f => f.url === url)))) error(400, 'Danh sách minh chứng giữ lại không hợp lệ');
      const kept = a.keepEvidenceUrls === undefined ? oldFiles : oldFiles.filter(f => a.keepEvidenceUrls.includes(f.url));
      const added = attachments.write(attachments.input(a));
      if (added.length || a.keepEvidenceUrls !== undefined) { const all = [...kept, ...added]; if (all.length > 6) { for (const f of added) { const fn = path.basename(f.url); pendingUploads.delete(fn); } error(400, 'Tối đa 6 tệp minh chứng'); } changes.evidenceFiles = all; changes.evidence = all[0]?.url || ''; changes.evidenceName = all[0]?.name || ''; }
      studentWrite('grades', () => { (db.gradeRevisions || (db.gradeRevisions = [])).push({ id: nextId(db.gradeRevisions, 'GR'), gradeId: id, userId: actor.id, time: current(), before: structuredClone(row) }); Object.assign(row, changes); log(actor, 'Bổ sung KQHT', id); }, added.map(f => f.url));
      return reply(response, 200, { message: 'Gửi thành công!' });
    }

    // ── Supports ──
    if (p === '/api/supports' && method === 'GET') {
      const actor = user(request); if (actor.role !== 'SinhVien' && !can(actor, 'students.view')) error(403, 'Không có quyền xem hỗ trợ');
      return reply(response, 200, { items: db.supports.filter(s => actor.role !== 'SinhVien' || s.studentId === actor.studentId).map(attachments.normalize) });
    }
    if (p === '/api/supports' && method === 'POST') {
      const actor = allow(request, 'students.edit'), a = await read(); find(db.students, a.studentId, 'sinh viên');
      const name = required(a.name, 'tên hỗ trợ'), type = required(a.type, 'loại hỗ trợ'), day = required(a.date, 'ngày hỗ trợ'), amount = Number(a.amount);
      if (!['Học phí', 'Phí sinh hoạt', 'Y tế', 'Chi phí khác'].includes(type)) error(400, 'Loại hỗ trợ không hợp lệ');
      if (a.amount === undefined || a.amount === null || typeof a.amount === 'boolean' || String(a.amount).trim() === '') error(400, 'Vui lòng nhập số tiền hỗ trợ');
      if (!date(day)) error(400, 'Ngày hỗ trợ không hợp lệ');
      if (!Number.isFinite(amount) || amount < 0) error(400, 'Số tiền không hợp lệ');
      const evidenceFiles = attachments.write(attachments.input(a), true);
      const row = { id: nextId(db.supports, 'HT'), studentId: a.studentId, name, type, amount, date: day, evidenceFiles, evidence: evidenceFiles[0].url, evidenceName: evidenceFiles[0].name };
      atomic(() => { db.supports.push(row); log(actor, 'Thêm hỗ trợ', row.studentId); }, evidenceFiles.map(f => f.url));
      return reply(response, 201, { item: row, message: 'Cập nhật thành công!' });
    }

    // ── Users ──
    if (p === '/api/users' && method === 'GET') { allow(request, 'users.view'); return reply(response, 200, { items: db.users.map(publicUser) }); }
    if (p === '/api/users' && method === 'POST') {
      const actor = admin(request), a = await read(), email = required(a.email, 'email').toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) error(400, 'Email không hợp lệ!');
      if (db.users.some(x => x.email.toLowerCase() === email)) error(409, 'Email đã tồn tại!');
      const name = required(a.name, 'họ tên'); if (!['QuanLy', 'CanBo', 'GiamDoc', 'SinhVien'].includes(a.role)) error(400, 'Vai trò không hợp lệ');
      const permissions = validateGrants(a.permissions || [], a.role, actor), password = accountPassword(a.password);
      const row = { id: nextId(db.users, 'ND'), name, email, role: a.role, studentId: null, permissions, passwordHash: hashPw(password), active: true };
      atomic(() => { db.users.push(row); log(actor, 'Thêm người dùng', row.id); });
      return reply(response, 201, { message: 'Cập nhật thành công!', item: publicUser(row) });
    }
    if (parts[1] === 'users' && id && method === 'PATCH') {
      const actor = admin(request), row = find(db.users, id, 'người dùng'), a = await read(), changes = {};
      if (Object.hasOwn(a, 'id') && a.id !== row.id) error(400, 'Mã người dùng không được chỉnh sửa');
      if (Object.hasOwn(a, 'name')) changes.name = required(a.name, 'họ tên');
      if (Object.hasOwn(a, 'email')) { changes.email = required(a.email, 'email').toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(changes.email)) error(400, 'Email không hợp lệ!'); if (db.users.some(x => x.id !== id && x.email.toLowerCase() === changes.email)) error(409, 'Email đã tồn tại!'); }
      if (Object.hasOwn(a, 'password')) changes.passwordHash = hashPw(accountPassword(a.password));
      const role = a.role === undefined ? row.role : a.role; if (!['QuanLy', 'CanBo', 'GiamDoc', 'SinhVien'].includes(role)) error(400, 'Vai trò không hợp lệ');
      changes.role = role; changes.permissions = validateGrants(a.permissions === undefined ? grants.effective({ ...row, role }) : a.permissions, role, actor, row);
      if (Object.hasOwn(a, 'active')) changes.active = !!a.active;
      if (actor.id === id && (!['QuanLy', 'GiamDoc'].includes(role) || !grants.hasFor({ ...row, ...changes }, 'users.manage') || changes.active === false)) error(400, 'Không thể tự thu hồi quyền quản lý đang sử dụng!');
      atomic(() => { const profile = row.studentId && db.students.find(s => s.id === row.studentId); if (profile && (Object.hasOwn(changes, 'name') || Object.hasOwn(changes, 'email'))) { (db.studentRevisions || (db.studentRevisions = [])).push({ id: nextId(db.studentRevisions, 'RV'), studentId: profile.id, userId: actor.id, time: current(), before: structuredClone(profile) }); for (const k of ['name', 'email']) if (Object.hasOwn(changes, k)) profile[k] = changes[k]; } Object.assign(row, changes); log(actor, 'Sửa phân quyền', id); });
      return reply(response, 200, { message: 'Cập nhật thành công!', item: publicUser(row) });
    }
    if (parts[1] === 'users' && id && method === 'DELETE') {
      const actor = admin(request); if (actor.id === id) error(400, 'Không thể tự xóa tài khoản đang đăng nhập');
      const row = find(db.users, id, 'người dùng');
      atomic(() => { row.permissions = []; row.active = false; log(actor, 'Xóa phân quyền', id); });
      await sql`DELETE FROM sessions WHERE user_id=${id}`;
      return reply(response, 200, { message: 'Xóa thành công!' });
    }

    // ── Reports ──
    const reportData = require('../backend/report-data');
    const reportWithAuthor = r => ({ ...r, authorName: r.authorName || db.users.find(u2 => u2.id === r.author)?.name || r.author });
    if (p === '/api/reports' && method === 'GET') { allow(request, 'reports.view'); return reply(response, 200, { items: db.reports.filter(r => tokenUser(request)?.role !== 'GiamDoc' || r.status === 'Đã lưu').map(reportWithAuthor) }); }
    if (p === '/api/reports/summary' && method === 'GET') {
      allow(request, 'reports.edit'); const from = u.searchParams.get('from'), to = u.searchParams.get('to');
      if (from !== null || to !== null) return reply(response, 200, { item: reportData.aggregate(db, from, to, u.searchParams.get('type') || 'Tổng hợp tháng') });
      return reply(response, 200, { summary: counts() });
    }
    if (parts[1] === 'reports' && id && id !== 'summary' && method === 'GET') {
      const actor = allow(request, 'reports.view'); const r = reportWithAuthor(find(db.reports, id, 'báo cáo'));
      if (actor.role === 'GiamDoc' && r.status !== 'Đã lưu') error(403, 'Chỉ được xem báo cáo đã lưu');
      if (parts[3] === 'pdf') {
        allow(request, 'reports.export');
        const bytes = await require('../backend/report-pdf').reportPDF(r, '/tmp');
        response.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${r.id.replace(/[^A-Za-z0-9_-]/g, '')}.pdf"`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
        return response.end(bytes);
      }
      return reply(response, 200, { item: r });
    }
    if (p === '/api/reports' && method === 'POST') {
      const actor = allow(request, 'reports.edit'), a = await read(); reportData.validate(a.from, a.to, a.type); const type = required(a.type, 'loại báo cáo');
      const generated = a.generated ? reportData.aggregate(db, a.from, a.to, type) : null; if (generated && !generated.hasData) error(400, 'Chưa có dữ liệu.');
      const content = generated ? generated.sections.map(s => `${s.number}. ${s.title}\n${s.text}`).join('\n\n') : clean(a.content, 10000), notes = clean(a.notes, 10000);
      const row = { id: nextId(db.reports, 'BC'), type, from: a.from, to: a.to, content, notes, files: [], fileDetails: [], status: a.confirm ? 'Đã lưu' : 'Bản nháp', author: actor.id, authorName: actor.name, created: current(), updated: current(), summary: counts(), ...(generated ? { reportData: generated } : {}) };
      atomic(() => { db.reports.unshift(row); log(actor, 'Lập báo cáo', row.id); });
      return reply(response, 201, { item: row, message: a.confirm ? 'Lưu thành công!' : 'Đã giữ bản nháp' });
    }
    if (parts[1] === 'reports' && id && method === 'PATCH') {
      const actor = allow(request, 'reports.edit'), r = find(db.reports, id, 'báo cáo'), a = await read(), changes = {};
      if (Object.hasOwn(a, 'content') && !r.reportData) changes.content = clean(a.content, 10000);
      if (Object.hasOwn(a, 'notes')) changes.notes = clean(a.notes, 10000);
      if (Object.hasOwn(a, 'confirm')) changes.status = a.confirm ? 'Đã lưu' : 'Bản nháp';
      atomic(() => { Object.assign(r, changes); r.updated = current(); log(actor, 'Chỉnh sửa báo cáo', id); });
      return reply(response, 200, { message: 'Cập nhật thành công!', item: r });
    }

    // ── History ──
    if (p === '/api/history' && method === 'GET') {
      allow(request, 'history.view');
      const from = norm(u.searchParams.get('from')), to = norm(u.searchParams.get('to'));
      if ((from && !date(from)) || (to && !date(to)) || (from && to && from > to)) error(400, 'Khoảng thời gian không hợp lệ!');
      const items = db.history.filter(x => (!from || vietnamDay(x.time) >= from) && (!to || vietnamDay(x.time) <= to)).sort((a, b) => String(b.time).localeCompare(String(a.time)) || String(b.id).localeCompare(String(a.id)));
      return reply(response, 200, { items });
    }

    error(404, 'Không tìm thấy API');
  }

  // ── Serve upload from Neon ────────────────────────────────────────────────
  async function serveUpload(request, response, u) {
    const actor = tokenUser(request);
    if (!actor) { response.writeHead(401); response.end('Unauthorized'); return; }
    const filename = path.basename(u.pathname);
    const rows = await sql`SELECT mime_type,data FROM uploads WHERE filename=${filename}`;
    if (!rows.length) { response.writeHead(404); response.end('Not found'); return; }
    const { mime_type: mime, data } = rows[0];
    const bytes = Buffer.from(data, 'base64');
    response.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(bytes);
  }

  // ── Dispatch ──────────────────────────────────────────────────────────────
  try {
    const u = new URL(req.url, 'http://localhost');
    if (u.pathname.startsWith('/api/')) {
      await route(req, res, u);
    } else if (u.pathname.startsWith('/uploads/')) {
      await serveUpload(req, res, u);
    } else {
      res.writeHead(404); res.end('Not found');
    }
  } catch (e) {
    if (e.status !== 401 && e.status !== 403) console.error('[LIGHTHOUSE]', e.message);
    if (!res.headersSent) reply(res, e.status || 500, { error: e.status ? e.message : 'Đã xảy ra lỗi hệ thống!' });
  }

  // ── Flush uploads to Neon (all independent writes run concurrently) ───────
  await Promise.all([
    dirty ? saveDb(db) : Promise.resolve(),
    ...[...pendingUploads].map(([filename, { mime, data }]) =>
      sql`INSERT INTO uploads(filename,mime_type,data,created_at) VALUES(${filename},${mime},${data},NOW()) ON CONFLICT(filename) DO NOTHING`),
    ...[...deletedUploads].map(filename => sql`DELETE FROM uploads WHERE filename=${filename}`)
  ]);
};
