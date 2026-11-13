# Hướng dẫn deploy riêng để test – KHÔNG đưa vào GitHub nhóm

> Để deploy bản demo, cần **một kho Git cá nhân riêng** và workspace Render mà bạn chủ động chọn. Dự án không tự tạo URL công khai chỉ bằng cách giải nén ZIP.

## Bước 1 – Kiểm thử trên localhost

Chạy `run-demo.bat`, mở `http://localhost:3000` và dùng dữ liệu giả.

## Bước 2 – Tạo kho GitHub riêng

1. Trên GitHub cá nhân, New repository → tên gợi ý `lighthouse-private-test`.
2. Chọn **Private**. Không mời nhóm hoặc giảng viên ở giai đoạn thử nghiệm cá nhân.
3. Upload các file trong thư mục dự án nhưng **không upload** `backend/data/lighthouse.json`, `backend/uploads/`, `.env` (đã được .gitignore loại trừ khi push bằng Git).
4. Nếu dùng giao diện Upload files của GitHub, tự kiểm tra không đưa dữ liệu giả đã bị sửa, file riêng tư hoặc mật khẩu nào lên kho.
5. Để Render có thể deploy từ repo Private, kết nối GitHub với Render và cho phép Render đọc repo này.

## Bước 3 – Render Web Service

1. Render → New → Web Service → chọn repo cá nhân.
2. `Root Directory`: `backend`.
3. `Build Command`: `npm install --omit=dev`.
4. `Start Command`: `npm start`.
5. Environment: `NODE_ENV=production`, `DEMO_ONLY=1`.
6. Chỉ chọn free tier hoặc cấu hình đã xem rõ mức phí; không dùng dữ liệu sinh viên thật.
7. Deploy và kiểm tra `https://<service>.onrender.com/api/health`.

**Quan trọng:** Bản JSON demo có thể mất dữ liệu khi Render khởi động lại hoặc cập nhật; URL lúc đó chỉ phục vụ test UI/luồng, **chưa đạt yêu cầu môi trường thật bền vững**. Muốn production phải nối DB quản lý (SQL Server/Azure SQL) và lưu file riêng tư trên object storage.

## Bước 4 – Test bug với link online

- Đăng nhập các vai trò theo README và làm theo `TEST_CASES.md`.
- Không nhập dữ liệu cá nhân của sinh viên thật.
- Báo lỗi theo mẫu `BUG-001` kèm ảnh/video, thời gian và trình duyệt.

## Lộ trình để đạt yêu cầu nộp chính thức

SQL Server thật → xử lý API đầy đủ và giao diện đúng Frame → file storage an toàn → email OTP → lưu lịch sử phiên bản → xuất PDF từ Backend → kiểm thử NFR/bảo mật → deploy có sao lưu → kiểm thử hệ thống và nghiệm thu.
