# Implementation Plan — F-102: Đăng nhập Google + bootstrap Admin

**Spec:** [spec.md](./spec.md) · **Design:** [design.md](./design.md)

## Trạng thái tổng

- [x] Spec approved
- [x] Design reviewed
- [x] Implementation
- [x] Tests (TC-F102-01..08)
- [ ] Manual smoke (Google thật trên dev)

## Tasks (theo thứ tự)

| # | Task | File dự kiến | Done |
|---|------|--------------|------|
| 1 | Thêm `User.role` + migration | `server/prisma/schema.prisma` | [x] |
| 2 | Policy Q1=C | `server/src/services/adminBootstrap.js` | [x] |
| 3 | Enforce trong `loginWithGoogle` | `server/src/services/userService.js` | [x] |
| 4 | DTO + JWT claim `role` | `userDto.js`, `userService.js` | [x] |
| 5 | `resolveActor` / `needsStaffLink` | `src/logic/access.js` | [x] |
| 6 | Tests matrix | `server/test/adminBootstrap.test.js`, `accessRole.test.js` | [x] |
| 7 | ACCOUNT + INDEX | `docs/ACCOUNT.md`, `docs/specs/INDEX.md` | [x] |

## Ghi chú triển khai

- Dev DB hiện tại dùng `prisma db push`; file migration SQL ghi nhận thay đổi `role` cho môi trường mới.
- Seed local gán `role=Admin` cho `admin@lichkhoa.local` (F-101 password vẫn dùng được).
- AuthPanel **không** đổi layout (Q2=A).

## Smoke test thủ công

1. DB trống (không Admin): Google login bất kỳ → Admin full.
2. Đã có Admin + set `BOOTSTRAP_ADMIN_EMAILS`: email trong list OK; ngoài list → 403.
3. AuthPanel vẫn hiện Google + form mật khẩu.
