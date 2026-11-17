# Design — F-102: Đăng nhập Google + bootstrap Admin

## Tổng quan

```text
Client GSI → POST /api/auth/google { credential }
  → verifyGoogleCredential (401 nếu fail)
  → tìm user theo googleId / email (409 nếu googleId conflict)
  → resolveGoogleAdminBootstrap (Q1=C) → 403 nếu từ chối
  → create/link user; gán role=Admin khi grant
  → JWT { sub, email, role } + profile DTO có role
Client resolveActor(user) → kind admin nếu user.role === 'Admin'
```

## Thành phần

| Layer | File / module | Trách nhiệm |
|-------|---------------|-------------|
| Policy | `server/src/services/adminBootstrap.js` | Parse allowlist + quyết định allow/grant |
| Service | `server/src/services/userService.js` | `loginWithGoogle` enforce + persist role |
| Auth Google | `server/src/services/googleAuth.js` | Verify ID token |
| Controller | `server/src/controllers/userController.js` | Map status 401/403/409 |
| DTO | `server/src/utils/userDto.js` | `role` trên profile |
| Schema | `server/prisma/schema.prisma` | `User.role` |
| Access UI | `src/logic/access.js` | Admin từ `role`, fallback local seed |

## Luồng dữ liệu

1. Verify credential → email + googleId.
2. Đếm Admin hiện có; áp Q1=C trước khi tạo user mới (tránh tạo rồi mới 403).
3. Persist `role=Admin` khi grant; sign JWT kèm `role`.
4. FE lưu user DTO; `resolveActor` đọc `role`.

## Mô hình dữ liệu

- `User.role`: string, default `""`; giá trị Admin = `"Admin"`.
- Env: `BOOTSTRAP_ADMIN_EMAILS` (CSV).

## Lỗi & edge cases

| Tình huống | Xử lý |
|------------|--------|
| First-user | adminCount=0 → Admin |
| Allowlist | email trong list → Admin |
| Ngoài policy | 403 tiếng Việt |
| Admin hiện có | giữ role, không demote |
| Credential lỗi | 401 từ verify |
| googleId conflict | 409 |

## Bảo mật / quyền

Authorize Admin trên server (`role` Prisma). Client chỉ dùng `role` cho UX (`resolveActor` / tab). Không tin client để bypass API.
