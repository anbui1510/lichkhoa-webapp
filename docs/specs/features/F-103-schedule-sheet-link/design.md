# Design — F-103: Liên kết Spreadsheet SoT

## Tổng quan

```text
Admin (Cài đặt → Tùy chọn)
  → PUT /api/schedule/config { spreadsheetIdOrUrl }
  → authMiddleware + requireAdmin
  → parseSpreadsheetId (400 nếu sai)
  → pingSpreadsheetMetadata (skip nếu thiếu credentials; 422 nếu fail)
  → upsert DeptScheduleConfig singleton
  → { config: linked… }

User đã login
  → GET /api/schedule/config → spreadsheetId | null (không crash UI)
```

## Thành phần

| Layer | File / module | Trách nhiệm |
|-------|---------------|-------------|
| Schema | `server/prisma/schema.prisma` | `DeptScheduleConfig` |
| Parse | `server/src/services/spreadsheetId.js` | Format ID/URL |
| Ping | `server/src/services/sheetsMetadataPing.js` | Q2=C optional metadata |
| Service | `server/src/services/scheduleConfigService.js` | get/save |
| Gate | `server/src/middlewares/requireAdmin.js` | 403 non-Admin |
| Routes | `server/src/routes/scheduleRoutes.js` | `/api/schedule/config` |
| UI | `SheetLinkSettings.jsx` + `AccountPage` | Form + banner |
| Client API | `accountApi.js` / `useAccount.js` | get/put + state |

## Luồng dữ liệu

1. Client gửi URL hoặc ID.
2. Server parse → canonical `spreadsheetId`.
3. Nếu có `GOOGLE_SHEETS_*` → GET Sheets API metadata; fail → không ghi DB.
4. Upsert singleton `id=default`.
5. FE hiển thị linked / verified; banner khi `linked=false`.

## Mô hình dữ liệu

- `DeptScheduleConfig`: `id` (default), `spreadsheetId`, `title`, `verifiedAt`, `updatedById`, timestamps.
- Prisma chỉ lưu **tham chiếu**; SoT lưới lịch vẫn là Google Sheet (Epic 2).

## Lỗi & edge cases

| Tình huống | Xử lý |
|------------|--------|
| Format sai | 400 tiếng Việt |
| Ping fail (có credentials) | 422; không lưu |
| Không credentials | Lưu; verified=false |
| Non-Admin | 403 |
| Chưa login | 401 |
| Chưa liên kết | GET null; UI hint |

## Bảo mật / quyền

- Authorize Admin trên server (`User.role === 'Admin'`).
- Browser không giữ service-account / Sheet secret.
- Credentials chỉ trên server env.
