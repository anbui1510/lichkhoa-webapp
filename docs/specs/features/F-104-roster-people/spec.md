# F-104: Admin setup danh sách người + phân quyền (roster)

| Trường | Giá trị |
|--------|---------|
| Trạng thái | implemented |
| Phụ thuộc | F-102 |
| Module | cả hai |

## Mục tiêu

Admin tạo/sửa/xóa danh sách tên (`RosterPerson`) trên server kèm role `Admin|Mod|User` để người dùng liên kết ở F-105.

## Phạm vi

### In scope

- Prisma `RosterPerson`: `displayName`, `role`, `linkedUserId` (nullable, unique)
- `GET/POST/PATCH/DELETE /api/roster` — GET mọi user đã login; ghi chỉ Admin
- UI Account → Tùy chọn: quản lý danh sách (shadcn, tiếng Việt)

### Out of scope

- Link/unlink Google user → tên (F-105)
- F-201 / Sheet sync / Handsontable / F-103 core

## Yêu cầu chi tiết

### Endpoint

| Method / path | Ai | Input | Output |
|---------------|----|-------|--------|
| `GET /api/roster` | JWT | — | `{ people: [{ id, displayName, role, linked, linkedUserId }] }` |
| `POST /api/roster` | JWT + Admin | `{ displayName, role }` | `201` `{ person }` |
| `PATCH /api/roster/:id` | JWT + Admin | `{ displayName?, role? }` | `{ person }` |
| `DELETE /api/roster/:id` | JWT + Admin | — | `204` hoặc `{ ok: true }` |

- **401:** chưa đăng nhập
- **403:** non-Admin ghi
- **404:** id không tồn tại
- **409:** `displayName` trùng (case-insensitive) hoặc xóa khi đang linked

### Role enum

`Admin` | `Mod` | `User` (string khớp Prisma / JWT).

## Ràng buộc nghiệp vụ

| ID | Điều kiện | Kết quả |
|----|-----------|---------|
| BR-104-01 | Admin; displayName mới; role hợp lệ | Tạo; có trong GET |
| BR-104-02 | Admin; sửa role/tên | Cập nhật |
| BR-104-03 | Non-Admin POST/PATCH/DELETE | 403 |
| BR-104-04 | displayName trùng (ci) | 409 |
| BR-104-05 | DELETE khi `linkedUserId` set | 409; unlink trước (F-105) |
| BR-104-06 | GET đã login | Danh sách + trạng thái linked; không lộ PII thừa |

## Test cases

| ID | Mô tả | Input | Kỳ vọng |
|----|-------|-------|---------|
| TC-F104-01 | Role hợp lệ | Admin/Mod/User | accept |
| TC-F104-02 | Role sai | `Guest` | reject |
| TC-F104-03 | Duplicate name ci | `An` vs `an` | conflict |
| TC-F104-04 | toRosterDto linked | linkedUserId set | linked=true |
| TC-F104-05 | requireAdmin non-Admin | role `""` | 403 |
| TC-F104-06 | Service create | Admin payload | person + role |
| TC-F104-07 | Service delete linked | linkedUserId set | 409 |

Automated: `server/test/roster*.test.js`.

## Definition of Done

- [x] Spec / design / plan
- [x] Schema + API + UI
- [x] Test map TC-F104-*
- [x] INDEX cập nhật
