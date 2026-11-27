# Catalog khoa (F-306)

## IT (một lần)

1. Tạo Google Sheet **danh mục bệnh viện** — tab **`KhoaCatalog`**, hàng 1:

   | slug | label | spreadsheetId | active |
   |------|-------|---------------|--------|

2. Mỗi khoa: **một dòng** (`active` = `yes`). Share catalog **Editor** cho Gmail deploy bridge.

3. Cloudflare → `VITE_HOSPITAL_CATALOG_SHEET_ID` = ID file catalog (Production + Preview).

4. Copy `google-apps-script/Code.gs` mới → deploy Web App phiên bản mới.

## Khi mở khoa mới

Chỉ thêm dòng trên `KhoaCatalog` — không đổi env Cloudflare.

## Nhân viên

Một URL → Google login → chọn khoa (nếu nhiều) hoặc vào thẳng (một khoa). Email phải có `loginEmail` trên tab **NhanSu** file khoa đó.