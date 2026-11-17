# F-103: Liên kết Spreadsheet SoT (Cài đặt)

| Trường | Giá trị |
|--------|---------|
| Trạng thái | implemented |
| Phụ thuộc | F-102 |
| Module | cả hai |

## Mục tiêu

Cho Admin lưu tham chiếu Spreadsheet SoT của khoa trong Cài đặt; user đã login đọc trạng thái; chưa liên kết thì nhắc setup, không crash; chưa sync lưới lịch (Epic 2).

## Phạm vi

### In scope

- Prisma `DeptScheduleConfig` (singleton) lưu `spreadsheetId` (+ title/verified meta tối thiểu)
- `GET /api/schedule/config` — user đã login
- `PUT /api/schedule/config` — chỉ Admin; validate format; ping metadata nếu có credentials (Q2=C)
- UI Account → Tùy chọn: form liên kết Sheet + banner nhắc khi chưa liên kết

### Out of scope

- Proxy đọc/ghi lưới lịch, revision, Public (Epic 2)
- Story 1.3 danh sách người, 1.4 liên kết tên
- Đổi `schedulerEngine` / F-201 / Handsontable chrome

## Yêu cầu chi tiết

### Endpoint

| Method / path | Ai | Input | Output |
|---------------|----|-------|--------|
| `GET /api/schedule/config` | JWT | — | `{ config: { spreadsheetId, linked, verified, title, verifiedAt, updatedAt } }` — `spreadsheetId` có thể `null` |
| `PUT /api/schedule/config` | JWT + Admin | `{ spreadsheetId }` hoặc `{ spreadsheetIdOrUrl }` | `{ config }` đã lưu |

- **401:** chưa đăng nhập
- **403:** không phải Admin khi PUT
- **400:** format ID/URL không parse được — `{ error }` tiếng Việt; không lưu
- **422:** có credentials Sheets nhưng ping metadata fail — `{ error }` tiếng Việt; không lưu

### Env (optional ping)

- `GOOGLE_SHEETS_CLIENT_EMAIL`
- `GOOGLE_SHEETS_PRIVATE_KEY` (có thể chứa `\n`)

Thiếu credentials → vẫn lưu sau format OK (`verified=false`).

## Ràng buộc nghiệp vụ

| ID | Điều kiện | Kết quả |
|----|-----------|---------|
| BR-103-01 | Admin; URL/ID hợp lệ; không credentials | Lưu Prisma; `linked=true`; `verified=false` |
| BR-103-02 | Admin; format OK; credentials; ping OK | Lưu; `verified=true`; có thể có `title` |
| BR-103-03 | Admin; format OK; credentials; ping fail | Không lưu; 422 tiếng Việt |
| BR-103-04 | Non-Admin PUT | 403 |
| BR-103-05 | Chưa liên kết; mở Cài đặt | Banner/hint; không crash |
| BR-103-06 | Format sai | 400; không lưu |

## Test cases

| ID | Mô tả | Input | Kỳ vọng |
|----|-------|-------|---------|
| TC-F103-01 | Parse URL | docs.google.com/spreadsheets/d/{id}/… | ok + id |
| TC-F103-02 | Parse raw id | id ≥ 20 ký tự hợp lệ | ok |
| TC-F103-03 | Format lỗi | chuỗi ngắn/sai | ok=false tiếng Việt |
| TC-F103-04 | Rỗng | `""` | lỗi nhập |
| TC-F103-05 | GET chưa có row | DB trống | linked false, spreadsheetId null |
| TC-F103-06 | Lưu không credentials | URL hợp lệ + ping skip | persist linked |
| TC-F103-07 | Ping fail | credentials path trả lỗi | 422; không upsert |
| TC-F103-08 | Format lỗi service | id ngắn | 400 |
| TC-F103-09 | Ping OK | title từ API | verified + title |
| TC-F103-10 | requireAdmin non-Admin | role `""` | 403 |
| TC-F103-11 | requireAdmin Admin | role Admin | next |

Automated: `server/test/spreadsheetId.test.js`, `scheduleConfigService.test.js`, `requireAdmin.test.js`.

## Definition of Done

- [x] Spec / design / plan
- [x] Schema + API + UI Cài đặt
- [x] Test map TC-F103-01..11
- [x] INDEX cập nhật
