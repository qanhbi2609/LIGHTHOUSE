# UC05/UC06 — ZIP cập nhật ngày 14/11/2026

Nguồn ưu tiên: `màn hình update.zip` gửi sau đợt UC03/UC04. Có 27 PNG:
13 màn hình UC05 + 2 ảnh banner 400×50, và 12 màn hình UC06. Các màn hình đầy đủ
là 1920×1080. Đối chiếu thêm Design PDF trang 77–88 và bảng thông báo hiện có.

## Ánh xạ màn hình và hành vi

| Ảnh trong ZIP | Hành vi và bằng chứng browser trong `artifacts/uc05-06/` |
| --- | --- |
| UC05 — Quản lý phòng ở | `15-rooms`: thẻ hai cột, thống kê số người thực tế, đủ nút theo quyền |
| UC05.1 — Tra cứu… có dư liệu / không có dữ liệu | `16-room-search`, `17-room-empty`: tìm tên/mã, có phòng/chưa bố trí/không tìm thấy |
| UC05.2 — Xem thông tin phòng | `18-room-detail`: nút × góc phải, thông tin phòng và danh sách, đóng không ghi |
| UC05.3 — Sửa bố trí phòng | `19-room-edit`: chọn/bỏ chọn, tìm kiếm giữ lựa chọn, Bỏ chọn tất cả, danh sách cuộn riêng |
| UC05.3 — …thành công / …đã đầy; Frame 11 | `20-room-saved`, `21-room-full`: Cập nhật thành công! / Phòng đầy! |
| UC05.4 — Tạo phòng mới | `24-room-new`: mã phòng, sức chứa 6 chỉ xem, chọn sinh viên và Lưu |
| UC05.4 — …không hợp lệ; Frame 12 | `22-room-invalid`: Thông tin không hợp lệ!; lỗi dưới tên phòng, giữ form |
| UC05.4 — …thành công | `23-room-created`: Tạo mới thành công! sau khi API lưu |
| UC05.5 — Xoá phòng / …Xoá phòng / …hủy thao tác | `27-room-delete-confirm`, `25-room-deleted`, `26-room-delete-cancel`: xác nhận, thông báo, hủy không ghi |
| UC06.1 — danh sách mục tiêu | `02-goal-list`: bộ đếm, tab, ngày/tên/mã/trạng thái; dữ liệu cuộn dưới đầu cột |
| UC06.1 — Đánh giá mục tiêu / xác nhận… | `05-goal-detail`, `06-goal-confirm`: đúng sinh viên/bản ghi, radio Đạt/Chưa đạt và xác nhận Lưu |
| UC06.1 — …thành công / …hủy bỏ đánh giá | `04-goal-saved`, `03-goal-cancel`: lưu thực hoặc giữ dữ liệu cũ khi hủy |
| UC06.2 — danh sách kết quả học tập | `07-grade-list`: cùng danh tính sinh viên với UC04/05, bộ lọc riêng |
| UC06.2 — Xét duyệt… / Xét duyệt… (1) | `13-grade-detail`, `12-grade-confirm`: minh chứng, nội dung yêu cầu, gửi lại/xác nhận hợp lệ |
| UC06.2 — Xem minh chứng… | `11-grade-proof`: mở vùng ảnh tham chiếu; tệp người dùng tải hiển thị tệp gốc |
| UC06.2 — …thành công / …thành công (1) / …yêu cầu gửi lại | `09-grade-approved`, `08-grade-cancel`, `10-grade-returned`: thông báo theo nội dung ảnh; ảnh tên “thành công (1)” thực tế là Đã hủy thao tác! |

Phần lớn các luồng và thông báo đã có từ đợt trước, tiếp tục dùng API thật.
Đợt này đổi nút đóng chi tiết phòng từ footer sang × góc phải theo ảnh mới;
căn lại cột, vị trí hộp thoại và biểu tượng tìm kiếm, bo mép đầu bảng mục tiêu.
Thẻ phòng có chiều cao tối thiểu 224 px desktop / 180 px laptop, tự tăng khi cần
để đọc đầy đủ tên cư dân, không cắt dòng hay chồng lên nút.

## Cuộn và responsive

- Giữ sidebar 185 px có đủ chữ theo quyết định người dùng, thay kích thước 260 px
  trong ảnh nguồn. Roboto cho nội dung, Ribeye cho LIGHTHOUSE.
