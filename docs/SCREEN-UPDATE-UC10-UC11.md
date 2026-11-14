# UC10/UC11 — ZIP cập nhật ngày 14/11/2026

Nguồn: ZIP mới nhất gửi sau UC07–UC09, gồm 13 PNG: 5 ảnh UC10 và 8 ảnh UC11.
Các ảnh 1920×1080, riêng ảnh KQHT có bảng đã gửi là 1920×1501. Đối chiếu thêm
UC10/UC11 trong SRS và phần UC10 của Design. Tiếp tục giữ sidebar 185 px đủ tên
mục, Roboto nội dung, Ribeye logo, mã/hồ sơ và dữ liệu có sẵn. Không chạy seed,
reset hoặc thay các hồ sơ hiện tại bằng tên “Thư”/số liệu minh họa trong ảnh.

## UC10 — Lịch sử hoạt động

- Hai trường ngày dùng date picker của trình duyệt, có nhãn Ngày bắt đầu/Ngày
  kết thúc. Nhóm bản ghi theo ngày, mới nhất trước, có giờ, hoạt động, đối tượng,
  người thực hiện. Ngày/giờ tiếp tục dùng UTC như API và dữ liệu cũ.
- Giữ sidebar, tiêu đề, bộ lọc và đầu cột; chỉ danh sách ngày/hàng bên phải cuộn.
  Bảng rộng cuộn ngang bên trong khu vực bảng trên màn hình hẹp.
- Khoảng sai hiển thị “Khoảng thời gian không hợp lệ!”, giữ kết quả hợp lệ trước
  đó. Khoảng rỗng hiển thị “Không tìm thấy lịch sử hoạt động!” và bảng rỗng, không
  giữ các hàng cũ dưới thông báo rỗng như dữ liệu minh họa của ảnh.
- Server kiểm tra ngày lịch thực, gồm ngày nhuận; tính cả ngày đầu/cuối; sắp xếp
  giảm dần và kiểm tra `history.view`. Xem/lọc không tạo thêm audit. Không có API
  sửa/xóa lịch sử. Đây vẫn là JSON demo, chưa phải kho audit bất biến bên ngoài.
- Bỏ qua response bộ lọc cũ khi người dùng đổi ngày liên tiếp. Khi quay lại trang
  sau một khoảng nhập sai, trang vẫn tải bằng khoảng hợp lệ đã áp dụng gần nhất.

## UC11.2 — Mục tiêu 6 tháng

Danh sách riêng cho sinh viên gồm ngày gửi, mục tiêu, nội dung, trạng thái và Xem;
không dùng các thống kê/bộ lọc dành cho quản lý. Dùng dữ liệu của tài khoản hiện
hành. Nút Tạo mục tiêu mở hộp 600 px, hai trường Mục tiêu/Chi tiết nội dung, textarea
300 px tại desktop. Chi tiết tối đa 10.000 ký tự, giữ xuống dòng khi xem.

Thiếu trường hiển thị lỗi tại trường: “Vui lòng nhập đầy đủ các mục tiêu trước khi
gửi!”. Gửi thành công mới đóng hộp và báo “Gửi thành công!”. Lỗi lưu giữ nguyên
nội dung để thử lại; đóng/hủy không ghi dữ liệu. Mục tiêu Chờ bổ sung có thể gửi
lại bằng chính mã mục tiêu, giữ bản trước trong `goalRevisions` rồi chờ đánh giá.

## UC11.1 — Kết quả học tập

- Trang Cung cấp kết quả học tập có Học kỳ, Năm học, GPA, Xếp loại, Nợ môn,
  Chứng chỉ và Minh chứng. Form ở trên, Kết quả đã gửi ở dưới theo ảnh dài 1501 px;
  nội dung bên phải cuộn, sidebar/header giữ nguyên. Không thu nhỏ toàn bộ form
  để ép cả hai khối vào viewport.
- Thiếu thông tin báo “Vui lòng nhập đầy đủ thông tin trước khi gửi !” tại trường;
  GPA nhận 0–4, số môn nợ là số nguyên không âm; giá trị 0 hợp lệ. Xếp loại bắt
  buộc theo ảnh lỗi; chứng chỉ và minh chứng tiếp tục tùy chọn theo API hiện có.
  Số môn nợ dương có nhắc cần theo dõi.
