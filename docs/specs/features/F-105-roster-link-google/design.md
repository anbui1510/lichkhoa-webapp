# Design — F-105: Roster link + Google pending

## Tổng quan

```text
Google login
  → resolveGoogleAdminBootstrap / login policy
  → grantAdmin? role=Admin : role="" (pending nếu đã có Admin)

Pending user (Account)
  → GET /api/roster (tên free)
  → POST /api/roster/:id/link
  → User.role = RosterPerson.role; linkedUserId = user.id
  → JWT mới + resolveActor theo role
```

## Thành phần

| Layer | File / module | Trách nhiệm |
|-------|---------------|-------------|
| Policy | `adminBootstrap.js` | pending allow (không 403) |
| Auth | `userService.loginWithGoogle` | persist role Admin hoặc `""` |
| Link | `rosterService.linkPerson` / `unlinkPerson` | SoT role |
| Access | `src/logic/access.js` | Mod full; User member; pending guest |
| UI | `LinkRosterCard.jsx` | Chọn tên chưa taken |

## Luồng dữ liệu

1. Policy: Admin cases như F-102; else `allowed=true`, `grantAdmin=false`.
2. Link: transaction — check free → set linkedUserId → update User.role → signToken.
3. Unlink (Admin): clear linkedUserId; nếu User.role khớp roster role thì về `""`.
4. `resolveActor`: Admin|Mod → FULL; User → MEMBER_DEFAULT; else guest / local seed.

## Lỗi & edge cases

| Tình huống | Xử lý |
|------------|--------|
| Taken | 409 |
| User đã link tên khác | 409 |
| Unlink non-Admin | 403 |

## Bảo mật / quyền

- Role SoT trên server sau link; client chỉ đọc.
- Mod = full lịch access (tương đương admin trong access.js Phase Nội).
