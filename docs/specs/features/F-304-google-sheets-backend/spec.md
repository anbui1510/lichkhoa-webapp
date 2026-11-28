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

- Tab: `_meta`, `NhanSu`, `Task`, `LichTuan` (gồm `week_cell` + `room_meta` cho **Phân công bệnh phòng** / F-211 `roomTable`), `LichThang`, `LichNghi`, `LichHoc`, `Dashboard`
- Apps Script Web App (execute as admin): `pull` / `push` / `getProfile` / `bootstrap`
- Bootstrap khoa mới (NhanSu trống) + đồng bộ eventual (pull focus/interval/nút)
- FE: `VITE_DATA_BACKEND=sheet`, mapper [`src/logic/sheetStore/`](../../../../src/logic/sheetStore/), [`sheetSync`](../../../../src/features/sheetSync/)
- RBAC: BR-304-01..03 khớp F-301 [`access.js`](../../../../src/logic/access.js)

### Out of scope

- RBAC chính bằng share Drive Viewer/Editor
- Realtime / conflict merge nâng cao
- Thay thế hoàn toàn F-303 (giữ `VITE_DATA_BACKEND=api`)

## API bridge (Apps Script POST JSON)

| action | Body | Response |
|--------|------|----------|
| `getProfile` | `{ spreadsheetId, idToken }` | `{ email, actor, updatedAt }` hoặc `{ bootstrapEligible: true, email, updatedAt }` khi NhanSu trống |
| `bootstrap` | `{ spreadsheetId, idToken, tabs }` | `{ updatedAt, actor }` — chỉ khi NhanSu trống; 409 nếu đã có nhân sự |
| `discoverKhoas` | `{ catalogSpreadsheetId, idToken, offset?, limit? }` | F-306 — `{ khoas[], nextOffset, catalogRows }` |
| `pull` | `{ spreadsheetId, idToken }` | `{ tabs, meta, updatedAt }` |
| `push` | `{ spreadsheetId, idToken, tabs }` | `{ updatedAt, written[], skipped[] }` — chỉ bump `_meta` khi `written.length > 0` |

## Ràng buộc nghiệp vụ

| ID | Điều kiện | Kết quả |
|----|-----------|---------|
| BR-304-01 | Email không trong `NhanSu` | 403 |
| BR-304-02 | Member PUT tab không `canEdit` | Tab đó vào `skipped[]` (không ghi); FE báo lỗi nếu `NhanSu` bị skip khi đang đẩy nhân sự |
| BR-304-03 | `accessRole` ≠ member | Ghi mọi tab |
| BR-304-04 | Thiếu tab bắt buộc | 400 + hướng dẫn copy mẫu |
| BR-304-05 | Backend sheet | Cài đặt (Tài khoản → Tùy chọn) hiển thị sổ đang kết nối |
| BR-304-06 | Member | Không đổi link Sheet; xem read-only |
| BR-304-16 | **guest** (Google OK, chưa trong NhanSu file đang trỏ) | Được lưu link Sheet mới (thiết lập khoa khác) |
| BR-304-17 | `getSpreadsheetId` | `localStorage` admin lưu **ưu tiên** hơn `VITE_DEFAULT_SPREADSHEET_*` |
| BR-304-18 | Đăng nhập (kể cả ẩn danh) | **Không** auto-modal checklist; `?sheet=` trên URL hoặc `VITE_DEFAULT_SPREADSHEET_ID`; chưa có sổ → banner + nút «Chọn / lưu sổ» (admin/guest) | 
| BR-304-07 | Admin lưu link mới hợp lệ | Pull Sheet mới; lỗi bridge/403 hiển thị cho user |
| BR-304-08 | NhanSu không có dòng `id` | `getProfile` 200 + `bootstrapEligible: true` (không 403) |
| BR-304-09 | `bootstrap` khi NhanSu trống | Ghi tabs từ payload; caller trở thành admin trên Sheet |
| BR-304-10 | Sau bootstrap | pull/push RBAC như BR-304-01..03 |
| BR-304-11 | FE sheet backend, chưa localStorage | Store ban đầu: 0 staff + task mẫu chung (không seed Tim mạch đầy đủ) |
| BR-304-12 | Tab app active | Pull Sheet khi focus / interval / nút “Đồng bộ từ Sheet” |
| BR-304-13 | Push khi store **0 nhân sự** hoặc tab chỉ header | **Không** ghi NhanSu/Task lên Sheet; bridge giữ dòng cũ nếu payload trống |
| BR-304-14 | Chưa pull Sheet thành công sau login | FE không push debounce (`saveStore`) |
| BR-304-15 | Sheet backend + Tài khoản → Tùy chọn | Hiển thị checklist triển khai khoa mới (vd. Tiêu hóa) |
| BR-304-19 | Push NhanSu với `loginEmail` trống trong khi Sheet đã có | Bridge **giữ** email Sheet; FE gộp remote→local trước push. Sentinel `-` = gỡ liên kết có chủ đích |
| BR-304-20 | Sửa tay tab NhanSu trên Google Sheet | Trigger `onEdit` bump `_meta.updatedAt` (cần cài simple trigger) để FE không đè bằng bản local cũ |
| BR-304-21 | Push xong | **Không** `setStore` snapshot lúc bắt đầu push (tránh hoàn tác tuần đang xem); chỉ gộp `loginEmail` nếu đã merge từ Sheet; `setCloudMeta` merge giữ `viewNavAt` |
| BR-304-22 | Vừa sửa NhanSu / roomTable | `markStaffEdit` / `markRoomTableEdit` + merge khi pull; **không** clear marks ngay sau push (tránh Sheet cũ đè local) |
| BR-304-23 | Trong ~8s sau mark sửa | Pull định kỳ / visibility **không** chạy (trừ force/manual) — tránh hủy debounce push bằng bản Sheet cũ |
| BR-304-24 | `hasPendingSheetEdits` | Push **không** `skipped_remote_newer` chỉ vì `_meta` Sheet mới hơn; ưu tiên ghi local đã mark |
| BR-304-25 | Thêm/đổi/xóa hàng task tuần (`cathRoles` / `cathGrid`, nút «Thêm task từ lịch tháng») | `markMonthLayoutEdit` + `mergeMonthLayoutOnPull` giữ `cathRoles`/`cathGrid` local trong TTL (không để pull xóa hàng vừa thêm) |

