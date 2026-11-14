# Development, Staging và Production

Chỉ dùng repository `qanhbi2609/LIGHTHOUSE`. Không cần tạo repository khác.
Nhánh thay đổi hiện tại: `codex/staging-readiness`. Chưa có tài khoản hosting được
kết nối trong phiên làm việc này, chưa tạo dịch vụ hoặc đăng ký tên miền.

## Cập nhật môi trường nhóm — 14/11/2026

- Website đang dùng: https://lighthouse-cola.onrender.com/.
- Render service: `srv-dbrglcetlv9c738flu40`, [Dashboard](https://dashboard.render.com/web/srv-dbrglcetlv9c738flu40).
- Theo cấu hình người dùng đã xác nhận, dịch vụ theo dõi `codex/staging-readiness`, Auto Deploy sau khi CI thành công. Tiếp tục đẩy đúng nhánh này; không chuyển sang `main` hoặc tạo hosting mới.
- Cloud hiện đẩy GitHub được. Truy cập trực tiếp Render qua proxy vẫn trả CONNECT 403 khi kiểm tra UC03/04; chưa thể xác nhận trạng thái Live từ Cloud. Theo dõi commit/CI trên GitHub và đối chiếu cùng commit trong Render Dashboard. Chỉ khi deploy đó Live, tải lại website (Ctrl+F5) để kiểm tra bản mới.
- Các mục chưa có URL/chưa kết nối và đề xuất nhánh staging bên dưới là ghi chép lúc khởi tạo, không thay thế cấu hình đang dùng ở trên.

## Development

Node.js >=20 (đã kiểm tra với 24.22.1), không cần npm install hay bước build UI.
UC09 dùng pdf-lib/fontkit đã ghim trong `backend/vendor/` và font Roboto cục bộ;
giữ các file này khi triển khai để endpoint PDF hoạt động.
Trong cloud, dùng checkout có sẵn, không tạo worktree trừ khi người dùng yêu cầu.

```bash
cd /workspace/LIGHTHOUSE/backend
export LIGHTHOUSE_DATA_DIR=/workspace/lighthouse-runtime/data
export LIGHTHOUSE_UPLOADS_DIR=/workspace/lighthouse-runtime/uploads
export DEMO_ONLY=1
node seed.js
npm run dev
```

`node --watch` khởi động lại Backend khi file thay đổi; frontend HTML/CSS/JS cần
tải lại trình duyệt. Đây **chưa phải HMR**. HMR cập nhật module trong phiên trình
duyệt và chỉ thuộc Development, không thay thế kiểm thử/deploy Staging.

## Kiểm thử trước triển khai

```bash
cd /workspace/LIGHTHOUSE/backend
LIGHTHOUSE_UPLOADS_DIR=/workspace/lighthouse-runtime/test-uploads npm test
cd ..
# Cài trong virtualenv nếu máy chưa có Playwright:
python -m pip install playwright==1.62.0
python -m playwright install chromium
python scripts/browser_smoke.py
# Máy cloud hiện tại đã có Chromium:
# CHROMIUM_PATH=/usr/bin/chromium python scripts/browser_smoke.py
```

Browser script tạo server, database và uploads tạm riêng, chụp ảnh vào
`artifacts/browser` rồi dừng server; không reset dữ liệu phát triển.
CI `.github/workflows/ci.yml` chạy API và browser smoke trên push nhánh
`main`, `staging`, `codex/**` và PR vào `main`/`staging`; lưu ảnh thành artifact.
CI kiểm tra hiện trạng demo, chưa chứng minh đạt toàn bộ SRS/SDD hoặc Figma.

## Staging trực tuyến — bước cần tài khoản cá nhân

Phương án ngắn hạn là Render Web Service phục vụ thử giao diện/luồng demo.
Phương án đáp ứng Final là dịch vụ Node + SQL Server được quản lý (ví dụ Azure SQL)
+ object storage riêng tư + dịch vụ email, tách riêng dữ liệu Staging/Production.
Chưa cấp phát tài nguyên; cần xem mức phí cụ thể trong tài khoản trước khi xác nhận.
Không giả định free tier đáp ứng SQL Server, độ bền dữ liệu hay 24/7.

1. Render Dashboard → New → Web Service → kết nối GitHub, chỉ cấp quyền repository
   `qanhbi2609/LIGHTHOUSE`. Chọn workspace cá nhân và xem giá trước khi tạo.
2. Sau khi nhánh đã có CI và được kiểm tra, dùng nhánh `staging` riêng.
   Root directory `backend`, runtime Node, start command `npm start`.
   Bản hiện tại không cần cài dependencies; có thể dùng `node --check server.js` làm build command.
3. Với bản demo đặt `NODE_ENV=production`, `DEMO_ONLY=1`. Render tự cấp `PORT`.
   Không sử dụng dữ liệu thật. Bản JSON trên filesystem tạm có thể mất dữ liệu khi
   redeploy/restart; **không đáp ứng** yêu cầu lưu bền vững của Final.
4. Trong cấu hình tự deploy, chọn chỉ triển khai sau khi CI checks đạt (nếu tài khoản
   hỗ trợ chế độ này); nếu chưa có gate này, tắt auto-deploy và deploy thủ công sau CI.
   Việc lưu workflow trong GitHub không tự tạo Render service hoặc kích hoạt CD.
5. Health check path `/api/health`. Sau deploy kiểm tra URL HTTPS được Render cấp,
   health có `status:ok`, đăng nhập và xem hồ sơ; lưu commit, deploy ID và kết quả.
   Chưa có URL thật để điền vào tài liệu này.
6. Chỉ bật CD Staging sau khi kiểm chứng: push staging → CI đạt → deploy đúng commit
   → request chức năng đạt; thử bản lỗi CI để xác nhận phiên bản đang chạy được giữ lại.

CI/CD cần chờ hàng đợi, kiểm thử và deploy, thường tính bằng phút và phụ thuộc nhà
cung cấp; không cam kết số phút khi chưa đo. Sau deploy thành công tải lại web để xem.

## Production và khôi phục

- Không tự deploy `main` lên Production. Chỉ phát hành commit đã nghiệm thu trên
  Staging, qua môi trường GitHub `production` có người duyệt hoặc thao tác duyệt của host.
- Bảo vệ `main`/`staging`, bắt buộc check `API and browser smoke` và review PR.
  Các cài đặt này chưa được áp dụng tự động lên GitHub trong phiên này.
- Tách database, storage và credentials giữa môi trường; cấu hình secrets trong host,
  không đưa vào Git. Không chạy seed/reset demo trong Production.
- Schema thay đổi cần migrations tương thích ngược, backup trước phát hành, giữ commit
  và artifact đã biết chạy tốt. Rollback app về bản trước; không đảo migration phá dữ liệu.
- Sao lưu đáp ứng NFR-14 (5–10 phút) và kiểm thử phục hồi; không chỉ tạo lịch backup.
- Không thay bản đang chạy khi build/test/health thất bại; cần kiểm chứng hành vi của
  host và chiến lược rollout thực tế trước khi công bố đáp ứng yêu cầu này.

## Tên miền

`lighthouse.vn` chưa được xác minh khả năng đăng ký: request từ môi trường bị chặn
và việc một website phản hồi/không phản hồi không chứng minh tên miền còn trống.
Kiểm tra trực tiếp tại nhà đăng ký .vn trước khi mua. Có thể tra cứu các tên chứa
LIGHTHOUSE khác, ví dụ `lighthouse-student.vn`; đây là gợi ý, chưa xác nhận còn trống.
URL miễn phí do host cấp có thể dùng cho Staging trước khi mua tên miền.

Sau khi host và tên miền đã được chọn: thêm custom domain trong host, dùng đúng
bản ghi DNS mà host cung cấp (không đoán IP), chờ xác minh, cấp chứng chỉ quản lý,
bật HTTPS redirect và kiểm tra từ thiết bị khác. Không cần bật laptop để server hoạt động.
