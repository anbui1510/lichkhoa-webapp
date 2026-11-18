# Design — F-210: Proxy lịch Sheet SoT

## Tổng quan

```text
Client (App)
  boot → GET /api/schedule/data  ──┐
  save → PUT /api/schedule/data  ──┤
                                   ▼
              authMiddleware + (PUT: requireModOrAdmin)
                                   ▼
                         scheduleDataService
                                   ▼
              DeptScheduleConfig.spreadsheetId (F-103)
                                   ▼
         Google Sheets API (_smoothwork_data / _smoothwork_meta)
```

localStorage (`LICHKHOA_DATA_STORE_V1`) = cache only; status hiển thị trên Navbar.

## Thành phần

| Layer | File / module | Trách nhiệm |
|-------|---------------|-------------|
| Auth Sheets | `server/src/services/sheetsAuth.js` | credentials + RW scope |
| Service | `server/src/services/scheduleDataService.js` | ensure tabs, read/write, LWW |
| Gate | `server/src/middlewares/requireModOrAdmin.js` | 403 User |
| Validator | `scheduleDataValidator.js` | payload + baseRevision |
| Routes | `scheduleRoutes.js` | GET/PUT `/data` cạnh `/config` |
| Client sync | `src/services/scheduleSync.js` | boot / persist / status |
| UI | `App.jsx`, `Navbar.jsx` | wire + sync chip |
| Cache | `src/store/dbStore.js` | localStorage cache |

## Luồng dữ liệu

1. Admin liên kết Sheet (F-103) → có `spreadsheetId`.
2. User login → client GET data; nếu payload usable → apply + `live`.
3. Sheet trống (rev 0) → giữ cache, `need-sync`; PUT đầu tạo tabs.
4. Sửa lịch → debounce saveStore + PUT (Admin/Mod); trả `conflict` nếu base lệch (LWW vẫn ghi).
5. Offline → đọc cache; status `cache`/`stale`.

## Mô hình dữ liệu

### `_smoothwork_meta` (A:B)

| Key | Value |
|-----|-------|
| revision | int ≥ 0 |
| updatedAt | ISO string |
| updatedBy | User.id |

### `_smoothwork_data`

- `A1` = JSON string của payload store subset.

## Lỗi & edge cases

| Tình huống | Xử lý |
|------------|--------|
| Chưa link | 409 tiếng Việt |
| Thiếu credentials | 503 |
| User PUT | 403 |
| baseRevision lệch | 200 + conflict true |
| Sheet API 403/404 | 422 message rõ |
| Offline | cache + stale/cache |

## Bảo mật / quyền

- Chỉ server giữ service-account; browser không gọi Sheets trực tiếp.
- JWT bắt buộc; ghi chỉ Admin|Mod (`isFullAccessRole`).
- F-103 config contract không đổi.
