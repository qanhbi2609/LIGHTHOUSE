# LIGHTHOUSE — kiểm kê và điều kiện nghiệm thu

Ngày kiểm tra: 13/11/2026. Nhánh làm việc: `codex/staging-readiness`.

Nguồn: phần văn bản SRS `50K141.02.3007.docx` đã đọc; SDD
`50K141.02.3007.Design-đã nén.pdf` (106 trang) đã trích xuất và đối chiếu
các mục kiến trúc, dữ liệu và màn hình. Đây chưa phải đối chiếu toàn bộ ảnh trong tài liệu.
Figma chưa truy cập được do proxy trả 403. Số 66 Frame Quản lý và 8 Frame Sinh viên
trong `FIGMA_AUDIT.md` là ghi chép có sẵn, chưa được xác minh lại trong lần này.

## Cập nhật UC07/UC08 — 14/11/2026

Đã tiếp tục từ `f9a6b86`, đối chiếu 26 PNG trong ZIP và Design PDF trang 89–98,
bao gồm banner thiếu tên/email trong ảnh nhỏ của trang 96. Chi tiết và các khác biệt
nguồn tại [UC07-UC08.md](UC07-UC08.md).

- 39/39 tests API đạt; bổ sung 5 kiểm tra UC07/UC08 về dữ liệu, quyền, lưu nguyên tử
  và nâng cấp giữ chỉnh sửa.
- Bộ browser UC07/UC08 tạo 60 ảnh ở 1920×1080 và 1366×768; kiểm tra các tab,
  minh chứng, gallery, thông báo, lưu/hủy/lỗi, quyền chỉ xem, căn cột và scrollbar.
- Đã chạy lại bảy bộ browser: tổng quát, UC01, UC02, UC03/04, dữ liệu Figma,
  UC05/06 và UC07/08. Test dùng dữ liệu tạm riêng.
- Giữ 6 người/phòng, Roboto/Ribeye cục bộ và sidebar đủ menu không cuộn.
- Dữ liệu nâng cấp một lần có backup, giữ hồ sơ/room/grant đã chỉnh sửa; dùng mã
  riêng cho Trần Cẩm Tú thay cho mã LH023 bị trùng trong ảnh.
- Chưa có xác nhận pixel-perfect/Figma trực tiếp; hệ thống vẫn là demo JSON,
  không thay thế các điều kiện Final bên dưới.

## Kết quả đã chạy

- 34/34 tests đạt, không skip: 13 integration tests API, 5 kiểm tra UC01, 3 kiểm tra UC02, 3 kiểm tra UC03/UC04, 3 kiểm tra dữ liệu theo ảnh, 5 kiểm tra UC04–UC06 và 2 kiểm tra chuyển đổi sức chứa.
- Browser smoke đạt ở 1920×1080 và 1366×768: đăng nhập sai/đúng, các trang quản lý,
  đăng xuất, menu sinh viên, mục tiêu/kết quả học tập và tải lại trang.
- 24 ảnh chụp trong `artifacts/browser/`, kèm `results.json`. Chỉ là ảnh hiện trạng;
  chưa có ảnh chuẩn Figma và chưa chạy pixel diff.
- Sửa lỗi sinh viên tải lại trang bị chuyển vào tiếp nhận hồ sơ không được phép.
- Sửa CSS kế thừa `width:19px` làm chữ menu xuống thành cột. Sidebar hiển thị đủ menu
  và footer không cần cuộn ở cả hai viewport. UC03/UC04 có vùng cuộn dữ liệu riêng,
  đầu bảng và tiêu đề đứng yên; xem `UC03-UC04.md`.
- Đã đối chiếu 28 ảnh UC03/UC04 trong ZIP người dùng; bộ browser bổ sung tạo 56 ảnh
  và kiểm tra luồng xử lý, xem minh chứng, sửa/xác nhận/hủy và kích thước hai bên.
- Bản demo có dữ liệu nhìn thấy theo ảnh UC03/UC04 và thêm các dòng mẫu ngoài ảnh
  để kiểm tra scrollbar. Bộ browser dữ liệu riêng kiểm tra bộ đếm, nội dung các tab,
  ảnh minh chứng tham chiếu, scrollbar bắt đầu dưới đầu cột và căn cột khi có thanh cuộn.
- Đã chỉnh 25 trạng thái UC05/UC06, tạo 52 ảnh kiểm tra tại hai viewport; xem
  `UC05-UC06.md`. Đã rà lại thông báo UC01–UC06 theo phần đặc tả màn hình Design,
  gồm banner nằm trong hình nhỏ; bảng đối chiếu tại `UC01-UC06-NOTIFICATIONS.md`.
- Phòng có sức chứa cố định 6: UI khóa lựa chọn tiếp khi đủ 6, API từ chối người thứ 7;
  kiểm thử xác nhận chuyển đổi dữ liệu cũ không mất hồ sơ và có thể chạy lại.
