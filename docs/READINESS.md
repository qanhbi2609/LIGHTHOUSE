# LIGHTHOUSE — kiểm kê và điều kiện nghiệm thu

Ngày kiểm tra: 13/11/2026. Nhánh làm việc: `codex/staging-readiness`.

Nguồn: phần văn bản SRS `50K141.02.3007.docx` đã đọc; SDD
`50K141.02.3007.Design-đã nén.pdf` (106 trang) đã trích xuất và đối chiếu
các mục kiến trúc, dữ liệu và màn hình. Đây chưa phải đối chiếu toàn bộ ảnh trong tài liệu.
Figma chưa truy cập được do proxy trả 403. Số 66 Frame Quản lý và 8 Frame Sinh viên
trong `FIGMA_AUDIT.md` là ghi chép có sẵn, chưa được xác minh lại trong lần này.

## Kết quả đã chạy

- 19/19 tests đạt, không skip: 13 integration tests API, 4 kiểm tra UC01 và 2 kiểm tra chuyển đổi sức chứa.
- Browser smoke đạt ở 1920×1080 và 1366×768: đăng nhập sai/đúng, các trang quản lý,
  đăng xuất, menu sinh viên, mục tiêu/kết quả học tập và tải lại trang.
- 24 ảnh chụp trong `artifacts/browser/`, kèm `results.json`. Chỉ là ảnh hiện trạng;
  chưa có ảnh chuẩn Figma và chưa chạy pixel diff.
- Sửa lỗi sinh viên tải lại trang bị chuyển vào tiếp nhận hồ sơ không được phép.
- Sửa CSS kế thừa `width:19px` làm chữ menu xuống thành cột; cho menu cuộn riêng,
  đặt footer trong luồng bố cục để không đè lên menu. Browser kiểm tra độ rộng nhãn
  và vùng menu không giao với footer ở cả hai viewport.
- Phòng có sức chứa cố định 6: UI khóa lựa chọn tiếp khi đủ 6, API từ chối người thứ 7;
  kiểm thử xác nhận chuyển đổi dữ liệu cũ không mất hồ sơ và có thể chạy lại.
- Đã thêm workflow CI; chưa có bằng chứng GitHub Actions chạy thành công trên remote.

## Ánh xạ yêu cầu và khoảng trống

Tất cả các dòng dưới đây còn cần đối chiếu Frame, trạng thái và thông báo chính xác.
"Có demo" không đồng nghĩa đạt Main/Alternative/Exception flow và BR đầy đủ.

| UC / màn hình | Hiện trạng | Phần còn thiếu hoặc cần xác minh |
| --- | --- | --- |
| UC01 đăng nhập | Có demo, API và browser smoke | Ghi nhớ đăng nhập thực; phiên bền vững; asset gốc và nút hiện mật khẩu |
| UC01 quên mật khẩu, nhập mã, gửi lại, tạo mật khẩu, lỗi/thành công | Đã tách các màn hình, mã 4 số và validation theo ảnh; xem `UC01.md` | Email thật, asset ảnh nền/logo và đối chiếu pixel còn thiếu |
| UC02 đăng ký, tỉnh/thành, lỗi/thành công | Có demo form và upload | Các nhóm minh chứng, dropdown quê quán và nội dung hướng dẫn đúng SDD; validation từng trường |
| UC03.1 kiểm tra, đạt/chờ bổ sung/từ chối | Có demo đổi trạng thái | Email thông báo, link form bổ sung có hạn và cập nhật lại hồ sơ; dialog đúng Frame |
| UC03.2 tiếp nhận, xác nhận/hủy | API kiểm tra điều kiện và tạo tài khoản | Gửi email; giao dịch SQL chống tiếp nhận trùng; chốt chính sách mật khẩu ban đầu |
| UC04.1 tra cứu / rỗng | Có tìm từ khóa demo | Đầy đủ tiêu chí, trạng thái và empty state đúng đặc tả |
| UC04.2 chi tiết / tab / xem minh chứng | Có tab demo | Quyền tải tệp riêng tư; bằng chứng hiển thị đủ dữ liệu và đúng Frame |
| UC04.3 sửa / xác nhận / hủy / lỗi | Có demo sửa và audit | Lưu bản cũ theo NFR-12; validation tại trường; kiểm thử hủy không ghi dữ liệu |
| UC04.4 thêm ảnh / lỗi định dạng | Có local upload | Kho file riêng tư và timeline tháng/năm đúng SDD |
| UC05.1 tra cứu theo sinh viên / chưa có phòng / không tìm thấy | Có demo | Đối chiếu ba trạng thái và văn bản thông báo |
| UC05.2 chi tiết phòng | Có demo | Số người, sức chứa, còn chỗ và trạng thái phải nhất quán |
| UC05.3 sửa bố trí / phòng đầy / chuyển phòng / bỏ chọn | API có demo và tests | Đã chốt 6 sinh viên/phòng; còn SQL transaction và kiểm thử đồng thời |
| UC05.4 tạo / trùng tên / sức chứa sai | API có demo và tests | Chọn sinh viên ngay lúc tạo, lỗi dưới từng trường theo SDD |
| UC05.5 xóa / xác nhận / hủy | Có demo, API trả sinh viên về chưa bố trí | Dialog và bằng chứng hủy, audit SQL |
| UC06.1 đánh giá mục tiêu / xác nhận / hủy | Có demo | Radio Đạt/Chưa đạt, giai đoạn 6 tháng, lọc ngày/trạng thái đúng SDD |
| UC06.2 duyệt kết quả / yêu cầu gửi lại / xác nhận / hủy | Có demo và API tests | Hai nút thao tác riêng theo SDD, minh chứng bảo vệ quyền |
| UC07.1 xem alumni / tab | Có demo | Đủ dữ liệu lịch sử và giấy tờ từ hồ sơ gốc |
| UC07.2 tra cứu alumni / rỗng | Có demo | Cột, nút Tìm và empty state đúng Frame |
| UC08.1 thêm / xác nhận / hủy | Có demo | Màn hình xác nhận riêng, danh mục quyền thống nhất với SDD |
| UC08.2 sửa / xác nhận / hủy | Có demo | Ma trận quyền, thu hồi quyền phiên hiện hành và audit SQL |
| UC08.3 xóa quyền / xác nhận / hủy | Demo vô hiệu hóa tài khoản | Xác nhận với đặc tả về xóa quyền so với xóa/vô hiệu hóa tài khoản |
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
- Chưa có URL public, DNS/SSL, kiểm tra redeploy không mất dữ liệu hoặc diễn tập rollback.
- Chưa kiểm kê từng node Figma, chưa lấy asset gốc hay đối chiếu ảnh từng trạng thái.

Không nghiệm thu Final hoặc đưa dữ liệu sinh viên thật lên bản demo này.
