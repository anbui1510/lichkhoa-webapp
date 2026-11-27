# Tài khoản cá nhân / Cài đặt (Profile & Settings)

> Đặc tả SDD: [F-101-auth-login](./specs/features/F-101-auth-login/spec.md) (login mật khẩu), [F-102-auth-google-bootstrap](./specs/features/F-102-auth-google-bootstrap/spec.md) (Google + bootstrap Admin), [F-102-login-gate](./specs/features/F-102-login-gate/spec.md) (màn hình đăng nhập trước khi vào app), [F-103-schedule-sheet-link](./specs/features/F-103-schedule-sheet-link/spec.md) (liên kết Spreadsheet SoT). Feature API khác: bổ sung thư mục `docs/specs/features/` theo [SDD/README.md](./SDD/README.md).

Mô hình kết hợp: **UI React** + **API Node/Express** + **Prisma (Postgres / Supabase)** + **JWT** + **Google Identity Services** + **avatar (disk hoặc Cloudinary)** + **đổi mật khẩu** + **sync lịch**.

**F-102 login-gate:** Lần đầu mở link (chưa phiên hợp lệ) chỉ thấy cổng đăng nhập; sau khi login mới vào bảng lịch / Navbar.

Sync lịch:
- **F-304** [DEPLOY-GOOGLE-SHEETS.md](./DEPLOY-GOOGLE-SHEETS.md) — mặc định `VITE_DATA_BACKEND=sheet` (Apps Script bridge, multi-khoa)
- **F-210** `/api/schedule/data` — khi `VITE_DATA_BACKEND=api` và Admin đã liên kết Spreadsheet SoT (service account + LWW revision)
- **F-303** [DEPLOY-SUPABASE.md](./DEPLOY-SUPABASE.md) — `VITE_DATA_BACKEND=api` khi chưa link SoT (Postgres schedule-store)

Đăng nhập Google lưu **ID token** (session) để gọi Sheet bridge (F-304); email phải khớp cột `loginEmail` / `email` trên tab **NhanSu**.

**F-304:** Admin đổi link sổ lưu lịch tại **Tài khoản → Tùy chọn → Sổ lịch Google Sheet** (member chỉ xem).

## Chạy local

```bash
# Terminal 1 — API
npm run api:setup
npm run dev:api

# Terminal 2 — Frontend
npm run dev
```

- Frontend: http://localhost:5173 (proxy `/api` → `:4000`)
- API health: http://localhost:4000/api/health
- User seed: `admin@lichkhoa.local` / `admin123`

**Cloudflare Pages:** một URL nhiều khoa — admin **Lưu kết nối sổ** (F-304), không cần env `VITE_TENANT_*` / `VITE_DEFAULT_SPREADSHEET_ID` theo khoa. Xem [DEPLOY-CLOUDFLARE-PAGES.md](./DEPLOY-CLOUDFLARE-PAGES.md).

Preview không chạy Express → POST `/api/auth/login` → **405** nếu không `VITE_API_BASE`.
Trên Pages (`VITE_DATA_BACKEND=sheet`):
- **Đăng nhập Google** — đồng bộ Sheet (IT: `VITE_SHEET_BRIDGE_URL` + `VITE_GOOGLE_CLIENT_ID` một lần).
- **Vào xem trước** — chỉ khi không API: vào app, dữ liệu local, không sync.

## API