- Minh chứng PDF/JPG/PNG tối đa 1,5 MB. Đổi nhãn tải thành tên tệp; sai loại báo
  “File không đúng định dạng !”. API kiểm tra MIME/chữ ký và kích thước thật.
- Gửi thành công báo “Gửi thành công!”, thêm vào danh sách Chờ xét duyệt; API lỗi
  giữ các trường và tệp để thử lại. Dữ liệu vừa nhập chỉ giữ trong phiên tài khoản
  hiện tại, không chuyển sang tài khoản sinh viên khác khi đăng xuất/đăng nhập.
- Banner đếm đúng số kết quả Yêu cầu gửi lại và mở hộp Bổ sung kết quả học tập.
  Hộp 600 px, nạp dữ liệu cũ và ghi chú quản lý chỉ đọc; có xem minh chứng cũ.
  Gửi lại cập nhật chính mã KQHT, chuyển về Chờ xét duyệt, giữ bản trước trong
  `gradeRevisions`. Không chọn tệp mới thì giữ URL/tên minh chứng cũ; thay tệp
  vẫn giữ tệp cũ cho bản lịch sử. Không cho client sửa trạng thái/ghi chú quản lý.
- Hộp bổ sung cuộn phần trường/ghi chú, giữ tiêu đề và nút Gửi lại. Màn hình thấp
  giảm khoảng cách hợp lý; điện thoại co trường theo chiều rộng thực, vẫn đủ nhãn.

## Dữ liệu, phân quyền và lỗi lưu

Sinh viên chỉ xem/gửi/gửi lại dữ liệu thuộc `studentId` của mình, không dùng mã do
client cung cấp. Tài khoản chưa liên kết không đọc bản ghi mồ côi; hồ sơ không ở
trạng thái Đang hỗ trợ chỉ xem thông tin đã gửi. Tên chào và audit của sinh viên
lấy từ hồ sơ chuẩn cùng mã, không dùng tên tài khoản mẫu khác với hồ sơ UC04.
Sidebar chỉ sáng đúng mục đang mở. Đăng xuất đóng các hộp thông tin đang hiển thị.

Validate đầy đủ trước khi sửa dữ liệu. Ghi JSON lỗi khôi phục các hàng, lịch sử,
revision và xóa tệp mới vừa tạo; không để một lần gửi thất bại làm đổi dữ liệu
trong bộ nhớ. Không thay định dạng lưu của bản ghi cũ; revisions được thêm khi
gửi lại, không dựng lại lịch sử giả cho các bản ghi trước đây.

## Kiểm tra

- 58 tests API đạt, gồm 6 bài mới về ngày/lọc/quyền lịch sử, mục tiêu dài và gửi
  lại, KQHT/0/rank/minh chứng, giới hạn hồ sơ, cách ly tài khoản và rollback khi
  ghi đĩa thất bại. Test cũ bổ sung xếp loại bắt buộc trong mẫu gửi minh chứng.
- `scripts/student_history_browser_smoke.py`: 40 ảnh tại 1920×1080 và 1366×768;
  lọc/cuộn, lỗi/không kết quả, mục tiêu, KQHT, tệp sai, hủy không ghi, lỗi API/thử
  lại, bổ sung, duyệt UC06, đồng nhất UC04 và không lộ bản nháp giữa tài khoản.
- Responsive 8 viewport từ 320×568 đến 2560×1440: thêm danh sách/form/hộp UC11,
  cuộn vùng đúng, nút gửi truy cập được, sidebar đầy đủ. Giữ các bài UC01–UC09.
- CI chạy toàn bộ 10 bộ browser và API trên dữ liệu test riêng; ảnh kết quả ở
  artifacts, không commit vào source. Đối chiếu bố cục/hành vi, không khẳng định
  pixel-perfect trên mọi thiết bị hoặc ở mọi mức browser zoom.

Triển khai trên `codex/staging-readiness` để Render auto deploy sau CI như cấu
hình đang có. Không đổi dịch vụ/môi trường. Proxy cloud vẫn chặn Render nên trạng
thái Live phải đối chiếu bằng commit trên Dashboard; chỉ tải lại web sau khi Live.
