# LIGHTHOUSE – UC01–UC11 integrated testing build

> **IMPORTANT / PHẠM VI:** Source here is an **end-to-end runnable workflow-testing prototype**. All 11 UC groups have corresponding pages and working API operations against **fake demo data**. This is **NOT the final production implementation** specified by SDD: runtime persistence is JSON, not SQL Server; email sending, production uploads/storage, and direct generated PDF backend are not implemented. No live hosting URL has been created by this package alone.

## Phát triển và triển khai trực tuyến

Chỉ làm việc trong repository `qanhbi2609/LIGHTHOUSE`.
Đọc [hướng dẫn Development / Staging / Production](docs/DEPLOYMENT.md) và
[kiểm kê SRS / SDD, kết quả kiểm thử, phần còn thiếu](docs/READINESS.md).
Workflow CI chạy API và browser smoke; CD và URL công khai cần kết nối hosting.
Chưa nghiệm thu Final, chưa triển khai Production.

## Run locally (Windows)

1. Install Node.js 20+.
2. Extract the package to a separate folder, e.g. `D:\LIGHTHOUSE-FULL-TEST`.
3. Double-click `run-demo.bat`, OR open the VS Code terminal and run:

   ```powershell
   cd backend
   $env:DEMO_ONLY="1"
   node seed.js
   node server.js
   ```

4. Open **http://localhost:3000** in Chrome.
5. Changes are stored in `backend/data/figma-demo-v1.json` by default, using
   the supplied UC03/UC04 screenshot data. The previous `lighthouse.json` is kept.
   After testing, reset the selected sample dataset with `node seed.js --reset`
   while the server is **stopped**. See [data and scrollbar details](docs/UC03-UC04.md).

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Quản lý | `quanly@lighthouse.test` | `Demo@123` |
| Giám đốc | `giamdoc@lighthouse.test` | `Demo@123` |
| Cán bộ (read permissions) | `canbo@lighthouse.test` | `Demo@123` |
| Sinh viên | `sinhvien@lighthouse.test` | `Demo@123` |

Credentials are fake and must **never be used for real accounts**.

## Supported workflow coverage

| UC | Function | Current test status |
|---|---|---|
| UC01 | Login/logout, forgot-password demo OTP, password reset | Working demo API/UI. No real email service. |
| UC02 | New registration form | Working demo API/UI, plus proof-file upload to local test storage. |
| UC03 | Review status, accept eligible profile, generate student account | Working demo API/UI. Real invitation email not connected. |
| UC04 | Search, view and edit student; image upload/delete; support records | Working API/UI. Image files on local disk, not cloud storage. |
| UC05 | List, detail, create, assign, delete room; room-capacity checks | Working demo API/UI. |
| UC06 | Evaluate goals; review grades, request resubmission | Working demo API/UI. |
| UC07 | Alumni list, search and detail; mark end of support in edit student | Working demo API/UI. |
| UC08 | List, create, edit permissions, deactivate users | Working demo API/UI. Deactivation retains history rather than hard delete. |
| UC09 | Create/save draft/edit/preview reports; **browser Print → Save as PDF** | Working demo UI/API with print-to-PDF; not an automatic PDF-rendering service. |
| UC10 | View audit logs, filter start/end date; invalid-range / empty states | Working demo API/UI. |
| UC11 | Student submits/resubmits goals and grades | Working demo API/UI; evidence upload to local test storage. |

## Test

```powershell
cd backend
npm test
```

28 automated API, screenshot-data, registration, recovery-security and migration checks exercise authentication, signup/acceptance, profile updates, rooms, goals, grades, roles, reports, and audit.

## Architecture

- `frontend/index.html`, `frontend/style.css`, `frontend/app.js` – browser UI, no build step.
- `backend/server.js` – Node HTTP server + API endpoints, scrypt password hashes, session tokens.
- `backend/seed.js` – **synthetic** demo data, resettable.
- `backend/tests/` – integration tests.
- `backend/data/lighthouse.json` – mutable demo data (excluded from Git).
- `backend/data/figma-demo-v1.json` – default screenshot comparison demo (excluded from Git).
- `backend/uploads/` – mutable demonstration uploads (excluded from Git).
- `database/01_sqlserver_schema.sql` – 16 SQL Server tables based on SDD, with documented technical adjustments. This schema is **not yet wired to the JSON demo runtime**.
- `render.yaml` – online deploy Blueprint template for demo/testing use only.

## SQL Server notes

The SDD has 16 tables. This project includes an SSMS schema adapted for engineering consistency (e.g., nullable student room for 'Chưa bố trí', report draft status). To make a real SQL Server-backed production website, the Backend repository must be implemented against the relational schema (parameterized queries and transactions). **Running the SQL script alone does not change runtime storage.**

## Deploy Staging

Dùng đúng repository `qanhbi2609/LIGHTHOUSE`, nhánh `staging`, tách khỏi Production.
Xem [hướng dẫn triển khai và rollback](docs/DEPLOYMENT.md). Chưa tạo hosting hoặc URL.
Bản JSON demo có thể mất dữ liệu trên host dùng filesystem tạm; chưa đáp ứng lưu bền vững.

## Known production blockers / remaining work

1. Replace demo JSON storage with SQL Server (SSMS schema provided).
2. Build a real OTP/invitation email sender with rate limits and an out-of-band transport.
3. Store student images and evidence privately in object storage with authorized retrieval; current file URL paths are unsuitable for real sensitive documents.
4. Add true PDF-generation service instead of browser Print/Save as PDF if the rubric requires automatic PDF export.
5. Finish private/protected storage for document, grade and report attachments; implement full historical versioning and every exceptional form validation exactly per SRS.
6. Complete production security: session persistence, password policies, CSRF mitigation where applicable, access policy review, audit immutability, backups, encryption, tests and monitoring.
7. Configure a reliable host and persistent database, then run real-browser regression tests with role/permission matrices and NFR tests.

For formal group submission: the functional prototype is a **starting test build**, NOT a claim that SRS + SDD and deployment requirements have been fully satisfied.
