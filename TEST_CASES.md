# LIGHTHOUSE – Phiếu kiểm thử UC01–UC11 (bản riêng, dữ liệu giả lập)

> **Loại bản dựng:** bản chạy thử các quy trình FE–BE bằng JSON trên localhost. Chưa đạt nghiệm thu production theo SDD. Chỉ nhập dữ liệu giả, không tải lên ảnh/giấy tờ thật.

## Chuẩn bị

- Mở `run-demo.bat` hoặc `cd backend && node server.js`; trình duyệt truy cập `http://localhost:3000`.
- Dùng tài khoản trong `README.md`, mật khẩu `Demo@123`.
- Kiểm tra bằng cách đổi thông tin, tải lại trang và xác nhận dữ liệu còn trong bản demo.
- Muốn reset, **dừng server**, chạy `cd backend && node seed.js --reset`, rồi mở lại.

## Kịch bản kiểm thử

| ID | Vai trò | Thao tác | Kết quả mong đợi | Kết quả thực tế | Đạt/Chưa | Lỗi |
|---|---|---|---|---|---|---|
| TC01 | Quản lý | Đăng nhập đúng/sai mật khẩu | Đúng vào trang chủ; sai báo lỗi | | | |
| TC02 | Cán bộ | Đăng nhập rồi mở quản lý người dùng | Không được cấp quyền sẽ không thực hiện được nghiệp vụ bị cấm | | | |
| TC03 | Sinh viên | Đăng ký hồ sơ mới (qua màn hình đăng ký công khai) | Hồ sơ mới ở trạng thái Chờ kiểm tra | | | |
| TC04 | Quản lý | Thay trạng thái hồ sơ từ Chờ kiểm tra sang Đạt yêu cầu, Tiếp nhận | Tạo sinh viên chính thức, lịch sử ghi nhận | | | |
| TC05 | Quản lý | Tìm sinh viên theo tên/mã, xem chi tiết | Trả đúng danh sách và dữ liệu | | | |
| TC06 | Quản lý | Chỉnh sửa hồ sơ, làm mới trình duyệt | Dữ liệu đã sửa được giữ lại | | | |
| TC07 | Quản lý | Thử upload ảnh sai định dạng; upload ảnh PNG/JPG hợp lệ | Ảnh sai từ chối; ảnh hợp lệ xuất hiện | | | |
| TC08 | Quản lý | Tạo phòng, thử số SV vượt sức chứa; xóa phòng | Ngăn vượt sức chứa; khi xóa phòng cập nhật SV chưa bố trí | | | |
| TC09 | Sinh viên | Gửi mục tiêu 6 tháng; quản lý đánh giá; sinh viên gửi lại | Chuyển đổi trạng thái đúng theo xử lý | | | |
| TC10 | Sinh viên | Gửi GPA; quản lý yêu cầu bổ sung rồi duyệt | Dữ liệu KQHT đổi trạng thái, có lịch sử | | | |
| TC11 | Quản lý | Đổi SV sang Đã kết thúc hỗ trợ | SV xuất hiện ở danh sách Alumni | | | |
| TC12 | Quản lý | Thêm người dùng, cấp quyền, vô hiệu hóa | Quyền truy cập thay đổi, không xóa lịch sử | | | |
| TC13 | Quản lý | Lập báo cáo, lưu nháp, lưu chính thức, xem trước | Báo cáo được lưu; có thể Print → Save as PDF | | | |
| TC14 | Quản lý | Lọc lịch sử hợp lệ, ngày bắt đầu lớn hơn ngày kết thúc | Dữ liệu được lọc, khoảng ngày sai bị từ chối | | | |
| TC15 | Sinh viên | Mở trang hồ sơ quản trị / lịch sử | Không truy cập được API yêu cầu quyền | | | |

## Mẫu báo lỗi

**ID lỗi:** BUG-001  
**Use Case:** UCxx.x  
**Màn hình:** [Tên màn hình]  
**Tài khoản/Vai trò:** [Tài khoản DEMO, không gửi mật khẩu thật]  
**Các bước tái hiện:** 1) ... 2) ... 3) ...  
**Kết quả mong đợi:** ...  
**Kết quả thực tế:** ...  
**Mức độ:** Nghiêm trọng / Trung bình / Nhỏ  
**Ảnh hoặc video minh chứng:** ...  

## Chênh lệch chưa đạt với 2 báo cáo Final

1. CSDL thực thi hiện đang là JSON (không phải SQL Server SDD). Script 16 bảng SQL Server là tài liệu triển khai, chưa kết nối vào API.
2. Quên mật khẩu/tiếp nhận sinh viên chưa gửi email OTP và thư mời thực tế; chỉ có OTP demo.
3. File ảnh được lưu cục bộ, chưa lưu bền vững/riêng tư trên cloud; chưa hoàn thiện upload giấy tờ hồ sơ, minh chứng KQHT, hóa đơn và file đính kèm báo cáo.
4. Báo cáo xuất PDF theo cách in từ trình duyệt, chưa có dịch vụ tạo PDF phía Backend.
5. Lịch sử thay đổi ghi nhận sự kiện, chưa phải hệ thống lưu nhiều phiên bản dữ liệu và so sánh từng trường theo yêu cầu BR-03.
6. NFR 24/7, <5 giây, 10 người đồng thời, 5–10 phút/backup, hai ngôn ngữ và phân quyền chi tiết cần thử trên hạ tầng thật. Chưa được nghiệm thu.
7. Thiết kế web lấy cảm hứng từ Lighthouse nhưng chưa xác nhận trùng khớp 100% từng Frame của Figma.

Khi đăng lỗi, ghi rõ **bản build + vai trò + các bước**, không gửi hồ sơ sinh viên thật qua kênh công khai.
