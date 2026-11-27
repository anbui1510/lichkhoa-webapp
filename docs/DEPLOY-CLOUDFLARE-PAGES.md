# Deploy frontend lên Cloudflare Pages (F-304 / F-305)

App Lịch khoa là **SPA tĩnh** (Vite → `dist/`). **Không** dùng `wrangler deploy` / Workers.

## Mô hình khuyến nghị: **một URL, nhiều khoa**

| Ai | Việc |
|----|------|
| **IT (một lần)** | Pages + **3 biến** `VITE_*` (sheet + bridge + Google OAuth) |
| **Admin từng khoa** | Vào URL chung → **Đăng nhập Google** → **Tài khoản → Lưu kết nối sổ** (link Spreadsheet) |
| **Nhân viên** | Cùng URL → Google (email có trên tab **NhanSu**) |

**Không** bắt buộc `VITE_TENANT_LABEL`, `VITE_DEFAULT_SPREADSHEET_ID`, hay tạo project Cloudflare mới cho mỗi khoa.  
Các biến tenant chỉ là **tuỳ chọn** (gán sẵn tên khoa / Sheet khi mở link) — xem [DEPLOY-MULTI-KHOA.md](./DEPLOY-MULTI-KHOA.md).

Mẫu env tối thiểu: [templates/cloudflare-env-minimal.example.env](./templates/cloudflare-env-minimal.example.env).

---

## 1. Tạo project đúng loại

1. **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Repo: `anbui1510/lichkhoa-webapp`
3. Branch: `main` (hoặc branch preview).

## 2. Build settings (quan trọng)

| Mục | Giá trị |
|-----|---------|
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Deploy command** | **Để trống / None** |

Lỗi thường gặp: build **Success** rồi **Deploying** fail `Error parsing file: vite.config.js` → **Deploy command** đang là Wrangler.

## 3. Environment variables — **bắt buộc** (Production + Preview)

| Biến | Mô tả |
|------|--------|
| `VITE_DATA_BACKEND` | `sheet` |
| `VITE_SHEET_BRIDGE_URL` | URL Web App [Apps Script](./DEPLOY-GOOGLE-SHEETS.md) (một URL dùng cho mọi khoa) |
| `VITE_GOOGLE_CLIENT_ID` | OAuth Client ID Web — thêm **Authorized JavaScript origins** cho URL Pages (production + preview) |

Sau khi đổi `VITE_*` → **Retry deployment**.

### Tuỳ chọn (không cần cho đa khoa cơ bản)

| Biến | Khi nào dùng |
|------|----------------|
| `VITE_API_BASE` | Tuỳ chọn — email/mật khẩu qua Render. **Google + Sheet không cần** (GIS + bridge). Không set → POST `/api` = **405** |
| `VITE_TENANT_*`, `VITE_DEFAULT_SPREADSHEET_ID`, `VITE_TENANT_REGISTRY` | Pilot URL riêng / gán sẵn Sheet — [templates/cloudflare-env-khoa.example.env](./templates/cloudflare-env-khoa.example.env) |

**Lưu ý:** `admin@lichkhoa.local` / `admin123` chỉ có sau `npm run api:setup` trên API. Pages tĩnh không seed user.

## 4. Onboarding một khoa mới (trong app, không trên Cloudflare)

1. Tạo / copy Google Spreadsheet (tab theo [F-304](./specs/features/F-304-google-sheets-backend/design.md)).
2. Admin: **Đăng nhập Google** (không dùng **Vào xem trước** nếu cần đồng bộ).
3. **Tài khoản → Tùy chọn → Sổ lịch Google Sheet** → dán link → **Lưu kết nối sổ**.
4. Nếu **NhanSu** trống → làm **Thiết lập khoa** (bootstrap).
5. **Quản lý BS** — thêm NV + `loginEmail` (Gmail).

Link trực tiếp (tuỳ chọn): `https://<app>.pages.dev/?sheet=<spreadsheetId>`.

## 5. Đăng nhập trên Pages

- **Google** — đồng bộ Sheet qua bridge (mặc định production).
- **Vào xem trước** — chỉ khi **không** set `VITE_API_BASE`: vào app với dữ liệu local, **không** gọi bridge.

## 6. SPA routing

[`public/_redirects`](../public/_redirects) (`/* /index.html 200`) copy vào `dist` khi build.

## 7. Kiểm tra

1. Mở `https://<project>.pages.dev` — app hiển thị, không 404.
2. Google login → Lưu sổ → **Đồng bộ từ Sheet** (navbar) hoặc chờ pull ~45s.
3. Bridge: GET URL bridge → `{ ok: true, service: "lichkhoa-sheet-bridge" }` (xem [DEPLOY-GOOGLE-SHEETS.md](./DEPLOY-GOOGLE-SHEETS.md)).

Bridge + Apps Script: [DEPLOY-GOOGLE-SHEETS.md](./DEPLOY-GOOGLE-SHEETS.md) · **Thêm khoa (admin, không code):** [SETUP-KHOA-MOI.md](./SETUP-KHOA-MOI.md) · Nhiều URL: [DEPLOY-MULTI-KHOA.md](./DEPLOY-MULTI-KHOA.md).