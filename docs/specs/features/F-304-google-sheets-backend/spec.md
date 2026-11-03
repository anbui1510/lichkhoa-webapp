# F-304: Lịch khoa trên Google Sheet (khoa tự chủ)

| Trường | Giá trị |
|--------|---------|
| Trạng thái | implemented |
| Phụ thuộc | F-301 (access), F-101 (Google login / token) |
| Module | cả hai |

## Mục tiêu

Mỗi khoa dùng **một Google Spreadsheet** (tab có cấu trúc) làm nguồn dữ liệu; **admin giữ file**; phân quyền tab theo **tab NhanSu**, không dùng share Drive làm RBAC. Web app là lớp UI (mobile + desktop).

## Phạm vi

### In scope

- Tab: `_meta`, `NhanSu`, `Task`, `LichTuan`, `LichThang`, `LichNghi`, `LichHoc`, `Dashboard`
- Apps Script Web App (execute as admin): `pull` / `push` / `getProfile`
- FE: `VITE_DATA_BACKEND=sheet`, mapper [`src/logic/sheetStore/`](../../../../src/logic/sheetStore/), [`sheetSync`](../../../../src/features/sheetSync/)
- RBAC: BR-304-01..03 khớp F-301 [`access.js`](../../../../src/logic/access.js)

### Out of scope

- RBAC chính bằng share Drive Viewer/Editor
- Realtime / conflict merge nâng cao
- Thay thế hoàn toàn F-303 (giữ `VITE_DATA_BACKEND=api`)

## API bridge (Apps Script POST JSON)

| action | Body | Response |
|--------|------|----------|
| `getProfile` | `{ spreadsheetId, idToken }` | `{ email, actor, updatedAt }` hoặc 403 |
| `pull` | `{ spreadsheetId, idToken }` | `{ tabs, meta, updatedAt }` |
| `push` | `{ spreadsheetId, idToken, tabs }` | `{ updatedAt }` |

## Ràng buộc nghiệp vụ

| ID | Điều kiện | Kết quả |
|----|-----------|---------|
| BR-304-01 | Email không trong `NhanSu` | 403 |
| BR-304-02 | Member PUT tab không `canEdit` | 403 tab đó |
| BR-304-03 | `accessRole` ≠ member | Ghi mọi tab |
| BR-304-04 | Thiếu tab bắt buộc | 400 + hướng dẫn copy mẫu |

## Test cases

| ID | Mô tả | Kỳ vọng |
|----|-------|---------|
| TC-F304-01 | parseSpreadsheetId URL | id hợp lệ |
| TC-F304-02 | NhanSu round-trip | staff + access khớp |
| TC-F304-03 | Task round-trip | tasks khớp |
| TC-F304-04 | week_cell round-trip | grid cell khớp |

## Definition of Done

- [x] design / implementation-plan
- [x] Mapper + bridge + FE adapter
- [x] DEPLOY-GOOGLE-SHEETS.md
- [x] `npm run sdd:check`