| Method | Path | Mô tả |
|--------|------|--------|
| POST | `/api/auth/register` | Đăng ký |
| POST | `/api/auth/login` | Đăng nhập mật khẩu → JWT |
| GET | `/api/auth/google/config` | `{ clientId }` cho GSI |
| POST | `/api/auth/google` | Đăng nhập Google (`credential`) → JWT; bootstrap Admin theo F-102 |
| GET | `/api/auth/me` | User hiện tại |
| GET/PUT | `/api/profile` | Hồ sơ |
| POST | `/api/profile/avatar` | Upload avatar (`multipart` field `avatar`) |
| GET/PUT | `/api/settings` | Cài đặt |
| PUT | `/api/settings/password` | Đổi mật khẩu |
| PUT | `/api/settings/security` | 2FA / privacy flags |
| GET | `/api/settings/notifications` | Cờ thông báo |
| GET | `/api/schedule/config` | Trạng thái liên kết Spreadsheet SoT (+ `sheetsCredentialsConfigured`, `syncReady`) |
| PUT | `/api/schedule/config` | Admin lưu ID/URL Spreadsheet (F-103) |
| GET | `/api/schedule/data` | Đọc payload lịch + `revision` từ Sheet SoT (F-210) |
| PUT | `/api/schedule/data` | Admin\|Mod ghi payload + `baseRevision` (LWW / `conflict`) |
| GET/PUT | `/api/schedule-store` | Snapshot lịch Postgres (F-303) |

### Google bootstrap Admin (F-102)

- Env `BOOTSTRAP_ADMIN_EMAILS` (CSV): email được phép nhận/giữ `role=Admin` khi khoa đã có Admin.
- Khi chưa có user `role=Admin`: lần Google login đầu được gán Admin (first-user), kể cả ngoài allowlist.
- Ngoài policy → HTTP 403 `{ error }` tiếng Việt.
- Profile / JWT có field `role` (`"Admin"` | `"Mod"` | `"User"` | `""`).

### Liên kết Spreadsheet SoT (F-103)

- Prisma `DeptScheduleConfig` (singleton) lưu `spreadsheetId` — không phải lưới lịch.
- Admin: Cài đặt → Tùy chọn → form ID/URL Google Spreadsheet (API backend).
- Optional ping khi lưu link: `GOOGLE_SHEETS_CLIENT_EMAIL` + `GOOGLE_SHEETS_PRIVATE_KEY`; thiếu credentials vẫn lưu sau format OK.
- Chưa liên kết → banner nhắc; app không crash.

### Đồng bộ lịch Sheet (F-210)

1. Tạo **Service Account** trên Google Cloud, bật **Google Sheets API**, tải JSON key.
2. Điền `GOOGLE_SHEETS_CLIENT_EMAIL` + `GOOGLE_SHEETS_PRIVATE_KEY` vào `server/.env` (xem `server/.env.example`).
3. **Share Spreadsheet** cho email service account với quyền **Editor** (cần để ghi lịch).
4. Admin lưu ID/URL Sheet trong Cài đặt → khi `syncReady: true` app GET/PUT `/api/schedule/data` (chỉ khi `VITE_DATA_BACKEND=api`).
5. Payload JSON được **chia nhiều ô** (chunk ~45k) trên tab `_smoothwork_data` để tránh giới hạn 50k/ô.
6. Conflict LWW: dialog “Nạp lại từ Sheet” / “Tiếp tục bản máy này”; Navbar hiện trạng thái sync.

Header: `Authorization: Bearer <token>`

## Avatar

- Mặc định: lưu vào `public/uploads`, URL `/uploads/...`
- Cloudinary: set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` trong `server/.env`

## PostgreSQL (Supabase)

Prisma đã dùng `provider = "postgresql"`. Set `DATABASE_URL` (URI từ Supabase) trong `server/.env` và trên host API. Chi tiết: [DEPLOY-SUPABASE.md](./DEPLOY-SUPABASE.md). Sync lịch: F-303 `GET/PUT /api/schedule-store` (khi chưa dùng F-210 SoT link).

## Offline fallback

Nếu chưa chạy API hoặc chưa đăng nhập, FE vẫn lưu hồ sơ/cài đặt tạm trên `localStorage` (`LICHKHOA_LOCAL_PROFILE`, `LICHKHOA_LOCAL_SETTINGS`). Đổi mật khẩu thật **bắt buộc** có API. Login-gate (F-102) chặn vào app khi chưa có phiên hợp lệ (JWT hoặc Google ID token khi sheet backend).
