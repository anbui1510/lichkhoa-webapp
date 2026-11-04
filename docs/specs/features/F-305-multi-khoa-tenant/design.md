# F-305 — Design

## Env

| Biến | Mô tả |
|------|--------|
| `VITE_TENANT_SLUG` | Slug khoa (vd. `timmach`) — chế độ A |
| `VITE_TENANT_LABEL` | Tên hiển thị navbar |
| `VITE_DEFAULT_SPREADSHEET_ID` | Sheet mặc định (hoặc URL đủ parse) |
| `VITE_TENANT_DEPARTMENTS` | JSON `[{ id, name }]` — phòng/khoa con (tuỳ chọn) |
| `VITE_TENANT_REGISTRY` | JSON mảng tenant — chế độ B + hostname slug |

## Hostname

Pattern pages.dev: `^([a-z0-9-]+)-lichkhoa-webapp\.pages\.dev$` → slug group 1.

Registry entry khớp `slug` wins; else env đơn.

## Sheet ID priority

1. Query `?sheet=`
2. Tenant `spreadsheetId`
3. `localStorage` LICHKHOA_SHEET_ID

## NhanSu columns (mở rộng F-304)

Thêm `deptId`, `deptLabel` sau `position`.
