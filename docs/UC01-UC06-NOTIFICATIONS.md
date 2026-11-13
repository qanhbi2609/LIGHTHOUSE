# Rà soát thông báo UC01–UC06 theo Design

Đối chiếu ngày 13/11/2026: `50K141.02.3007.Design-đã nén.pdf`, phần 6.1.2,
trang PDF 44–88; đọc cả banner trong hình minh họa và sự kiện trong bảng đặc tả.
Dùng SRS để làm rõ trường hợp lỗi/hủy khi bảng Design chỉ dẫn tới hình thông báo.
Thông báo dưới đây gắn với hành vi thực, không chỉ thêm màn hình minh họa.

| UC / tình huống | Thông báo / kết quả | Kiểm tra |
| --- | --- | --- |
| UC01 đăng nhập sai | Email hoặc mật khẩu sai! | API + browser |
| UC01 email khôi phục không tồn tại | Kiểm tra lại địa chỉ Email; giữ màn hình nhập email | API + browser, bổ sung từ Design trang 46 |
| UC01 OTP sai / hết hạn | Mã xác thực không hợp lệ / Mã xác thực hết hạn! | API + browser |
| UC01 gửi lại quá sớm | Khóa nút theo đếm ngược, API báo Vui lòng chờ trước khi gửi lại mã | API + browser |
| UC01 mật khẩu yếu / xác nhận khác | Mật khẩu không hợp lệ! / Mật khẩu không trùng khớp! tại trường | API + browser |
| UC01 đổi mật khẩu xong | Đổi mật khẩu thành công!; quay lại đăng nhập | API + browser |
| UC02 thông tin thiếu/sai | Vui lòng cung cấp đầy đủ và chính xác tất cả các thông tin!; đánh dấu trường sai | Browser; bổ sung banner theo Design trang 54 |
| UC02 minh chứng thiếu/sai/quá lớn/quá nhiều | Lỗi tại nhóm tệp, giới hạn 1,5 MB/tệp và 6 tệp; không chuyển thành công | API + browser |
| UC02 không lưu được | Hiện lỗi API, giữ dữ liệu đã nhập | Browser mô phỏng response lỗi; lưu thành công dùng API thật |
| UC02 đã nộp | ĐĂNG KÝ THÀNH CÔNG! và hướng dẫn theo dõi email | API + browser |
| UC03 lưu đạt yêu cầu | Đã lưu thành công! | API + browser |
| UC03 chờ bổ sung | Gửi yêu cầu thành công!; thiếu ghi chú báo Vui lòng nhập thông tin cần bổ sung. | API + browser |
| UC03 từ chối | Xác nhận từ chối và xóa hồ sơ khỏi danh sách tiếp nhận? → Đã xóa khỏi danh sách! | API + browser |
| UC03 hủy | Đã hủy thao tác!; không ghi dữ liệu | Browser kiểm tra JSON trước/sau |
| UC03 tiếp nhận khi chưa đạt | Hồ sơ chưa đủ điều kiện tiếp nhận! | UI + API; không tạo hồ sơ |
| UC03 tiếp nhận hợp lệ | Xác nhận tiếp nhận và tạo hồ sơ sinh viên chính thức? → Đã tạo hồ sơ sinh viên thành công! | API + browser |
| UC04 tra cứu không có kết quả | Chưa có dữ liệu. | Browser |
| UC04 dữ liệu sửa sai | Dữ liệu không hợp lệ! tại trường; không mở xác nhận/lưu | API + browser |
| UC04 lưu/hủy | Xác nhận lưu thông tin? → Lưu hồ sơ thành công! / Đã hủy thao tác! | API + browser; giữ bản cũ khi lưu |
| UC04 hình ảnh sai định dạng | Định dạng không phù hợp! | API + browser; PDF không được dùng làm ảnh |
| UC04 ảnh quá lớn/rỗng | Dung lượng tệp không hợp lệ! | UI + API kiểm tra kích thước |
| UC04 timeline tháng sai | Khoảng thời gian không hợp lệ! | Browser; bổ sung bộ lọc tháng và danh mục ảnh theo Design |
| UC05 tìm sinh viên không có | Không tìm thấy thông tin. và vùng kết quả Chưa có dữ liệu. | Browser |
| UC05 sinh viên chưa có phòng | Chưa được bố trí phòng ở | Browser |
| UC05 đủ sáu người | Phòng đầy! khi cố thêm; vẫn cho bỏ chọn | API + browser |
| UC05 sửa phòng xong | Cập nhật thành công! | API + browser |
| UC05 tạo phòng thiếu/sai/trùng | Thông tin không hợp lệ! và lỗi ngay dưới tên phòng | API + browser; không ghi dở dang |
| UC05 tạo phòng xong | Tạo mới thành công! | API + browser |
| UC05 xóa phòng | Xác nhận xoá phòng? kèm số liệu → Xoá phòng thành công! | API + browser |
| UC05 hủy xóa/đóng sửa | Đã hủy thao tác!; không ghi | Browser kiểm tra JSON trước/sau |
| UC06 lưu đánh giá | Xác nhận lưu đánh giá? → Cập nhật thành công! | API + browser |
| UC06 hủy đánh giá | Đã hủy thao tác!; giữ đánh giá cũ | Browser kiểm tra JSON trước/sau |
| UC06 xác nhận KQHT | Xác nhận lưu thông tin kết quả học tập? → Cập nhật thành công! | API + browser |
| UC06 yêu cầu gửi lại | Gửi yêu cầu thành công!; thiếu nội dung báo lỗi tại ô nhập | API + browser |
| UC06 hủy xác nhận KQHT | Đã hủy thao tác!; giữ nguyên dữ liệu | Browser kiểm tra JSON trước/sau |
| UC06 lọc khoảng ngày sai/rỗng | Khoảng thời gian không hợp lệ! / Chưa có dữ liệu. | Browser |

UC01–UC06 giữ Roboto, ngoại trừ chữ LIGHTHOUSE dùng Ribeye. Các lỗi API vẫn hiển
thị nếu lưu thất bại; thông báo thành công chỉ xuất hiện sau response lưu thành công.
Các thao tác quản lý kiểm tra quyền ở cả UI và API.

Phạm vi rà soát là màn hình, thông báo và luồng demo. Email thực cho OTP, tiếp nhận,
link bổ sung hồ sơ vẫn chưa kết nối; không coi banner thành công là bằng chứng đã
gửi email. SQL Server, storage riêng tư/bền vững và phiên qua restart chưa thuộc bản này.
