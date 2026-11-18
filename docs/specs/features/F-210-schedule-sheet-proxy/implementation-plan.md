# Implementation Plan — F-210: Proxy lịch Sheet SoT

**Spec:** [spec.md](./spec.md) · **Design:** [design.md](./design.md)

## Trạng thái tổng

- [x] Spec approved
- [x] Design reviewed
- [x] Implementation
- [x] Tests (TC-F210-01..13)
- [ ] Manual smoke (Sheet thật + credentials)

## Tasks (theo thứ tự)

| # | Task | File dự kiến | Done |
|---|------|--------------|------|
| 1 | sheetsAuth RW + scheduleDataService LWW | `sheetsAuth.js`, `scheduleDataService.js` | [x] |
| 2 | requireModOrAdmin + GET/PUT routes | `requireModOrAdmin.js`, `scheduleRoutes.js` | [x] |
| 3 | Client scheduleSync + App/Navbar | `scheduleSync.js`, `App.jsx`, `Navbar.jsx` | [x] |
| 4 | Unit tests LWW/403/409/rev0 | `server/test/scheduleData*.test.js` | [x] |
| 5 | INDEX + epic-2 + sprint-status | docs / `_bmad-output` | [x] |

## Ghi chú triển khai

- Không đổi `schedulerEngine`, F-103 `/config`, Handsontable chrome.
- Env: `GOOGLE_SHEETS_CLIENT_EMAIL`, `GOOGLE_SHEETS_PRIVATE_KEY` (cần quyền Editor trên Spreadsheet).
- Tab Sheet tự tạo lần đầu GET/PUT khi đã link.

## Smoke test thủ công

1. Admin liên kết Sheet (F-103) + credentials → login → Navbar `Sheet · trực tiếp` hoặc `Chờ đồng bộ Sheet`.
2. Mod sửa ô → sau debounce dữ liệu lên tab `_smoothwork_data`; `_smoothwork_meta.revision` tăng.
3. User login → xem được; PUT → 403.
4. Chưa link → GET/PUT 409; app không crash, status cache.
5. Hai máy: máy B lưu với base cũ → conflict flag; Sheet giữ bản LWW mới.
