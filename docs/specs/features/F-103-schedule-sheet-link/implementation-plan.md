# Implementation Plan — F-103: Liên kết Spreadsheet SoT

**Spec:** [spec.md](./spec.md) · **Design:** [design.md](./design.md)

## Trạng thái tổng

- [x] Spec approved
- [x] Design reviewed
- [x] Implementation
- [x] Tests (TC-F103-01..11)
- [ ] Manual smoke (Admin lưu Sheet thật trên dev)

## Tasks (theo thứ tự)

| # | Task | File dự kiến | Done |
|---|------|--------------|------|
| 1 | Model `DeptScheduleConfig` + migration | `schema.prisma`, migrations | [x] |
| 2 | Parse ID/URL + optional ping | `spreadsheetId.js`, `sheetsMetadataPing.js` | [x] |
| 3 | Service + routes GET/PUT | `scheduleConfigService.js`, `scheduleRoutes.js` | [x] |
| 4 | requireAdmin | `requireAdmin.js` | [x] |
| 5 | Account UI + hook/API | `SheetLinkSettings.jsx`, `AccountPage`, `useAccount`, `accountApi` | [x] |
| 6 | Tests matrix | `server/test/*F103*` | [x] |
| 7 | INDEX + ACCOUNT + .env.example | docs / env | [x] |

## Ghi chú triển khai

- Endpoint ổn định cho Epic 2: `GET/PUT /api/schedule/config`.
- Dev DB: `prisma db push` hoặc migrate SQL mới.
- Ping optional — không bắt buộc credentials để “xong” 1.2.

## Smoke test thủ công

1. Admin đăng nhập → Cài đặt → Tùy chọn → dán URL Sheet hợp lệ → Lưu → thấy Đã liên kết; reload vẫn còn.
2. User/non-Admin gọi PUT → 403.
3. DB chưa có config → mở app/Cài đặt → banner nhắc, không crash.
