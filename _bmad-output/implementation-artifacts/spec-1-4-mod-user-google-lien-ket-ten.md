---
title: '1.4 Mod/User đăng nhập Google và liên kết tên'
type: 'feature'
created: '2026-11-18'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '184451f5a82dc1f3b80390bb95b63e26defe32fa'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-1-3-admin-setup-danh-sach-nguoi.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Sau khi có roster (1.3), Mod/User chưa Google login + liên kết tên để nhận đúng role (không full Admin).

**Approach:** Nới policy Google để user thường đăng nhập được; API liên kết roster → gán `User.role` + `linkedUserId`; UI chọn tên chưa taken; `resolveActor` tôn trọng Mod/User.

**Decisions (user: làm hết Epic 1):**
- Khi đã có ≥1 Admin: Google email ngoài allowlist **được login** với `role=""` (chưa liên kết), không 403 như F-102 cũ cho mọi non-Admin.
- Allowlist / first-user / existing Admin vẫn nhận/giữ Admin như F-102.
- Link: `POST /api/roster/:id/link` (self) — chỉ tên `linkedUserId` null; copy role → User; set linkedUserId.
- Unlink: Admin có thể clear link (tối thiểu); user không lấy tên đã taken.
- `resolveActor`: `Admin`|`Mod` → full admin access; `User` → member defaults; chưa link → guest/nhắc link (không full Admin trừ heuristic local seed).

## Boundaries & Constraints

**Always:** Server SoT role sau link. Tên đã link không chọn được. JWT/profile có role. Tiếng Việt.

**Never:** Không rewrite F-103 Sheet. Không F-201. Không bắt buộc map sang local `dept.staff` trong 1.4 (có thể giữ LinkStaffCard song song hoặc chuyển sang roster server).

## I/O & Edge-Case Matrix

| Scenario | Input | Expected | Error |
|----------|-------|----------|-------|
| Google User mới | Đã có Admin; email ngoài allowlist | 200; role "" | N/A |
| Link tên User | User login; roster A role User free | User.role=User; linked | N/A |
| Link tên Mod | Tương tự | role=Mod; full lịch | N/A |
| Tên taken | linkedUserId set | Từ chối | 409 |
| Admin Google | Allowlist/existing | Vẫn Admin | N/A |
| Chưa link | User mở app | Nhắc liên kết; không full Admin | N/A |

</frozen-after-approval>

## Code Map

- `adminBootstrap.js` / `loginWithGoogle` — nới reject
- `RosterPerson` từ 1.3
- `LinkStaffCard` / AccountPage — chuyển hoặc thêm link roster server
- `access.js` — Mod/User
- F-102 vẫn bootstrap Admin; F-105 hoặc mở rộng F-104 cho link

## Tasks & Acceptance

**Execution:**
- [x] Nới `resolveGoogleAdminBootstrap` / login path cho pending users
- [x] API link (+ optional unlink Admin)
- [x] UI liên kết tên từ roster server
- [x] `access.js` + tests
- [x] SDD F-105 (hoặc F-104 extend) + INDEX
- [x] Regression F-102 Admin bootstrap vẫn pass

**Acceptance Criteria:**
- Given roster A=User, when Google login + link A, then session role User, không full Admin.
- Given A đã linked, when người khác link A, then 409.
- Given Mod name, when link, then quyền Mod (full lịch tương đương admin access trong access.js).
- Given F-102 cases, when Admin bootstrap, then vẫn đúng.

## Implementation Notes

- `resolveGoogleAdminBootstrap`: ngoài allowlist khi đã có Admin → `allowed=true`, `grantAdmin=false`, `pending=true` (không 403). F-102 BR-102-03 superseded; TC-F102-04 cập nhật.
- `POST /api/roster/:id/link` (self) → copy role + `linkedUserId` + JWT mới; taken → 409. Admin `POST .../unlink` clear link (không demote Admin).
- UI: `LinkRosterCard` khi pending; Account preferences giữ roster CRUD.
- `resolveActor`: Admin|Mod → full; User → `MEMBER_DEFAULT`; `""` → guest (local seed heuristic giữ).
- SDD: `docs/specs/features/F-105-roster-link-google/` + INDEX.
- `npm test` 48 pass; `npm run sdd:check` OK (7 features). Không đụng schedulerEngine / Handsontable / F-103 core.

## Spec Change Log

## Review Triage Log

## Design Notes

- Tách “pending Google user” vs Admin bootstrap rõ trong policy helper.
- Prefer mở rộng `adminBootstrap.js` thành `googleLoginPolicy.js` nếu sạch hơn — OK.

## Verification

**Commands:**
- `npm test` — pass (gồm F-102 + F-104/105)
- `npm run sdd:check` — pass
