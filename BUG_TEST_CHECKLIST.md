# Checklist tự kiểm thử / ghi lỗi LIGHTHOUSE

**Hệ thống:** LIGHTHOUSE UC01–UC11 (bản test)
**Môi trường:** Windows + Chrome + Node.js localhost:3000
**Nguyên tắc:** dùng dữ liệu giả, không dùng CCCD/ảnh sinh viên thật.

| UC | Thử thao tác | Kết quả mong đợi |
|---|---|---|
| UC01 | Đăng nhập sai mật khẩu | “Email hoặc mật khẩu sai!” |
| UC01 | Quên mật khẩu tài khoản demo | Nhận mã demo ở localhost và đặt lại mật khẩu được |
| UC02 | Nộp hồ sơ mới + tệp PDF/JPG/PNG nhỏ | Hồ sơ xuất hiện trong “Tiếp nhận hồ sơ” |
| UC03 | Chọn “Đạt yêu cầu” rồi tiếp nhận | Tạo hồ sơ sinh viên, có mã LH mới |
| UC03 | Tiếp nhận hồ sơ “Chờ kiểm tra” | Bị từ chối với thông báo chưa đủ điều kiện |
| UC04 | Tìm tên/mã sinh viên; sửa tên | Lưu được; sau F5 vẫn có dữ liệu đã sửa |
| UC04 | Thêm ảnh PNG/JPG, chọn file giả PNG | Hiển thị ảnh trên hồ sơ; file khác định dạng bị từ chối |
| UC05 | Tạo phòng trùng mã | Báo trùng phòng |
| UC05 | Xếp số sinh viên lớn hơn sức chứa | Báo “Phòng đầy!” |
| UC05 | Xóa phòng có sinh viên | Sinh viên được chuyển thành “Chưa bố trí” |
| UC06 | Đánh giá mục tiêu “Chờ bổ sung” | Sinh viên đăng nhập thấy nút “Gửi lại” |
| UC06 | Xét duyệt KQHT “Yêu cầu gửi lại” | Sinh viên có thể bổ sung kết quả |
| UC07 | Kết thúc hỗ trợ hồ sơ từ màn chỉnh sửa | Sinh viên hiện ở danh sách Alumni |
| UC08 | Cán bộ chỉ xem thử thao tác không có quyền | API ngăn thao tác; giao diện không hiện nút không có quyền |
| UC08 | Vô hiệu hóa người dùng | Không đăng nhập lại được, lịch sử vẫn giữ |
| UC09 | Lập và lưu nháp, chỉnh sửa, xem | Báo cáo giữ lại và cập nhật trong danh sách |
| UC09 | “Xuất PDF” | Mở bản in; Chrome cho phép chọn “Save as PDF” |
| UC10 | Ngày bắt đầu > ngày kết thúc | “Khoảng thời gian không hợp lệ!” |
| UC10 | Lọc thời gian không có bản ghi | “Không tìm thấy lịch sử hoạt động!” |
| UC11 | Đăng nhập sinh viên và gửi mục tiêu/KQHT | Dữ liệu lên danh sách chờ xét duyệt của quản lý |

## Mẫu ghi bug

- **ID bug:** LH-BUG-001
- **Use Case / màn hình:** UCxx – ...
- **Tài khoản/vai trò:** ... (không ghi mật khẩu thật)
- **Bước tái hiện:** 1) ... 2) ... 3) ...
- **Kết quả mong đợi:** ...
- **Kết quả thực tế:** ...
- **Mức độ:** Blocker / High / Medium / Low
- **Bằng chứng:** ảnh chụp, thời gian thử, log console.

## Các rủi ro đã biết cần kiểm chứng sau này

- Demo sử dụng JSON, chưa chạy trực tiếp với 16 bảng SQL Server.
- Không có email thật cho OTP và mời sinh viên.
- File được lưu trên ổ đĩa server demo, không phải private object storage production.
- Xuất PDF qua chức năng in của trình duyệt, chưa có máy chủ PDF riêng.
- Phiên đăng nhập và JSON demo không thích hợp cho deploy sản xuất hoặc lưu dữ liệu thật.
