# Implementation Plan — F-104: Roster people

**Spec:** [spec.md](./spec.md) · **Design:** [design.md](./design.md)

## Trạng thái tổng

- [x] Spec approved
- [x] Design reviewed
- [x] Implementation
- [x] Tests (TC-F104-*)
- [x] Manual smoke

## Tasks (theo thứ tự)

| # | Task | File dự kiến | Done |
|---|------|--------------|------|
| 1 | Prisma RosterPerson + migration | `schema.prisma`, migrations | [x] |
| 2 | Service + validator + routes | `rosterService`, `rosterRoutes` | [x] |
| 3 | UI Admin panel | `RosterAdminPanel.jsx` | [x] |
| 4 | Tests matrix | `server/test/roster*.test.js` | [x] |
| 5 | INDEX | `docs/specs/INDEX.md` | [x] |

## Ghi chú triển khai

- `linkedUserId` null trong 1.3; F-105 set khi link.
- Không đụng scheduler / Handsontable / F-103 core.

## Smoke test thủ công

1. Admin login → Tùy chọn → thêm tên + role User.
2. GET list thấy mục; Mod thử POST → 403.
