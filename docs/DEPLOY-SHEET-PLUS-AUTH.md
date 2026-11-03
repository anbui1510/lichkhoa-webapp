# Deploy kiến trúc A: Lịch trên Sheet + API chỉ cho đăng nhập (F-304 + F-101)

Mô hình khuyến nghị khi khoa **giữ dữ liệu lịch trên Google Sheet** nhưng vẫn cần **Đăng nhập Google** trên domain production (Cloudflare Pages).

| Thành phần | Vai trò | Dữ liệu lịch? |
|------------|---------|----------------|
| **Cloudflare Pages** | Host SPA `dist/` | Không — chỉ UI |
| **Google Sheet + Apps Script** | Sync lịch, RBAC tab **NhanSu** | **Có — nguồn chính** |
| **Render (folder `server/`)** | JWT, Google OAuth config, profile (tuỳ chọn) | **Không** — không dùng `GET/PUT /api/schedule-store` khi `VITE_DATA_BACKEND=sheet` |
| **Supabase Postgres** | Bảng user Prisma cho API | **Không** — không chứa lịch tuần/tháng |

Supabase **không thay Sheet**; chỉ để API Node khởi động (`prisma db push`) và lưu tài khoản đăng nhập.

Chi tiết Sheet: [DEPLOY-GOOGLE-SHEETS.md](./DEPLOY-GOOGLE-SHEETS.md). Frontend: [DEPLOY-CLOUDFLARE-PAGES.md](./DEPLOY-CLOUDFLARE-PAGES.md).

---

## 1. Google Cloud — OAuth Web

1. [Google Cloud Console](https://console.cloud.google.com/) → **Credentials** → OAuth 2.0 Client ID loại **Web application**.
2. **Authorized JavaScript origins** (không có `/` cuối):
   - `http://localhost:5173` (dev)
   - `https://lichkhoa-webapp.pages.dev` (hoặc domain production của bạn)
3. Copy **Client ID** (`….apps.googleusercontent.com`).

Client ID đặt trên **Render** (`GOOGLE_CLIENT_ID`), **không** đặt trên Cloudflare Pages (Vite không đọc biến không prefix `VITE_`).

---

## 2. Supabase — Postgres cho API

1. Project Supabase → **Connect** → URI (khuyến nghị **Session pooler**, IPv4).
2. Mật khẩu có ký tự đặc biệt → [URL-encode](https://developer.mozilla.org/en-US/docs/Glossary/Percent-encoding).
3. Chuỗi phải bắt đầu `postgresql://` hoặc `postgres://`.

Ví dụ pooler (thay `PASSWORD`, `REGION`):

```text
postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres?sslmode=require
```

---

## 3. Render — Web Service `server/`

Tạo **Web Service** (hoặc blueprint [`render.yaml`](../render.yaml) ở root repo).

| Mục | Giá trị |
|-----|---------|
| **Root Directory** | `server` |
| **Build Command** | `npm install && npx prisma generate` |
| **Start Command** | `npx prisma db push && npm start` |
| **Health Check Path** | `/api/health` |

**Environment variables** (Render → Environment):

| Key | Value |
|-----|--------|
| `DATABASE_URL` | URI Supabase (bước 2) |
| `JWT_SECRET` | Chuỗi dài ngẫu nhiên |
| `JWT_EXPIRES_IN` | `7d` (tuỳ chọn) |
| `CLIENT_ORIGIN` | `https://lichkhoa-webapp.pages.dev` |
| `GOOGLE_CLIENT_ID` | Client ID bước 1 |

Sau deploy **Live**, kiểm tra:

```text
GET https://YOUR-SERVICE.onrender.com/api/health
```

Lần đầu (tuỳ chọn seed admin email/password):

```bash
cd server && npm run db:seed
# admin@lichkhoa.local / admin123
```

---

## 4. Cloudflare Pages — Production

Branch production: **`main`**. Build: `npm run build`, output **`dist`**, **Deploy command trống**.

**Environment variables (Production)** — chỉ biến `VITE_*` + URL API:

| Key | Value |
|-----|--------|
| `VITE_DATA_BACKEND` | `sheet` |
| `VITE_SHEET_BRIDGE_URL` | URL Web App Apps Script |
| `VITE_API_BASE` | `https://YOUR-SERVICE.onrender.com/api` |

**Không** đặt trên Pages (vô dụng hoặc sai chỗ):

- `GOOGLE_CLIENT_ID` → Render
- `CLIENT_ORIGIN` → Render
- `DATABASE_URL` → Render

Mỗi lần đổi `VITE_*` → **Retry deployment**.

---

## 5. Sheet + Apps Script (lịch khoa)

Làm theo [DEPLOY-GOOGLE-SHEETS.md](./DEPLOY-GOOGLE-SHEETS.md) §1–2: tab **NhanSu**, deploy bridge, URL → `VITE_SHEET_BRIDGE_URL`.

---

## 6. Kiểm tra end-to-end

1. Pages URL → nút **Đăng nhập bằng Google** (popup GIS, không chỉ hint).
2. Email có trong tab **NhanSu** → **Kết nối sổ** → sửa lịch → tab `LichTuan` / `LichThang` trên Sheet đổi.
3. `GET /api/health` OK; app **không** cần bật `VITE_DATA_BACKEND=api`.

---

## Lỗi thường gặp

| Triệu chứng | Nguyên nhân |
|-------------|-------------|
| Render fail `P1012` / URL must start with `postgresql://` | Thiếu hoặc sai `DATABASE_URL` trên Render |
| Start Command lỗi **Required** | Dán nhầm `server/ $ …` — chỉ ghi lệnh thuần |
| Google không mở popup trên Pages | Thiếu `VITE_API_BASE` hoặc chưa Retry build; thiếu `GOOGLE_CLIENT_ID` / origins trên Google Cloud |
| `GOOGLE_CLIENT_ID` trên Cloudflare không có tác dụng | Chuyển sang Render; thêm `VITE_API_BASE` |
