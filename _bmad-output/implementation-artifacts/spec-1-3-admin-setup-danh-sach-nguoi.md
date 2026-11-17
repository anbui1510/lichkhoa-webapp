---
title: '1.3 Admin setup danh sách người + phân quyền'
type: 'feature'
created: '2026-11-18'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '184451f5a82dc1f3b80390bb95b63e26defe32fa'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-1-1-admin-dang-nhap-google-bootstrap.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-1-2-admin-lien-ket-google-sheet.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Admin chưa có danh sách tên + role Admin/Mod/User trên server để người khác liên kết (FR3).

**Approach:** Thêm roster trên Prisma; Admin CRUD tên + gán role; API Admin-only ghi; danh sách sẵn cho story 1.4.

**Decisions (user: làm hết Epic 1):**
- Lưu `RosterPerson` trên Prisma (không localStorage): `displayName`, `role` ∈ `Admin|Mod|User`, `linkedUserId` nullable.
- UI quản lý trong Account/Cài đặt (hoặc khu Admin rõ) bằng shadcn; không đụng sheet chrome.

## Boundaries & Constraints

**Always:** Chỉ Admin ghi/sửa/xóa (trừ không xóa nếu đang linked — hoặc unlink trước). Role lưu server. Tiếng Việt.

**Never:** Không làm 1.4 link flow chi tiết (chỉ để data sẵn). Không F-201/Sheet sync. Không đổi F-103.

## I/O & Edge-Case Matrix

| Scenario | Input | Expected | Error |
|----------|-------|----------|-------|
| Tạo tên+role | Admin; displayName; role User/Mod/Admin | 201/200; có trong GET list | N/A |
| Sửa role | Admin | Cập nhật | N/A |
| Non-Admin ghi | Mod/User | Từ chối | 403 |
| Tên trùng | Cùng displayName (case-insensitive) | Từ chối hoặc cập nhật có chủ đích | 409 |
| List | Login | Thấy danh sách (ẩn PII thừa) | 401 |

</frozen-after-approval>

## Code Map

- `server/prisma/schema.prisma` — thêm RosterPerson
- `requireAdmin`, Account UI, `access.js` (chưa map Mod/User — 1.4)
- Reuse pattern F-103 routes
- Không đụng: scheduler, schedule config, Handsontable

## Tasks & Acceptance

**Execution:**
- [x] Prisma `RosterPerson` + migration
- [x] API `GET/POST/PATCH/DELETE /api/roster` (Admin ghi)
- [x] UI Admin quản lý danh sách tên+role
- [x] F-104 SDD + tests matrix
- [x] INDEX cập nhật

**Acceptance Criteria:**
- Given Admin, when tạo tên A role User, then roster server có A/User sẵn để link.
- Given non-Admin, when POST roster, then 403.
- Given list, when GET, then trả các mục (kèm trạng thái linked nếu có).

## Implementation Notes

- Prisma `RosterPerson` (`displayName`, `role`, `linkedUserId` unique optional) + migration `20261118010000_add_roster_person`.
- Routes: `GET/POST/PATCH/DELETE /api/roster` — ghi qua `requireAdmin`; GET mọi user JWT; duplicate name case-insensitive → 409; DELETE khi linked → 409.
- UI: `RosterAdminPanel` trong Account → Tùy chọn (shadcn, tiếng Việt).
- SDD: `docs/specs/features/F-104-roster-people/` + INDEX.
- Tests: `rosterService.test.js`, `rosterValidator.test.js` (TC-F104-*).
- Link/unlink deferred to story 1.4 / F-105 (cùng service/routes).

## Spec Change Log

## Review Triage Log

## Design Notes

- `linkedUserId` chuẩn bị 1.4; 1.3 có thể để null.
- Role string khớp `"Admin"|"Mod"|"User"`.

## Verification

**Commands:**
- `npm test` — pass
- `npm run sdd:check` — pass