- Desktop: giữ header, tìm kiếm phòng, thống kê, tab, bộ lọc và đầu cột; chỉ lưới
  phòng hoặc hàng dữ liệu cuộn khi dài. Tạo/sửa phòng cuộn danh sách checkbox;
  tiêu đề, tìm kiếm và nút Lưu cố định. Chi tiết phòng cuộn bảng cư dân, nút × cố định.
- Đánh giá mục tiêu / KQHT cuộn phần nội dung; tiêu đề và footer thao tác cố định.
- Điện thoại thấp (rộng ≤760, cao ≤700 px): UC06 cuộn vùng nội dung gồm thống kê
  và panel, dành 260 px cho bảng có hàng dữ liệu. Tránh bộ lọc ép bảng về 0 px.
  Giữ header/sidebar ngoài vùng cuộn. Bảng vẫn cuộn ngang trong panel khi cần.
- Bộ responsive bổ sung thao tác mở/sử dụng chi tiết phòng, sửa phòng, đánh giá mục
  tiêu, xét duyệt KQHT và xem minh chứng tại đủ 8 viewport, không chỉ chụp trang danh sách.

## Dữ liệu và kiểm tra trước khi ghi

Không reset, không thêm migration hoặc sửa bộ dữ liệu đang có trong đợt này.
Giữ những khác biệt nguồn đã ghi ở `UC05-UC06.md`: phòng tối đa 6 người,
số chỗ trống tính thực tế, mỗi mã sinh viên có cùng tên/hồ sơ, ngày 30/06 hợp lệ,
giai đoạn sáu tháng tới 31/12/2026. Không sao chép nhãn Đã đầy khi mới 3/6 hoặc
Còn chỗ khi 0/6; dùng trạng thái tính từ dữ liệu.

- PUT sửa phòng bắt buộc `studentIds` là mảng. Thiếu/sai định dạng không còn bị hiểu
  là bỏ hết sinh viên. Chỉ mảng rỗng tường minh mới xóa bố trí; kiểm tra sinh viên,
  Alumni và sức chứa trước mọi thay đổi, giữ nguyên dữ liệu khi lỗi/quyền bị từ chối.
- KQHT mới/gửi lại lưu `evidenceName` của tệp gốc; giữ tên/URL cũ nếu không thay tệp.
  UC06 dùng tên đã lưu, không giả định mọi tệp đều tên `bang_diem_hoc_ky_2.pdf`.
  Thay minh chứng bỏ tọa độ crop tham chiếu cũ; lỗi minh chứng/đầu vào không đổi
  bản ghi trong bộ nhớ, tệp JSON, lịch sử hoặc uploads.
- Dữ liệu tên trong UC05 và UC06 đọc cùng hồ sơ, có kiểm tra đổi tên tại UC04 rồi
  đọc lại các API liên quan. Giữ quyền riêng tạo/sửa/xóa phòng và đánh giá/xét duyệt.
- Lỗi API giữ nội dung form/lựa chọn để thử lại; thông báo thành công chỉ sau khi lưu.

## Kiểm tra

46 kiểm thử API đạt, gồm ca sửa phòng sai không mất bố trí, tên minh chứng và gửi
lại nguyên tử, danh tính liên UC. Bộ management có 58 ảnh tại 1920×1080 và
1366×768, thêm mô phỏng lỗi lưu phòng/đánh giá/gửi yêu cầu rồi thử lại. Bộ responsive
kiểm tra 320×568, 390×844, 768×1024, 1024×600, 1093×614, 1366×608,
1920×1080, 2560×1440. Các bài kiểm tra dùng DB/uploads tạm, ảnh phát sinh không commit.

```bash
LIGHTHOUSE_UPLOADS_DIR=/tmp/lighthouse-uc56-api npm test --prefix backend
CHROMIUM_PATH=/usr/bin/chromium python scripts/management_browser_smoke.py
CHROMIUM_PATH=/usr/bin/chromium python scripts/responsive_browser_smoke.py
```

Nhánh triển khai giữ `codex/staging-readiness`; Render theo cấu hình nhóm auto
deploy sau CI. Nếu proxy Cloud tiếp tục chặn Render thì không coi CI thành công
là xác nhận Render Live; đối chiếu commit thực tế trên Dashboard trước khi test web.
