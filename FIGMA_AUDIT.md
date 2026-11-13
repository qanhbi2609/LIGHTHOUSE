# LIGHTHOUSE — Đối chiếu giao diện với Figma (CHƯA NGHIỆM THU FINAL)

## Nguồn thiết kế bắt buộc
- File: https://www.figma.com/design/xF9VqYXD2TgESMQZpN7e5a/Untitled?node-id=461-3048
- Page “Quản lý” (`461:3048`): kiểm kê **66 top-level Frame** vào ngày 13/11/2026.
- Page “Sinh viên” (`461:2937`): kiểm kê **8 top-level Frame**.
- Page `final` (`66:258`): có màn hình đăng nhập/quên mật khẩu và các Frame cũ.
- Kích thước Frame chính: **1920 × 1080 px**, Sidebar **260 px**, màu xanh chủ đạo Lighthouse, Roboto.

## Cập nhật UC01 sau khi người dùng bổ sung ảnh

Đã bổ sung nguyên bản ảnh nền 1920×1080 và logo trong suốt 120×120 từ `Downloads.zip`,
đổi chữ LIGHTHOUSE sang Ribeye và tách các trạng thái xác thực. Chi tiết và giới hạn kiểm thử
ở [UC01](docs/UC01.md). Mục thiếu asset UC01 bên dưới là ghi chép cũ, nay đã được xử lý;
việc đối chiếu pixel đầy đủ với Figma và các UC khác vẫn chưa nghiệm thu.

## Các phần đã đổi trong source so với prototype trước
1. Bỏ trang “Tổng quan”, dải nhãn `TEST BUILD` và phần nội dung giới thiệu demo tự thêm ở màn hình quản lý.
2. Bố cục Sidebar/Header, nền gradient, cỡ chữ, bảng, nút, thẻ thống kê, thẻ phòng được điều chỉnh theo các Frame nguồn.
3. Các trang danh sách UC03/UC04/UC05/UC06/UC07/UC08/UC09/UC10 thay đổi theo cấu trúc hiển thị trong Figma.
4. UC04 — Chi tiết hồ sơ có thẻ Thông tin cá nhân, Học tập, Mục tiêu 6 tháng, Hỗ trợ, Hình ảnh; sửa hồ sơ chuyển sang biểu mẫu thay vì popup bao toàn bộ.
5. Giữ Backend/API của bản mẫu để test luồng nghiệp vụ; không khẳng định đạt toàn bộ SRS/SDD.

## Lỗi/chênh lệch ĐÃ BIẾT — chưa đủ điều kiện nói giống hệt
- **LỖI NGHIÊM TRỌNG 01:** Màn hình đăng nhập trong code chưa có đúng ảnh nền và logo nguyên bản như Frame đăng nhập trên trang `final`. Asset gốc chưa được đưa vào project.
- **LỖI NGHIÊM TRỌNG 02:** Chưa chuyển đổi đầy đủ 66 trạng thái/Frame trên page “Quản lý” thành từng trạng thái giao diện tương ứng.
- **LỖI NGHIÊM TRỌNG 03:** Nhiều dialog (xác nhận, yêu cầu bổ sung, chọn sinh viên, báo cáo xem trước) còn dùng mẫu popup chung và chưa đúng kích thước/vị trí từng Frame.
- **LỖI NGHIÊM TRỌNG 04:** Dữ liệu demo từ `backend/seed.js` chưa khớp nội dung hàng/cột trên Figma (mã, tên, số lượng, ngày, giá trị). Cần thống nhất dữ liệu kiểm thử với giao diện tham chiếu mà không đưa thông tin cá nhân thật lên hosting.
- **LỖI NGHIÊM TRỌNG 05:** Kiểu chữ trang đăng nhập và một số icon dùng phần tử CSS/SVG tương đương, chưa so khớp asset Figma gốc.
- **LỖI NGHIÊM TRỌNG 06:** Browser QA trong container gặp `net::ERR_BLOCKED_BY_ADMINISTRATOR` ngay cả với `data:` và `localhost`, nên chưa có đối chiếu ảnh tự động sau khi chạy tại 1920x1080.
- **LỖI NGHIÊM TRỌNG 07:** Database đang là JSON demo, không phải SQL Server runtime; ảnh upload vẫn là local server; OTP là demo; xuất PDF qua trình duyệt. Chưa đạt định nghĩa production theo SDD.
- **LỖI NGHIÊM TRỌNG 08:** Chưa có URL online: connector GitHub không có repository LIGHTHOUSE sẵn sàng triển khai và tài khoản Render đang có workspace dùng chung của trường mà chưa được chủ tài khoản xác nhận triển khai vào đó.

## Quy trình nghiệm thu chính xác cho mỗi Frame
- [ ] Lấy ảnh trực tiếp từ node Figma cùng kích cỡ 1920×1080.
- [ ] Chụp website bằng Chrome cùng viewport và tỉ lệ 100%.
- [ ] So sánh pixel: layout Sidebar/Header, nội dung, khoảng trắng, chữ, border, màu, ảnh, button, input và hover/active.
- [ ] Kiểm tra nút và trạng thái điều hướng đến đúng Frame, không tự thêm text hoặc bỏ bước nghiệp vụ.
- [ ] Kiểm tra Main/Alternative/Exception flows theo hai tài liệu đã nộp.
- [ ] Chạy regression test Backend/API và kiểm thử lưu dữ liệu bền vững khi reload/redeploy.
- [ ] Chỉ đánh dấu FINAL khi **tất cả** Frame đã pass.

**Không nên deploy bản này như production hoặc nộp là bản Final.** Đây là source cập nhật để tiếp tục kiểm tra và hoàn thiện; không có tuyên bố đã đạt 100%.
