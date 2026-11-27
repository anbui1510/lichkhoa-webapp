# F-306: Đăng nhập trung tâm — khám phá khoa theo email (catalog Sheet)

| Trường | Giá trị |
|--------|---------|
| Trạng thái | implemented |
| Phụ thuộc | F-304, F-305, F-102 |
| Module | web + Apps Script |

## Mục tiêu

**Một URL**, đăng nhập Google **một lần**, app tự liệt kê các khoa mà email có trong tab **NhanSu** — không bắt NV `?sheet=`, không `VITE_TENANT_REGISTRY` hàng trăm dòng trên Cloudflare.

IT chỉ thêm **một** biến `VITE_HOSPITAL_CATALOG_SHEET_ID` (file danh mục).

## Phạm vi

### In scope

- File **catalog** Google Sheet: tab `KhoaCatalog` (`slug`, `label`, `spreadsheetId`, `active`)
- Bridge `discoverKhoas` — quét catalog, kiểm tra `loginEmail` trên từng file khoa
- FE: sau login, gọi discover → 0 / 1 / nhiều khoa → banner hoặc picker; dropdown đổi khoa như F-305-10
- Pagination (`offset`, `limit`) cho catalog lớn

### Out of scope

- Tự đăng ký khoa mới lên catalog từ app
- Gộp nhiều khoa vào một Spreadsheet

## API bridge

| action | Body | Response |
|--------|------|----------|
| `discoverKhoas` | `{ catalogSpreadsheetId, idToken, offset?, limit? }` | `{ email, khoas[], nextOffset, catalogRows }` |

`khoas[]`: `{ slug, label, spreadsheetId, actorKind: admin\|member }`

## Ràng buộc

| ID | Điều kiện | Kết quả |
|----|-----------|---------|
| BR-306-01 | Có `VITE_HOSPITAL_CATALOG_SHEET_ID` | Ưu tiên discover khi chưa `?sheet=` / chưa localStorage |
| BR-306-02 | Discover = 1 khoa | Tự `setSpreadsheetConnection`, pull |
| BR-306-03 | Discover ≥ 2 | Dialog chọn khoa; navbar dropdown |
| BR-306-04 | Discover = 0 | Thông báo «Email chưa có trên khoa nào trong danh mục» |
| BR-306-05 | Catalog row `active` ≠ yes | Bỏ qua |
| BR-306-06 | NhanSu file khoa trống | Không liệt kê (chưa bootstrap) |
| BR-306-07 | `limit` mặc định 40, max 60 / request | FE gọi nối tiếp đến `nextOffset` null |

## Test cases

| ID | Mô tả | Kỳ vọng |
|----|-------|---------|
| TC-F306-01 | parse catalog rows | slug/id hợp lệ |
| TC-F306-02 | `hospitalCatalogSpreadsheetId()` env | ID hoặc rỗng |
| TC-F306-03 | merge registry discover + env | Dropdown đủ khoa |