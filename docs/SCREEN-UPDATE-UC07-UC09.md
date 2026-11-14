# UC07/UC08/UC09 — ZIP cập nhật ngày 14/11/2026

Nguồn ưu tiên: `màn hình update.zip` gửi sau đợt UC05/UC06. Gồm 33 PNG
1920×1080: UC07 12 ảnh, UC08 13 ảnh, UC09 8 ảnh. Đối chiếu thêm Design PDF
trang 89–103 và ghi chép `UC07-UC08.md`. Giữ sidebar 185 px đủ tên mục theo quyết
định người dùng, Roboto cho nội dung và Ribeye cho logo LIGHTHOUSE.

## UC07

Tiếp tục dùng các luồng đã có: danh sách, tìm tên/mã/email có/không có kết quả,
xem thông tin cá nhân, học tập và minh chứng, mục tiêu và chi tiết, hỗ trợ và hóa đơn,
hình ảnh theo tháng. Đổi ký tự tìm kiếm thành biểu tượng SVG theo ảnh; không thay
hồ sơ, mã, dữ liệu hay phân quyền. Hồ sơ Alumni chỉ xem, giữ bộ lọc và từ khóa khi
quay lại. Danh mục ảnh có vùng cuộn riêng; trên điện thoại thấp cho phép cuộn thân
tab để vẫn truy cập được timeline. Bộ responsive nay mở đủ 5 tab Alumni.

Các mâu thuẫn ảnh vẫn được xử lý theo `UC07-UC08.md`: LH023 là Phạm Thị Ngọc,
Trần Cẩm Tú dùng LH034; thông tin cá nhân/giấy tờ không gán nhầm sang Mai Hồng Ngọc.

## UC08

Giữ danh sách, tìm kiếm, 14 quyền, xác nhận, lưu/hủy/xóa và quyền phiên hiện hành.
Cập nhật theo ảnh mới:

- Ô mã dự kiến chỉ xem, nền xám trong form thêm; giữ mã ND và tài khoản đang có.
- Email/họ tên có placeholder, vai trò bắt đầu bằng “Chọn vai trò người dùng”.
  Phải chọn vai trò trước khi lưu; không tự chọn vai trò quản lý.
- Lỗi tại trường: “Không bỏ trống thông tin”, “Email không hợp lệ”,
  “Vui lòng chọn vai trò”; có `aria-invalid`, viền lỗi. Giữ thông báo thiếu tên/email
  từ Design dù ZIP mới chỉ chụp lỗi tại trường.
- Form có lỗi tăng chiều cao tối đa 916 px tại desktop theo ảnh, vẫn giới hạn
  viewport; phần trường/quyền cuộn và nút Lưu đứng yên trên màn hình nhỏ.
- Biểu tượng tìm kiếm dùng SVG. Không đổi tài khoản/mật khẩu/grant đang lưu theo
  các giá trị minh họa trong ảnh. Các quyền ngoài 14 ô vẫn được giữ như trước.

## UC09 — ánh xạ 8 ảnh

| Ảnh | Thực hiện |
| --- | --- |
| UC09- Màn hình Quản lý báo cáo | Bộ đếm báo cáo đã lưu, lọc kỳ/tên-mã-người lập/loại; bảng giữ đầu cột, cuộn hàng; nút Lập, Xem, Xuất PDF |
| Màn hình Không có dữ liệu lập báo cáo | Trang lập có loại, ngày bắt đầu/kết thúc, Tổng hợp dữ liệu và Chưa có dữ liệu.; chưa tổng hợp hoặc kỳ không có dữ liệu không có nút Lưu |
| UC09.1-Lập báo cáo | 10 mục tự tổng hợp chỉ đọc, nhận xét, tải/xóa ảnh đính kèm, nút Lập báo cáo |
| UC09.1-Lập báo cáo (1) | Xác nhận lưu thông tin báo cáo?; chỉ OK mới POST và ghi lịch sử |
| UC09- thông báo lập báo cáo thành công | Lưu thành công! sau khi API lưu, trở lại danh sách |
| UC09- Màn hình thông báo hủy thao tác lập báo cáo | Đã hủy thao tác!; không tự tạo bản nháp hay upload ảnh lên server |
| UC09.3-Xem báo cáo đã lưu | Nội dung, kỳ, người lập, ngày lập, nhận xét và ảnh đã lưu; Quay lại giữ bộ lọc, có Xem trước PDF theo Design |
| Màn hình Xem trước PDF | Hai khối giấy chứa mục 1–5 và 6–10, bảng số lượng, nhận xét, ảnh và người xem xét; Xuất PDF tải tệp PDF thật |

`frontend/reports.js`/`reports.css` thay form modal chung bằng các trang theo ảnh.
Danh sách chỉ hiển thị báo cáo Đã lưu; báo cáo Bản nháp cũ vẫn giữ trong DB/API.
Bộ đếm và các dòng lấy từ dữ liệu thực, không ép thành 12 báo cáo hay số lượng
sinh viên 30/32 minh họa. Giữ toàn bộ báo cáo và tệp cũ, không chạy seed/migration.

### Dữ liệu tổng hợp

`GET /api/reports/summary?from=…&to=…&type=…` kiểm tra ngày lịch thực, thứ tự và
loại báo cáo. Công thức đầu kỳ + mới vào − tốt nghiệp − rời = cuối kỳ từ ngày tham
gia/kết thúc đã lưu. Lấy KQHT đã duyệt/mục tiêu theo ngày gửi, hỗ trợ theo ngày hỗ
trợ, thay đổi trường/ngành/niên khóa theo revision trong kỳ. Phòng hiển thị rõ là
bố trí tại thời điểm tổng hợp vì chưa có snapshot bố trí phòng cho mọi ngày lịch sử.

