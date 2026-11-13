# Hướng dẫn triển khai bản TEST trên Render (không đụng GitHub nhóm)

Bản chạy này **là demo với dữ liệu giả**, không phải hệ thống production theo đầy đủ SRS/SDD.

## 1. Giữ nguyên repo của nhóm

1. Giải nén `LIGHTHOUSE-UC01-UC11-LOCAL-TEST.zip`.
2. Tạo một **Repository Private riêng** trên GitHub cá nhân, ví dụ `lighthouse-personal-uc-test`.
3. Chỉ đưa source từ thư mục `LIGHTHOUSE-FULL-TEST` vào repo riêng. **Không** upload file `backend/data/lighthouse.json`, `backend/uploads/`, `.env`, dữ liệu hoặc giấy tờ sinh viên thật.
4. Kiểm tra `.gitignore` đã tồn tại trước khi push.

## 2. Render

1. Mở [Render Dashboard](https://dashboard.render.com/).
2. Chọn **New → Web Service**, liên kết GitHub, chọn repo thử nghiệm riêng.
3. Thiết lập: `Runtime=Node`, `Root Directory=backend`, `Build Command=npm install --omit=dev`, `Start Command=npm start`.
4. Cho Render tự cấp biến `PORT`; không cần khai báo cổng cố định. Có thể đặt `NODE_ENV=production`.
5. Deploy; mở URL `https://<tên-service>.onrender.com` của bạn và kiểm tra `/api/health`.
6. Đăng nhập bằng tài khoản demo và thử UC theo file `BUG_TEST_CHECKLIST.md`.

**Lưu ý đặc biệt:** Bản này lưu dữ liệu bằng JSON và file ảnh trên hệ thống file cục bộ. Với dịch vụ có bộ nhớ tạm/ephemeral, những thay đổi **có thể mất sau restart hoặc redeploy**. Không dùng để lưu dữ liệu thật. Nếu cần kiểm thử lưu dữ liệu bền vững, phải chuyển Backend sang CSDL được quản lý/persistent SQL Server và file storage riêng trước.

## 3. Tiêu chí đánh giá trạng thái deploy

- [ ] Có URL public truy cập được.
- [ ] `/api/health` trả `status: ok`.
- [ ] Đăng nhập tài khoản mẫu thành công.
- [ ] Mở được UC01–UC11 và thao tác các luồng kiểm thử.
- [ ] Không dùng dữ liệu cá nhân sinh viên thật.
- [ ] Không công bố mật khẩu thật hoặc secret trên GitHub.
- [ ] Đã kiểm tra chính sách lưu dữ liệu, khả năng khôi phục và bảo mật khi chuẩn bị chuyển production.

> **Chưa triển khai:** File ZIP không tự tạo Render service; chỉ sau khi kết nối repo và deploy thành công mới có URL trực tuyến.
