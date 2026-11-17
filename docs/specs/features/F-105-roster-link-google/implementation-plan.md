# Implementation Plan — F-105: Roster link + Google pending

**Spec:** [spec.md](./spec.md) · **Design:** [design.md](./design.md)

## Trạng thái tổng

- [x] Spec approved
- [x] Design reviewed
- [x] Implementation
- [x] Tests (TC-F105-* + F-102 regression)
- [x] Manual smoke

## Tasks (theo thứ tự)

| # | Task | File dự kiến | Done |
|---|------|--------------|------|
| 1 | Nới Google policy pending | `adminBootstrap.js`, `userService.js` | [x] |
| 2 | link/unlink API | `rosterService`, routes | [x] |
| 3 | UI LinkRosterCard | account components | [x] |
| 4 | resolveActor Mod/User | `access.js` | [x] |
| 5 | Tests + F-102 update BR-102-03 | server/test | [x] |

## Ghi chú triển khai

- BR-102-03 (403 ngoài allowlist) superseded: cập nhật TC-F102-04 → pending allow.
- Giữ LinkStaffCard song song nếu App còn dùng local staff; ưu tiên roster khi pending.

## Smoke test thủ công

1. Có Admin → Google email mới → vào app role rỗng → liên kết tên User → member.
2. Tên đã link → 409.
3. Link Mod → full quyền lịch.
