# Bộ màn hình cập nhật UC01/UC02

Nguồn: `màn hình update.rar` người dùng gửi ngày 14/11/2026.
Giải nén được 19 PNG: 11 Frame UC01 1920×1080, ba banner UC01 400×50,
và năm Frame UC02 1920×1080. Archive không có UC03–UC11.
Các ảnh là nguồn tham chiếu mới, thay thế phần trình bày UC01/UC02 cũ.

## Ánh xạ

| Ảnh/trạng thái mới | Triển khai |
| --- | --- |
| UC01_Đăng nhập | Giữ ảnh nền/logo gốc, card 540×960 ở 1920×1080 và tỷ lệ responsive đã chốt |
| Đăng nhập thông báo sai email hoặc mật khẩu | Viền đỏ ở hai input, lỗi “Email hoặc mật khẩu sai.” dưới mật khẩu; không dùng popup cho trường hợp này |
| Quên mật khẩu; Quên mật khẩu (1) | Thêm nút quay lại; lỗi trống/sai định dạng dưới email, không dịch nút Tiếp tục khi hiện lỗi |
| Quên mật khẩu thông báo email không hợp lệ; Frame 4 | Email không có trong hệ thống dùng thông báo “Kiểm tra lại địa chỉ Email” |
| Nhập mã xác minh | Nút quay lại trang email, giữ địa chỉ đã nhập; bốn ô số, đếm ngược/gửi lại |
| Mã không hợp lệ, mã hết hạn; Frame 2/3 | Khung mã có viền đỏ, thông báo tương ứng trên banner; giữ dữ liệu để sửa/thử lại |
| Tạo mật khẩu mới | Nút quay lại bước xác minh, xóa token trong state khi quay lại để bắt buộc xác minh lại |
| Lỗi nhập mật khẩu mới | Có thể hiện đồng thời lỗi độ mạnh và lỗi xác nhận, như ảnh; giữ biểu mẫu |
| Đổi mật khẩu thành công | Giữ dấu tích, hướng dẫn và nút đăng nhập |
| UC02 mặc định | Bốn nhóm: cá nhân, gia đình, học tập, minh chứng; mô tả ngành và gợi ý đặt cạnh nhau |
| UC02 select quê quán | Dropdown trắng, bốn thành phố đầu theo ảnh; vẫn đủ 34 tỉnh/thành, hỗ trợ chuột và bàn phím |
| UC02 (1) | Lỗi thiếu thông tin cạnh nhãn; viền đỏ ở trường và vùng tải tệp |
| UC02 (2) | Lỗi điện thoại 10 số, email, CCCD 12 số và dung lượng tệp tại từng trường |
| UC02 thành công | Chỉ hiển thị sau khi API lưu xong, quay lại đăng nhập hoạt động |

## Giữ dữ liệu và hành vi

UC02 chuyển từ hai vùng tải tệp sang **một vùng Minh chứng** theo ảnh mới, tối đa
sáu tệp và 1,5 MB/tệp. UI gửi qua trường API `files` sẵn có, kèm `evidenceMode=combined` để lưu nhóm
`general`, không tự đoán tệp thuộc gia đình hay học tập. Backend vẫn nhận
`familyFiles`/`schoolFiles` từ các client cũ. Không đổi cấu trúc database, không
reset dữ liệu hoặc di chuyển/xóa các tệp đã lưu. Tên, URL, ngày và metadata tệp mới
vẫn được API lưu vào `documents` để UC03/UC04 đọc được.

Giữ API xác thực, hashing, OTP có hạn, cooldown và thu hồi phiên sau đổi mật khẩu.
Lỗi đăng nhập có nội dung thống nhất, không tiết lộ email hay mật khẩu nào sai.
Lỗi API/kết nối vẫn hiện thông báo và giữ dữ liệu nhập; không giả thành công.

Ảnh đăng nhập lỗi có card bị lệch lên mép trên và không thấy phần logo, trong khi
các input vẫn cùng vị trí với ảnh đăng nhập thường. Triển khai giữ card/logo ổn định
và chỉ đổi trạng thái lỗi, tránh làm giao diện nhảy khi đăng nhập sai.
Ba Frame banner được dùng làm tham chiếu thông báo, không đặt ảnh banner lên UI
thay cho văn bản. Giữ Roboto/Ribeye, asset nền/logo gốc và các quy tắc responsive.

## Kiểm tra

- `npm test --prefix backend`: kiểm tra API và tương thích dữ liệu/tệp cũ.
- `scripts/auth_browser_smoke.py`: đăng nhập sai tại trường, back, lỗi email trống,
  không tồn tại, OTP sai/hết hạn, đổi mật khẩu và đăng nhập bằng mật khẩu mới.
  Nhánh hết hạn UI và một response quay lại OTP được mô phỏng; OTP lưu/đổi mật khẩu
  và các nhánh expiry/cooldown Backend đã được test riêng.
- `scripts/registration_browser_smoke.py`: label errors, dropdown, định dạng, tệp
  sai/quá lớn/quá nhiều, API lỗi giữ form, nộp hai tệp thực và đọc lại JSON/file.
- `scripts/browser_smoke.py`: đăng nhập và các trang quản lý/sinh viên hiện có.
- `scripts/responsive_browser_smoke.py`: tám viewport 320×568 đến 2560×1440.

Ảnh kiểm tra ở `artifacts/uc01/`, `artifacts/uc02/`, `artifacts/responsive/`.
Đã đối chiếu trực quan với PNG nguồn; không tuyên bố trùng mọi pixel trên mọi
trình duyệt. Không có dữ liệu nguồn mới cho UC03–UC11 trong archive này.
