'use strict';
// Shared role caps and capability catalogue. Stored legacy grants are expanded within the role cap.
(function(root){
const items=[
 ['registrations.review','Kiểm tra & tiếp nhận hồ sơ mới',['registrations.view']],
 ['students.view','Xem thông tin sinh viên',[]],
 ['students.edit','Chỉnh sửa hồ sơ & hình ảnh',['students.view']],
 ['rooms.view','Xem thông tin phòng ở',[]],
 ['rooms.assign','Sửa bố trí phòng ở',['rooms.view']],
 ['rooms.create','Tạo phòng mới',['rooms.view']],
 ['rooms.delete','Xóa phòng',['rooms.view']],
 ['alumni.view','Xem hồ sơ kết thúc hỗ trợ',[]],
 ['alumni.edit','Cập nhật kết thúc hỗ trợ',['students.view']],
 ['reports.view','Xem báo cáo',[]],
 ['reports.edit','Lập báo cáo',['reports.view']],
 ['goals.review','Đánh giá mục tiêu',['goals.view']],
 ['goals.view','Xem & xác nhận mục tiêu mới',[]],
 ['grades.review','Xem & xác nhận kết quả học tập mới',['grades.view']],
 ['users.manage','Quản lý người dùng & phân quyền',['users.view']],
 ['history.view','Xem lịch sử hoạt động',[]]
];
const expand=keys=>[...new Set(keys.flatMap(k=>[k,...(items.find(i=>i[0]===k)?.[2]||[])]))];
const has=(keys,k)=>keys.includes('*')||expand(keys).includes(k)||(['rooms.assign','rooms.create','rooms.delete'].includes(k)&&keys.includes('rooms.edit'));
const selected=keys=>items.filter(([k])=>has(keys,k)).map(([k])=>k);
const known=[...new Set([...items.map(i=>i[0]),...items.flatMap(i=>i[2])])];
const director=['users.manage','users.view','students.view','alumni.view','reports.view','history.view'];
const allowed=(role,k)=>role==='SinhVien'?false:role==='GiamDoc'?director.includes(k):role==='CanBo'?!['users.manage','users.view'].includes(k):role==='QuanLy';
const effective=u=>known.filter(k=>allowed(u.role,k)&&has(u.permissions||[],k));
const hasFor=(u,k)=>!!u&&effective(u).includes(k);
const catalogue={items,expand,has,selected,known,allowed,effective,hasFor};if(typeof module!=='undefined')module.exports=catalogue;else root.LighthousePermissions=catalogue;
})(typeof window!=='undefined'?window:globalThis);
