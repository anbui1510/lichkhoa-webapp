---
title: '1.2 Admin liên kết Google Sheet trong Cài đặt'
type: 'feature'
created: '2026-11-17'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '0d54e9ee97c101eeb234317afa19d3760aa78cd3'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-1-1-admin-dang-nhap-google-bootstrap.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Admin đã Google login (1.1) nhưng chưa có chỗ lưu Spreadsheet SoT của khoa; proxy/Epic 2 không biết Sheet nào, và app có thể crash hoặc im lặng khi chưa liên kết.

**Approach:** Trong Cài đặt, Admin nhập/lưu liên kết Spreadsheet SoT; server lưu cấu hình khoa (không phải lưới lịch); validate + báo lỗi rõ; khi chưa liên kết thì nhắc setup, app không crash. Chưa làm đọc/ghi lưới lịch (Epic 2).

**Decisions:**
- **Q1 = A:** Lưu trên Prisma model mới (vd. `DeptScheduleConfig` singleton/khoa) — `spreadsheetId` (+ meta tối thiểu); không gắn vào `UserSetting`.
- **Q2 = C (hybrid):** Bắt buộc parse/format ID/URL hợp lệ mới lưu; nếu server đã có credentials Google Sheets (hoặc tương đương) thì **thử ping metadata** và báo lỗi quyền rõ; nếu **chưa** có credentials thì vẫn cho lưu sau format OK (không chặn hoàn thành 1.2).

## Boundaries & Constraints

**Always:**
- Chỉ Admin (`role=Admin` từ server) được lưu/sửa liên kết Sheet.
- Browser không giữ Sheet service-account / script secret.
- Chưa liên kết → UI nhắc setup; không crash khi mở app/Cài đặt.
- Format ID/URL sai → không lưu, lỗi tiếng Việt; có credentials thì ping fail cũng không lưu + báo rõ.
- Prisma chỉ lưu **tham chiếu** Spreadsheet; SoT lưới lịch vẫn là Google Sheet (Epic 2).
- UI Account/dialogs shadcn; tiếng Việt.

**Never:**
- Không implement proxy đọc/ghi lưới lịch, revision, Public (Epic 2).
- Không đổi `schedulerEngine` / F-201 / Handsontable chrome.
- Không làm Story 1.3 (danh sách người) hay 1.4 (liên kết tên).
- Không coi localStorage `LICHKHOA_DATA_STORE_V1` là SoT Sheet.
- Không bắt buộc credentials Google ngay trong 1.2 để “xong story”.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Lưu OK (format) | Admin; URL/ID hợp lệ; không có credentials ping | Config Prisma lưu; UI đã liên kết | N/A |
| Lưu OK (+ ping) | Admin; format OK; credentials có; ping metadata OK | Lưu + có thể ghi trạng thái verified | N/A |
| Ping fail | Admin; format OK; credentials có; Sheet không đọc được | Không lưu | 400/422 + lỗi quyền/tiếng Việt |
| Chưa liên kết | Mở Cài đặt / app | Nhắc setup; không crash | Banner/hint |
| Không phải Admin | Mod/User gọi API lưu | Từ chối | 403 |
| Format lỗi | ID/URL không parse được | Không lưu | 400 + `{ error }` |
| Đọc config | Client đã login | `spreadsheetId` hoặc null + trạng thái | 401 nếu chưa login |

</frozen-after-approval>

## Code Map

**Continuity 1.1:** `User.role`, `resolveActor` đọc `role===Admin`, F-102, JWT Bearer — dùng để gate Admin.

- `src/features/account/pages/AccountPage.jsx` — tabs Cài đặt (Hồ sơ / Tùy chọn / …); **chưa** tab/sheet link.
- `src/features/account/hooks/useAccount.js` + `services/accountApi.js` — settings API hiện tại.
- `server/src/routes/settingsRoutes.js` + `settingsService.js` — `UserSetting` only.
- `server/prisma/schema.prisma` — chưa model config Sheet khoa.
- `server/src/app.js` — chưa `/api/lichkhoa/*`.
- `server/.env.example` — chưa Spreadsheet id / Sheets credentials.
- `docs/specs/INDEX.md` — gợi ý F-103 cho Sheet link / setup.

