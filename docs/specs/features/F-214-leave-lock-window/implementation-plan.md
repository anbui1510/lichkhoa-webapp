# Implementation Plan — F-214: Cửa sổ khóa lịch nghỉ

**Spec:** [spec.md](./spec.md) · **Design:** [design.md](./design.md)

## Trạng thái tổng

- [x] Spec approved
- [x] Design reviewed
- [x] Implementation
- [x] Tests (TC-F214)
- [ ] Manual smoke (Sheet thật + 2 user)

## Tasks (theo thứ tự)

| # | Task | File dự kiến | Done |
|---|------|--------------|------|
| 1 | Logic + unit FE/server import | `src/logic/editWindows.js`, `leaveOwnership.js`, `tests/*.test.js` | [x] |
| 2 | Prisma fields + config service/API | `schema.prisma`, `scheduleConfigService`, routes, validators | [x] |
| 3 | requireScheduleWrite | `middlewares/requireScheduleWrite.js`, `scheduleRoutes.js` | [x] |
| 4 | Account UI + API client | `LockWindowSettings.jsx`, `useAccount`, `accountApi` | [x] |
| 5 | Gate App + SheetView banner | `App.jsx`, `SheetView.jsx` | [x] |
| 6 | INDEX + sdd:check + npm test | `docs/specs/INDEX.md` | [x] |

## Ghi chú triển khai

- Migration: `prisma db push` (dev) — thêm 2 cột nullable.
- Rollback: xóa cột / bỏ middleware → về F-210 Mod-only write.

## Smoke test thủ công

1. Admin set leaveLockAt tương lai → User sửa nghỉ của mình → Sheet revision tăng.
2. Set leaveLockAt quá khứ → User bị chặn; Mod vẫn sửa.
3. Hai tab ghi lệch revision → dialog conflict.
