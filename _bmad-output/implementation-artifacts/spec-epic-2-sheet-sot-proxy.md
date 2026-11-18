---
title: 'Epic 2 — Sheet SoT proxy (2.1–2.4)'
type: 'feature'
created: '2026-11-19'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '19b82c3'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-1-2-admin-lien-ket-google-sheet.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Lịch vẫn SoT trên localStorage; nhiều máy/user không cùng nguồn Sheet dù đã có F-103 link.

**Approach:** Express proxy đọc/ghi payload lịch từ Spreadsheet đã link; revision LWW; client demote localStorage thành cache có trạng thái.

**Decisions (user: thực hiện trọn Epic 2):**
- Tab Sheet: `_smoothwork_data` (JSON payload) + `_smoothwork_meta` (`revision` monotonic int, `updatedAt`, `updatedBy`).
- API: `GET /api/schedule/data` (auth) → `{ payload, revision, source: 'sheet' }`; `PUT /api/schedule/data` body `{ payload, baseRevision }` — Mod/Admin (role Admin|Mod) được ghi; User role → 403 ghi.
- LWW: nếu `baseRevision !== current` vẫn chấp nhận ghi mới, tăng revision, trả `{ conflict: true, revision, payload }` (hoặc header); client báo conflict.
- Chưa link spreadsheet → 409/400 rõ, không crash app.
- Client: boot ưu tiên GET sheet; ghi debounce/save → PUT; localStorage cache + cờ `cacheStatus: 'live'|'cache'|'stale'|'need-sync'`.
- Không implement full tab LichTuan cell mapping kiểu CHD trong Epic 2 — JSON payload đủ AC FR19.

## Boundaries & Constraints

**Always:** Server-only Sheets I/O; JWT; Vietnamese errors; F-103 config không bị phá.

**Never:** Không đổi `generateWeeklySchedule` thuật toán; không migrate Handsontable sang shadcn; không làm Epic 3 Public/auto phòng; không xóa F-102–105.

## I/O & Edge-Case Matrix

| Scenario | Input | Expected | Error |
|----------|-------|----------|-------|
| Đọc OK | Linked + credentials + auth | 200 payload+revision | N/A |
| Chưa link | No spreadsheetId | Không SoT sheet | 409 rõ |
| Ghi Mod/Admin | baseRevision khớp hoặc lệch | Lưu Sheet; revision++ | conflict flag nếu lệch |
| Ghi User | role User | Từ chối | 403 |
| Offline/cache | Có cache trước | Xem cache + status | N/A |
| Online lại | GET sheet | Sheet thắng nếu lệch | N/A |
| Thiếu credentials | Env trống | Không giả thành công | 503/422 rõ |

</frozen-after-approval>

## Code Map

- F-103: `scheduleConfigService`, `sheetsMetadataPing`, `DeptScheduleConfig`
- Client SoT hôm nay: `src/store/dbStore.js`, `App.jsx` saveStore debounce
- Auth roles: `User.role` Admin|Mod|User
- New: `scheduleDataService`, routes GET/PUT data, client `scheduleSync` / wire App
- SDD F-210-schedule-sheet-proxy

## Tasks & Acceptance

**Execution:**
- [x] Server Sheets read/write JSON tabs + ensure tabs exist
- [x] GET/PUT `/api/schedule/data` + role gate + revision LWW
- [x] Client sync service + wire App load/save; demote dbStore to cache + status UI hint
- [x] F-210 SDD + INDEX + tests (parse/revision/LWW/403/409)
- [x] Mark sprint stories 2.1–2.4 done when AC met

**Acceptance Criteria:**
- 2.1: Load lịch từ proxy→Sheet khi đã link (không lấy localStorage làm bản đúng).
- 2.2: Mod/Admin lưu lên Sheet; User không ghi được.
- 2.3: Đọc có revision; ghi có baseRevision; lệch → conflict signal + LWW.
- 2.4: Offline xem cache có trạng thái; online Sheet thắng.

## Implementation Notes

- **2026-11-19:** F-210 implemented.
  - Server: `sheetsAuth.js`, `scheduleDataService.js` (tabs `_smoothwork_data` / `_smoothwork_meta`), `requireModOrAdmin`, GET/PUT `/api/schedule/data`.
  - LWW via `resolveWriteRevision`; 409 unlinked; 503 missing credentials; 403 User write.
  - Client: `src/services/scheduleSync.js`; App boot prefers GET; debounced PUT; Navbar sync status (`live|cache|stale|need-sync`).
  - SDD: `docs/specs/features/F-210-schedule-sheet-proxy/` + INDEX.
  - Tests: TC-F210-01..13 in `scheduleDataService.test.js`, `requireModOrAdmin.test.js`.
  - Untouched: `schedulerEngine`, F-103 config contract, Handsontable chrome, Epic 3.

## Spec Change Log

- 2026-11-19: status → done; tasks checked; Implementation Notes appended.

## Review Triage Log

## Design Notes

- Reuse GoogleAuth; widen scopes to spreadsheets (not readonly-only) for write.
- Payload schema: document minimal fields (`departments`, `sheetsByDept`, `activeDeptId`, …) matching normalizeStore output subset.
- If Sheet empty first GET → return empty payload revision 0; first PUT creates tabs.

## Verification

**Commands:**
- `npm test` — pass
- `npm run sdd:check` — pass