- Đã thêm workflow CI; chưa có bằng chứng GitHub Actions chạy thành công trên remote.

## Ánh xạ yêu cầu và khoảng trống

Tất cả các dòng dưới đây còn cần đối chiếu Frame, trạng thái và thông báo chính xác.
"Có demo" không đồng nghĩa đạt Main/Alternative/Exception flow và BR đầy đủ.

| UC / màn hình | Hiện trạng | Phần còn thiếu hoặc cần xác minh |
| --- | --- | --- |
| UC01 đăng nhập | Đã kiểm tra ghi nhớ phiên trên thiết bị, đăng nhập/đăng xuất và lỗi theo Design | Phiên qua restart còn thiếu; kiểm tra độ khớp Frame đầy đủ |
| UC01 quên mật khẩu, nhập mã, gửi lại, tạo mật khẩu, lỗi/thành công | Đã tách các màn hình, mã 4 số và validation theo ảnh; xem `UC01.md` | Email thật và đối chiếu pixel còn thiếu; ảnh nền/logo gốc đã bổ sung từ Downloads.zip |
| UC02 đăng ký, tỉnh/thành, lỗi/thành công | Đã chỉnh hai màn hình theo `uc02.zip`, có hai nhóm minh chứng và validation từng trường; xem `UC02.md` | Còn nghiệm thu đặc tả đầy đủ và môi trường lưu bền vững |
| UC03.1 kiểm tra, đạt/chờ bổ sung/từ chối | Đã chỉnh theo ảnh, ghi chú bổ sung bắt buộc, xác nhận/hủy được kiểm tra | Email thông báo, link form bổ sung có hạn và cập nhật lại hồ sơ |
| UC03.2 tiếp nhận, xác nhận/hủy | API kiểm tra điều kiện và tạo tài khoản | Gửi email; giao dịch SQL chống tiếp nhận trùng; chốt chính sách mật khẩu ban đầu |
| UC04.1 tra cứu / rỗng | Đã chỉnh theo ảnh và kiểm tra tìm/rỗng, cuộn dữ liệu riêng | Nghiệm thu đầy đủ tiêu chí theo SRS |
| UC04.2 chi tiết / tab / xem minh chứng | Đã chỉnh các tab và hộp thoại theo ảnh, xem giấy tờ gốc từ UC02 | Quyền tải tệp riêng tư và nghiệm thu dữ liệu đầy đủ |
| UC04.3 sửa / xác nhận / hủy / lỗi | Validation tại trường/API, kiểm thử hủy, lưu bản cũ và audit trong JSON | Lưu bản cũ và audit trên SQL bền vững |
| UC04.4 thêm ảnh / lỗi định dạng | Timeline tháng/năm, lọc khoảng tháng, upload/xóa và lỗi định dạng đã kiểm tra UI/API | Kho file riêng tư và bền vững |
| UC05.1 tra cứu theo sinh viên / chưa có phòng / không tìm thấy | Đã chỉnh ba trạng thái và thông báo theo Design/SRS | Nghiệm thu dữ liệu thực |
| UC05.2 chi tiết phòng | Đã chỉnh theo ảnh; số người/chỗ còn lại/trạng thái lấy từ dữ liệu | Nghiệm thu dữ liệu thực |
| UC05.3 sửa bố trí / phòng đầy / chuyển phòng / bỏ chọn | UI/API kiểm tra 6 người, chuyển phòng, bỏ chọn, vùng cuộn riêng | SQL transaction và kiểm thử đồng thời |
| UC05.4 tạo / trùng tên / sức chứa sai | Chọn sinh viên ngay lúc tạo, lỗi dưới trường, API kiểm tra trước khi ghi | Lưu trữ SQL bền vững |
| UC05.5 xóa / xác nhận / hủy | Dialog theo ảnh; hủy không ghi, xóa trả sinh viên về chưa bố trí | Audit SQL |
| UC06.1 đánh giá mục tiêu / xác nhận / hủy | Radio, giai đoạn sáu tháng, bộ lọc và xác nhận/hủy đã kiểm tra | Nghiệm thu đặc tả đầy đủ và SQL |
| UC06.2 duyệt kết quả / yêu cầu gửi lại / xác nhận / hủy | Hai nút riêng, xem minh chứng, ghi chú bắt buộc khi yêu cầu gửi lại; chỉ kết quả hợp lệ vào lịch sử UC04 | Email thật, storage minh chứng riêng tư |
| UC07.1 xem alumni / tab | Đã đối chiếu ZIP, dùng hồ sơ chung UC04 và quyền đọc Alumni riêng | Giấy tờ gốc chưa có asset; SQL/storage bền vững |
| UC07.2 tra cứu alumni / rỗng | Đã chỉnh cột, tìm tên/mã/email, thông báo và empty state | Nghiệm thu dữ liệu thực |
| UC08.1 thêm / xác nhận / hủy | Đã chỉnh theo 14 quyền Design, xác nhận và validation | Email kích hoạt thực, SQL |
| UC08.2 sửa / xác nhận / hủy | Grant UI/API dùng chung, hiệu lực ngay trên phiên hiện hành, audit JSON | Audit SQL |
| UC08.3 xóa quyền / xác nhận / hủy | Thu hồi quyền/phiên, vô hiệu hóa, ẩn danh sách, giữ lịch sử; có xác nhận/hủy | Audit SQL |
| UC09.1 lập / xem trước / lưu / nháp / không dữ liệu | Có demo tổng hợp và nháp | Đủ các mục SRS: sức khỏe, sinh hoạt, hỗ trợ, thách thức, hoạt động, nhận xét; bộ lọc UI |
| UC09.2 xuất PDF / in | Browser Print | PDF tạo tự động đúng mẫu, ảnh, chữ ký và dữ liệu đã lưu |
| UC09.3 xem báo cáo / lỗi truy xuất | Có demo | Không thay đổi nội dung khi xem; quyền theo vai trò; đối chiếu mẫu |
| UC10 lịch sử / lọc ngày / khoảng sai / rỗng | Có API demo | Test đủ lỗi và bộ lọc; audit bất biến và dữ liệu được truy cập theo NFR-09 |
| UC11.1 gửi kết quả / tệp sai / thiếu thông tin / gửi lại | Có API demo | Danh sách môn nợ/học lại, cảnh báo, chi tiết chứng chỉ và form theo SRS |
| UC11.2 gửi mục tiêu / thiếu thông tin / gửi lại | Có demo hai trường | Các nhóm học tập, kỹ năng, đời sống/sức khỏe, nghề nghiệp và nhu cầu hỗ trợ |