Không tự dựng thông tin sức khỏe, sinh hoạt, can thiệp hoặc hoạt động chưa có dữ
liệu. Những mục đó ghi rõ Chưa có thông tin trong kỳ. Không copy các con số/nội
dung minh họa của ảnh thành sự kiện thật. Ngày/kỳ trong tiêu đề lấy từ chính kỳ
đang chọn thay vì ghép tháng 10 với kỳ tháng 11 như ảnh PDF nguồn.

Nếu đổi kỳ khi yêu cầu tổng hợp đang chạy, bỏ qua response của kỳ cũ để không
hiển thị số liệu lệch bộ lọc. Khi lưu từ giao diện, server tự tính lại và lưu `reportData` gồm 10 mục và metrics,
không tin số liệu do client gửi. Báo cáo đã lưu dùng snapshot, không tổng hợp lại
khi mở/xuất nên việc cập nhật sinh viên sau đó không đổi báo cáo cũ. Nhận xét tối
đa 10.000 ký tự, hiển thị dưới dạng văn bản thuần. Nội dung sinh tự động không cho
PATCH ghi đè; API lưu/chỉnh sửa nội dung báo cáo cũ vẫn tương thích.

### Tệp và PDF

- Ảnh lập báo cáo: JPG/PNG, tối đa 2 MB/ảnh (đủ ảnh 1,8 MB trong mẫu), 6 ảnh và
  8 MB tổng. Tên, MIME, kích thước gốc được lưu trong `fileDetails`. API vẫn đọc
  tệp PDF cũ; các loại tệp khác không được nhận. UC04/UC11 giữ giới hạn cũ của chúng.
- Kiểm tra chữ ký và kích thước; nếu tệp sau lỗi, xóa các tệp mới vừa ghi, giữ tệp
  cũ. POST/PATCH báo cáo cũng khôi phục bộ nhớ/lịch sử/tệp mới khi ghi JSON thất bại.
- `GET /api/reports/:id/pdf` kiểm tra `reports.view`, trả application/pdf và tên
  tải xuống BCxxx.pdf. Không gửi bearer token vào URL; frontend tải blob cùng header
  xác thực. Không cần bật popup hoặc thao tác In/Lưu PDF thủ công.
- PDF A4 dùng Roboto nhúng đầy đủ tiếng Việt, nội dung và ảnh gốc của bản lưu.
  Thư viện pdf-lib 1.17.1 và @pdf-lib/fontkit 1.1.1 được ghim, lưu cục bộ cùng thông
  tin license trong `backend/vendor/`; không phụ thuộc npm install trong build
  command hiện tại trên Render. Hai font TTF sinh từ Google Fonts Roboto theo OFL.
- Bản HTML xem trước bố trí hai phần theo ảnh; PDF tự thêm trang nếu nhận xét/tệp
  dài vượt A4, không cắt nội dung để ép hai trang. Báo cáo thông thường kiểm tra ra
  đúng hai trang. Tệp cũ không có reportData vẫn xuất nội dung/nhận xét gốc.

### Vùng cuộn

Desktop giữ sidebar/header; bảng danh sách giữ thống kê, lọc và đầu cột. Form lập
cuộn vùng nội dung/nhận xét/ảnh dưới bộ chọn kỳ. Bản xem trước cuộn các trang giấy,
giữ nút Xuất PDF bên dưới. Laptop/điện thoại thấp (≤700 px) cho danh sách báo cáo
cuộn bên trong khu vực nội dung, bảo đảm bảng có tối thiểu 300 px, tránh bộ lọc và
thống kê ép hàng dữ liệu về 0. Tablet/điện thoại xếp nội dung và giấy theo một cột;
bảng rộng cuộn ngang trong vùng bảng, không tràn ngang toàn trang.

## Kiểm tra

- 52 tests API: bổ sung công thức kỳ báo cáo, ngày/loại/quyền, snapshot chống giả
  số liệu, giữ báo cáo cũ, rollback input/tệp/ghi JSON, tương thích bản nháp, PDF
  thật hai trang và font có glyph tiếng Việt. Dữ liệu test tách riêng.
- `scripts/people_browser_smoke.py`: 60 ảnh UC07/UC08 tại 1920×1080 và 1366×768,
  gồm xem các tab, minh chứng, quyền, hủy, lỗi lưu/thử lại và validation mới.
- `scripts/reports_browser_smoke.py`: 20 ảnh UC09 và 2 PDF tải thật ở cùng hai
  viewport, lọc và vùng cuộn, tổng hợp rỗng/sai kỳ, 10 mục chỉ đọc, ảnh, hủy không
  ghi, lưu lỗi/thử lại, mở bản lưu/PDF và quyền chỉ xem. Đã thêm vào CI.
- Responsive 8 viewport: 320×568, 390×844, 768×1024, 1024×600, 1093×614,
  1366×608, 1920×1080, 2560×1440; mở đủ tab Alumni, form UC08, lập/xác nhận hủy
  báo cáo và PDF. Tất cả dữ liệu/ảnh kết quả trong thư mục artifacts không commit.
- Kiểm tra cục bộ PDF bằng pdftotext/pdftoppm: tiếng Việt chọn/copy được và trang
  không bị mất nội dung. Đây là đối chiếu bố cục/hành vi, không chứng nhận pixel-perfect.

Triển khai giữ nhánh `codex/staging-readiness`, CI trước Render auto deploy.
Không đổi cấu hình môi trường hay tạo dịch vụ Render mới. Cloud chưa thể xác minh
Live nếu proxy còn chặn Render; đối chiếu commit trên Dashboard và Ctrl+F5 khi Live.
