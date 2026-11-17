# Design — F-104: Roster people

## Tổng quan

```text
Admin (Account → Tùy chọn)
  → CRUD /api/roster
  → authMiddleware + requireAdmin (ghi)
  → RosterPerson trên Prisma
  → GET list (mọi user login) sẵn cho F-105 link
```

## Thành phần

| Layer | File / module | Trách nhiệm |
|-------|---------------|-------------|
| Schema | `server/prisma/schema.prisma` | `RosterPerson` |
| Service | `server/src/services/rosterService.js` | CRUD + duplicate check |
| Validator | `server/src/validators/rosterValidator.js` | displayName + role |
| Routes | `server/src/routes/rosterRoutes.js` | `/api/roster` |
| Gate | `requireAdmin` | 403 non-Admin ghi |
| UI | `RosterAdminPanel.jsx` + Account preferences | Quản lý danh sách |
| Client | `accountApi.js` / `useAccount.js` | list/create/update/delete |

## Luồng dữ liệu

1. Admin POST `{ displayName, role }` → normalize trim; check duplicate ci → create.
2. PATCH cập nhật tên/role; duplicate check nếu đổi tên.
3. DELETE từ chối nếu đang linked.
4. GET trả `linked: Boolean(linkedUserId)` — không join User PII.

## Mô hình dữ liệu

- `RosterPerson.id` cuid
- `displayName` text
- `role` `"Admin"|"Mod"|"User"`
- `linkedUserId` optional unique → `User.id` (F-105 set)

## Lỗi & edge cases

| Tình huống | Xử lý |
|------------|--------|
| Tên trùng ci | 409 tiếng Việt |
| Role không hợp lệ | 400 |
| Xóa khi linked | 409 |
| Non-Admin ghi | 403 |
| Chưa login | 401 |

## Bảo mật / quyền

- Authorize Admin trên server cho ghi.
- List chỉ cần JWT; ẩn email/password của user liên kết.