## Các điểm tài liệu cần chốt

1. **Đã chốt theo người dùng: sức chứa mỗi phòng là 6 sinh viên.** Quyết định này
   thay thế giới hạn 4 trong SRS UC05.3. Còn chỗ = 6 − số sinh viên đang ở; đủ 6 là đầy.
   Backend từ chối giá trị sức chứa khác 6 và phân bổ quá 6 người. Database JSON cũ
   được chuyển về 6 khi khởi động, có bản sao lưu `.before-room-capacity-6.bak`;
   nếu phòng đã ở quá 6 thì dừng chuyển đổi, không bỏ sinh viên khỏi phòng.
2. SRS UC03.2 BR03 ghi mật khẩu 4 số ngày sinh; SDD reset mật khẩu yêu cầu ít nhất
   8 ký tự, hoa/thường/số/ký tự đặc biệt. Cần thống nhất chính sách tài khoản mới.
   Không lưu hoặc gửi lại mật khẩu người dùng hiện hành; ưu tiên link kích hoạt có hạn.
3. SRS UC01 diễn đạt "lưu mật khẩu" khi ghi nhớ đăng nhập. Cần diễn giải bằng phiên
   đăng nhập an toàn, không lưu mật khẩu rõ vào trình duyệt.
4. SDD UC03 nút Tiếp nhận mô tả mở "Xác nhận từ chối", trong khi SRS và màn hình
   UC03.2 yêu cầu xác nhận tiếp nhận. Giữ hành vi tiếp nhận như SRS cho đến khi chốt.
5. Một tiêu đề SDD "Xác nhận mật khẩu hợp lệ" lại mô tả "Mật khẩu không trùng khớp";
   phải ánh xạ theo trạng thái thực và Frame, không theo riêng tiêu đề.

## Điều kiện Final còn chưa đạt

- SQL Server thực, migrations và transaction; schema có sẵn chưa được runtime sử dụng.
- Database Staging/Production riêng, file storage riêng tư, email thật, phiên đăng nhập bền vững.
- NFR-01/02: tải 10 người đồng thời, phản hồi dưới 5 giây chưa đo bằng load test.
- NFR-03/04/05: mobile, hoạt động 24/7 và thông báo bảo trì chưa nghiệm thu.
- NFR-06–10: kiểm thử phân quyền, bảo mật tệp, truy cập, audit và hết hạn phiên đầy đủ.
- NFR-11–14: lưu tập trung, giữ bản cũ, giữ alumni, sao lưu mỗi 5–10 phút và phục hồi.
- NFR-15–17: usability, đăng nhập lại, tiếng Việt/Anh đầy đủ.
- Đã có URL demo Render do người dùng cung cấp; chưa kiểm tra redeploy không mất dữ liệu hoặc diễn tập rollback.
- Chưa kiểm kê từng node Figma; đã nhận asset gốc UC01 và đối chiếu ảnh người dùng
  cung cấp cho UC01–UC04, các UC còn lại chưa được đối chiếu lại từng trạng thái.

Không nghiệm thu Final hoặc đưa dữ liệu sinh viên thật lên bản demo này.
