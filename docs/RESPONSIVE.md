# Sidebar và responsive — 14/11/2026

Nguồn mới: hai ảnh trình duyệt người dùng gửi (Quản lý báo cáo và Quản lý phòng ở).
Yêu cầu mới này thay thế kích thước sidebar 260 px trong các ghi chép đối chiếu cũ.

## Thay đổi

- Sidebar desktop/tablet rộng 185 px, chữ menu 12 px, icon 14 px, logo Ribeye 18 px;
  tương ứng sidebar nhỏ trong ảnh Quản lý báo cáo. Giữ Roboto cho phần còn lại.
- Dùng cùng kích thước trên các trang, bỏ các override sidebar riêng UC03–UC08.
  Sidebar và footer nằm trong chiều cao cửa sổ, không thu nhỏ cả website bằng zoom.
- Điện thoại dùng nút Menu mở sidebar đầy đủ icon và tên mục, không dùng thanh chỉ có icon. Logo luôn nằm trong viền; menu không chiếm chiều rộng nội dung khi đóng.
- UC01 trước đây luôn chọn card 384×688 khi chiều cao <=950, form đặt absolute.
  Đổi sang card 420–540 px theo chiều rộng (giới hạn 100% không gian thực), bố cục
  flow ở màn hình nhỏ/thấp, input 48 px và chữ 16 px. Khi cửa sổ quá thấp, trang
  cuộn dọc để tới các nút; không chồng nút/input khi phóng to trình duyệt.
- Các bảng rộng cuộn ngang trong vùng nội dung trên điện thoại; trường nhập, bộ lọc,
  thẻ phòng và các footer hộp thoại co giãn/đổi hàng theo không gian.
- Giữ nút đăng xuất trên điện thoại, bổ sung nhãn truy cập cho các nút menu.
- Kiểm tra hộp thoại lập báo cáo phát hiện `today` chưa định nghĩa; bổ sung helper
  để mở được form và kiểm tra responsive thực tế.
- Không đổi dữ liệu, phân quyền, sức chứa phòng hoặc các API.

## Kiểm tra

Bộ `scripts/responsive_browser_smoke.py` kiểm tra Chromium với tám viewport CSS:
320×568, 390×844, 768×1024, 1024×600, 1093×614, 1366×608, 1920×1080,
2560×1440. Kích thước 1093×614 mô phỏng không gian bị giảm do zoom/DPI trên laptop;
đây không thay thế việc thử mọi hệ điều hành, trình duyệt hoặc thiết bị thực.

Kiểm tra năm trạng thái UC01, đăng ký UC02, chín trang quản lý, năm tab hồ sơ,
hộp thoại tạo phòng, phân quyền và lập báo cáo. Xác nhận không tràn ngang toàn trang,
sidebar đủ menu, các ô nhập nằm trong card và nút lưu trong hộp thoại truy cập được.
Các bộ browser trước đây vẫn chạy để kiểm tra luồng nghiệp vụ, thu hồi quyền,
validation, dữ liệu và vùng cuộn dữ liệu. Bộ responsive đạt cả tám viewport, tạo 202 ảnh. Bảy bộ browser hiện có cũng đạt. Bằng chứng tại `artifacts/responsive/`.

```bash
CHROMIUM_PATH=/usr/bin/chromium python scripts/responsive_browser_smoke.py
CHROMIUM_PATH=/usr/bin/chromium python scripts/browser_smoke.py
CHROMIUM_PATH=/usr/bin/chromium python scripts/auth_browser_smoke.py
```

Không khẳng định đã kiểm tra mọi máy hoặc mọi mức zoom. Khi có lỗi trên thiết bị
khác, cần viewport, trình duyệt, mức zoom và ảnh lỗi để tái hiện cụ thể.
