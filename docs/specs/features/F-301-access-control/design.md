# Design — F-301: Access Control

## API surface (pure functions)

| Hàm | Mục đích |
|-----|----------|
| `resolveActor(user, staffList)` | → `{ kind, staff, access }` |
| `findLinkedStaff(user, staffList)` | Match `loginEmail` hoặc `email` |
| `normalizeAccess(raw)` | Merge với `MEMBER_DEFAULT` |
| `canSee` / `canEdit` | Gate UI |
| `visibleNav` / `firstNav` | Navbar tabs |

## Link staff

Staff record fields: `loginEmail`, `email`, `accessRole`, `access` object per tab.

## UI

- `Navbar.jsx`: ẩn tab `none`
- Editors: check `canEdit` trước drag/drop, save

Không có check server-side cho lịch local — **giả định tin client**. Nếu sync server sau, spec mới bắt buộc authz API.
