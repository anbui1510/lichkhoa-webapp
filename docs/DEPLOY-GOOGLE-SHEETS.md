# Deploy: Lịch khoa + Google Sheet (F-304)

Mỗi **khoa** = **một Google Spreadsheet** (admin giữ file). Web app đọc/ghi qua **Apps Script Web App**. Phân quyền tab theo **NhanSu**, không dùng share Drive làm RBAC chính.

## 1. Sheet mẫu

1. Tạo Spreadsheet mới hoặc copy file mẫu (sau khi team publish ID mẫu).
2. Tạo đủ tab: `_meta`, `NhanSu`, `Task`, `LichTuan`, `LichThang`, `LichNghi`, `LichHoc`, `Dashboard`.
3. Dán header hàng 1 theo [design F-304](./specs/features/F-304-google-sheets-backend/design.md).
4. Tab `_meta` (cột A/B): `schemaVersion` = `1`, `activeDeptId`, `deptName`, `deptCode`, `updatedAt`.
5. Điền **NhanSu**: mỗi dòng một bác sĩ, cột `loginEmail` = email Google đăng nhập app, `accessRole` = `admin` hoặc `member`, các cột `access_*` = `none|view|edit`.

Script [`google-apps-script/Code.gs`](../google-apps-script/Code.gs) tự tạo tab thiếu khi gọi lần đầu.

## 2. Apps Script

1. Mở Sheet → **Extensions → Apps Script**.
2. Dán nội dung `google-apps-script/Code.gs` (và `appsscript.json` nếu dùng clasp).
3. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** (hoặc domain bệnh viện)
4. Copy **Web app URL** → env frontend `VITE_SHEET_BRIDGE_URL`.

## 3. Google Cloud OAuth (Web)

1. [Google Cloud Console](https://console.cloud.google.com/) → OAuth Client ID **Web**.
2. Authorized JavaScript origins: URL host frontend (vd. `http://localhost:5173`, domain production).
3. Client ID → `GOOGLE_CLIENT_ID` (server) và/hoặc `VITE_GOOGLE_CLIENT_ID` nếu dùng GIS trực tiếp.

Đăng nhập Google trên app gửi **ID token** lên bridge (verify qua Google tokeninfo).

## 4. Frontend

```bash
VITE_DATA_BACKEND=sheet \
VITE_SHEET_BRIDGE_URL=https://script.google.com/macros/s/XXXX/exec \
npm run build
```

Host thư mục `dist/` — khuyến nghị [Cloudflare Pages](./DEPLOY-CLOUDFLARE-PAGES.md) (**Deploy command để trống**). **Không cần** Supabase/Render cho sync lịch.

## 5. Vận hành khoa

1. Admin copy Sheet mẫu → điền **NhanSu** (email + quyền).
2. Cấp link web + (tuỳ chọn) `?sheet=<spreadsheetId>`.
3. Nhân viên: đăng nhập Google → **Kết nối sổ** (dán link Sheet) lần đầu.
4. Sửa lịch trên app → tự ghi tab `LichTuan` / `LichThang` / …

## 6. Kiểm tra

1. `GET` URL bridge → `{ ok: true }`
2. POST `{ action: "getProfile", spreadsheetId, idToken }` với user có trong NhanSu → 200
3. Email không trong NhanSu → 403

## So với F-303

| | F-304 Sheet | F-303 Supabase |
|---|-------------|----------------|
| Env | `VITE_DATA_BACKEND=sheet` | `VITE_DATA_BACKEND=api` |
| Dữ liệu | Tab Sheet khoa | Postgres |