## Test cases

| ID | Mô tả | Kỳ vọng |
|----|-------|---------|
| TC-F304-01 | parseSpreadsheetId URL | id hợp lệ |
| TC-F304-02 | NhanSu round-trip | staff + access khớp |
| TC-F304-03 | Task round-trip | tasks khớp |
| TC-F304-04 | week_cell round-trip | grid cell khớp |
| TC-F304-18 | room_meta round-trip | `roomTable` (tên phòng + BS chính/phụ) khớp trên tab LichTuan |
| TC-F304-05 | setSpreadsheetConnection URL/ID | `getSpreadsheetId()` khớp |
| TC-F304-07 | exportStoreToTabs staff rỗng + admin row bootstrap | NhanSu có header + admin `loginEmail` |
| TC-F304-08 | push sau bootstrap (mapper) | Task tab round-trip |
| TC-F304-09 | remote `updatedAt` mới hơn local | Pull thắng trước push (logic FE) |
| TC-F304-13 | push với store 0 nhân sự | Không gửi tab NhanSu; `storeReadyForSheetPush` false |
| TC-F304-21 | export/import LichNghi giữ shortName + from/to | Hiển thị lại sau pull |
| TC-F304-22 | import legacy fromDate | `from` cho DayCalendar |
| TC-F304-23 | export/import LichHoc | taskId, sessions sau pull |
| TC-F304-24 | import legacy LichHoc | tương tự TC-F304-22 |
| TC-F304-14 | `khoaSetupContent` | 8 bước admin + ví dụ tên Sheet khoa mới |
| TC-F304-15 | `resolveSpreadsheetId` | stored > tenant |
| TC-F304-16 | `canEditSheetConnection` | admin + guest true; member false |
| TC-F304-17 | Pull Sheet → `normalizeStore` | Mảng lệch object (`staff`, `leaveEntries`, `monthRoles`) không gây `.forEach is not a function` |
| TC-F304-25 | merge loginEmail local trống + remote có | Lấy remote |
| TC-F304-26 | merge local đã có email | Giữ local |
| TC-F304-27 | merge sentinel `-` | Không restore từ remote |
| TC-F304-28 | export/import `-` | Sheet có `-`; import ra `loginEmail` trống |
| TC-F304-29 | mergeStoreStaffLoginEmails | Theo dept |
| TC-F304-30 | normalizeSheetDateIso ISO UTC | YYYY-MM-DD Asia/Bangkok |
| TC-F304-31 | normalizeSheetDateIso plain | giữ nguyên |
| TC-F304-32 | mergeStaffOnPull khi staffAt fresh | Giữ showInWeek/study* local |
| TC-F304-33 | mergeStaffOnPull hết TTL | Lấy staff remote |
| TC-F304-34 | mergeWeekViewCursor remote thiếu roomTable | Giữ labels local (vd. BS hỗ trợ) |
| TC-F304-35 | staffAt mới | `isEditQuietPeriod` + `hasPendingSheetEdits` |
| TC-F304-36 | hết quiet, còn TTL | quiet false, pending true |
| TC-F304-37 | `mergeMonthLayoutOnPull` khi `monthLayoutAt` fresh | Giữ `cathRoles` + `cathGrid` local (hàng task tuần vừa thêm) |

## Definition of Done

- [x] design / implementation-plan
- [x] Mapper + bridge + FE adapter
- [x] DEPLOY-GOOGLE-SHEETS.md
- [x] `npm run sdd:check`
