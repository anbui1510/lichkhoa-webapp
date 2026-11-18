# F-210: Proxy lịch Sheet SoT (Epic 2)

| Trường | Giá trị |
|--------|---------|
| Trạng thái | implemented |
| Phụ thuộc | F-103, F-101 |
| Module | cả hai |

## Mục tiêu

Nhiều máy/user cùng một nguồn lịch qua Express proxy → Google Spreadsheet đã liên kết (F-103); localStorage chỉ còn cache có trạng thái (FR19 / AD-2 / AD-8).

## Phạm vi

### In scope

- Tab Sheet `_smoothwork_data` (JSON payload, **chunk nhiều hàng cột A** nếu > ~45k ký tự) + `_smoothwork_meta` (`revision`, `updatedAt`, `updatedBy`, `chunkCount`)
- `GET /api/schedule/data` — JWT; đọc payload + revision
- `PUT /api/schedule/data` — JWT + Admin|Mod; body `{ payload, baseRevision }`; LWW + `conflict`
- Client sync: boot ưu tiên Sheet; save → PUT; cache status `live|cache|stale|need-sync`; dialog conflict + nạp lại
- Credentials Google trên server (Editor share); `GET /config` báo `sheetsCredentialsConfigured` / `syncReady`; lỗi tiếng Việt rõ

### Out of scope

- Đổi thuật toán `schedulerEngine` / F-201
- Đổi contract F-103 `/config`
- Migrate Handsontable chrome sang shadcn
- Epic 3 (Public / auto bệnh phòng) và mapping cell LichTuan kiểu CHD

## Yêu cầu chi tiết

### Endpoint

| Method / path | Ai | Input | Output |
|---------------|----|-------|--------|
| `GET /api/schedule/data` | JWT | — | `{ payload, revision, source: 'sheet', updatedAt?, updatedBy? }` |
| `PUT /api/schedule/data` | JWT + Admin\|Mod | `{ payload, baseRevision }` | `{ payload, revision, conflict, source: 'sheet', … }` |

- **401:** chưa đăng nhập
- **403:** role User (hoặc không Admin/Mod) khi PUT
- **409:** chưa liên kết `DeptScheduleConfig.spreadsheetId`
- **503:** thiếu `GOOGLE_SHEETS_CLIENT_EMAIL` / `GOOGLE_SHEETS_PRIVATE_KEY`
- **422/502:** Sheets API lỗi (quyền/ID) — message tiếng Việt

### Payload

Subset store tương thích `normalizeStore`: `departments`, `sheetsByDept`, `activeDeptId`, `weeklySchedules`, `monthlySchedules`.

### Revision / LWW

- Đọc kèm `revision` (monotonic int; sheet trống → `0`)
- Ghi kèm `baseRevision`; luôn chấp nhận ghi mới (`revision++`); nếu `baseRevision !== current` → `conflict: true`

### Client

- Boot: GET Sheet khi đã auth + linked; Sheet thắng khi có payload usable; empty rev 0 → giữ cache + `need-sync`
- Offline / API lỗi → cache + `stale` / `cache`
- Save debounce → `saveStore` (cache) + PUT nếu Mod/Admin + linked
- UI hint trạng thái trên Navbar

## Ràng buộc nghiệp vụ

| ID | Điều kiện | Kết quả |
|----|-----------|---------|
| BR-210-01 | Linked + credentials + auth GET | 200 payload + revision |
| BR-210-02 | Chưa link spreadsheet | 409 tiếng Việt |
| BR-210-03 | PUT Admin\|Mod; base khớp hoặc lệch | Lưu Sheet; revision++; conflict nếu lệch |
| BR-210-04 | PUT role User | 403 |
| BR-210-05 | Sheet trống lần đầu | revision 0; payload `{}` |
| BR-210-06 | Thiếu credentials | 503 rõ; không giả SoT |
| BR-210-07 | Online có payload Sheet | Sheet thắng localStorage |
| BR-210-08 | Offline có cache | Xem được + status cache/stale |

## Test cases

| ID | Mô tả | Input | Kỳ vọng |
|----|-------|-------|---------|
| TC-F210-01 | LWW khớp | current=base | conflict false; next+1 |
| TC-F210-02 | LWW lệch | base ≠ current | conflict true; vẫn +1 |
| TC-F210-03 | Meta rỗng | [] | revision 0 |
| TC-F210-04 | Parse meta/data | rows JSON | đúng field |
| TC-F210-05 | GET unlinked | no spreadsheetId | 409 |
| TC-F210-06 | GET empty sheet | tabs trống | payload {}; revision 0 |
| TC-F210-07 | PUT conflict | base lệch | conflict true |
| TC-F210-08 | PUT khớp | base = current | conflict false |
| TC-F210-09 | PUT unlinked | no id | 409 |
| TC-F210-10 | User write gate | role User | 403 |
| TC-F210-11 | Empty role gate | role "" | 403 |
| TC-F210-12 | Mod write | role Mod | next() |
| TC-F210-13 | Admin write | role Admin | next() |

Automated: `server/test/scheduleDataService.test.js`, `server/test/requireModOrAdmin.test.js`.

## Definition of Done

- [x] Spec / design / plan
- [x] API GET/PUT + Sheets tabs + role gate + LWW
- [x] Client sync + cache status UI
- [x] Test map TC-F210-01..13
- [x] INDEX cập nhật