**Reuse:** Account Cài đặt UI + auth middleware + Admin role.  
**Không đụng:** `schedulerEngine.js`, `dbStore` SoT cutover, 1.3/1.4 UI.

## Tasks & Acceptance

**Execution:**
- [x] `server/prisma/schema.prisma` (+ migration) -- model `DeptScheduleConfig` (hoặc tên tương đương) lưu `spreadsheetId` -- Q1=A
- [x] `server` API đọc/ghi config -- Admin-only ghi; user login đọc trạng thái -- nền Epic 2
- [x] Validate format bắt buộc + ping metadata tùy credentials (Q2=C) + lỗi tiếng Việt -- không lưu rác
- [x] `AccountPage` (Cài đặt) -- form liên kết Sheet cho Admin; nhắc khi chưa liên kết -- UX journey
- [x] `docs/specs/features/F-103-*` + INDEX -- AD-12
- [x] Tests matrix (format OK không credentials; ping fail không lưu; 403; null unread) -- khóa hành vi

**Acceptance Criteria:**
- Given Admin, when lưu URL/ID Spreadsheet đúng format (kể cả khi chưa có credentials ping), then Prisma lưu và UI hiện đã liên kết.
- Given credentials có và ping fail, when lưu, then không ghi config + báo lỗi rõ.
- Given chưa liên kết, when mở app/Cài đặt, then nhắc setup, không crash.
- Given không phải Admin, when gọi API lưu, then 403.

## Implementation Notes

- Prisma `DeptScheduleConfig` singleton `id=default`; API `GET/PUT /api/schedule/config`.
- Q2=C: `sheetsMetadataPing.js` skip khi thiếu `GOOGLE_SHEETS_CLIENT_EMAIL` / `GOOGLE_SHEETS_PRIVATE_KEY`.
- UI: banner Account + form trong Tùy chọn (`SheetLinkSettings`); F-103 SDD + TC-F103-01..11.
- Verify: `npm run sdd:check` OK (5 folders); `npm test` 29/29.

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Evidence / route |
|---------|---------|------------------|
| Thiếu `scheduleRoutes.js` trong diff | false | File có tại `server/src/routes/scheduleRoutes.js`; artifact diff thiếu |
| Re-save không credentials xóa verified | medium | Xác nhận `title=''`/`verifiedAt=null` khi skip — **patch** giữ meta cùng id |
| GET lỗi → hiện unlinked giả | medium | `refreshScheduleConfig` catch reset EMPTY — **patch** giữ prev nếu linked |
| Không unlink/clear | defer | Intent 1.2 không yêu cầu xóa liên kết |
| Thiếu HTTP route tests | defer | Unit service/middleware đủ AC; HTTP E2E sau |
| Banner đôi Account + SheetLink | low | Reject (UX trùng nhẹ, không sai AC) |
| Shared `error` sheet/profile | low | Reject (đã có từ pattern Account) |
| EMPTY config drift client | low | Reject |
| SoT id chưa dùng ngoài Account | false | Epic 2 cố ý out of scope |
| Migration F-102 lẫn diff | false | Packaging baseline |
| URL id ngắn /d/e/ | medium | URL path không check ID_RE — **patch** |
| URL `/u/N/d/` reject | medium | Regex thiếu — **patch** |
| `??` che spreadsheetId khi OrUrl="" | medium | **patch** dùng `\|\|` |
| Ping không timeout | medium | **patch** timeout 10s |
| Race refresh overlapping | defer | Hiếm; seq guard thêm phức tạp |
| Input stale khi unlinked | defer | Không có unlink trong 1.2 |
| Shared error non-sheet trên card | low | Reject / cùng pattern Account |

## Design Notes

- 1.2 chỉ **đăng ký Sheet**; không sync grid. Endpoint ổn định cho Epic 2 (vd. `GET/PUT /api/schedule/config`).
- Ping (Q2=C): module riêng, no-op/skip khi thiếu credentials; không hard-fail story.
- UI: form lưu cho Admin; user khác có thể read-only trạng thái liên kết.

## Verification

**Commands:**
- `npm run sdd:check` -- expected: pass với F-103
- Test API/config liên quan -- expected: pass matrix

**Manual checks:**
- Admin lưu URL Sheet hợp lệ → thấy đã liên kết sau reload.
- Non-Admin không lưu được.
- Chưa liên kết → hint, app vẫn mở.
