# Tài khoản cá nhân / Cài đặt (Profile & Settings)

> Đặc tả SDD: [F-101-auth-login](./specs/features/F-101-auth-login/spec.md) (login). Feature API khác: bổ sung thư mục `docs/specs/features/` theo [SDD/README.md](./SDD/README.md).

Mô hình kết hợp: **UI React** + **API Node/Express** + **Prisma (Postgres / Supabase)** + **JWT** + **avatar (disk hoặc Cloudinary)** + **đổi mật khẩu** + **sync lịch (F-303)**.

Deploy DB + API: xem [DEPLOY-SUPABASE.md](./DEPLOY-SUPABASE.md).

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

## API

| Method | Path | Mô tả |
|--------|------|--------|
| POST | `/api/auth/register` | Đăng ký |
| POST | `/api/auth/login` | Đăng nhập → JWT |
| GET | `/api/auth/me` | User hiện tại |
| GET/PUT | `/api/profile` | Hồ sơ |
| POST | `/api/profile/avatar` | Upload avatar (`multipart` field `avatar`) |
| GET/PUT | `/api/settings` | Cài đặt |
| PUT | `/api/settings/password` | Đổi mật khẩu |
| PUT | `/api/settings/security` | 2FA / privacy flags |
| GET | `/api/settings/notifications` | Cờ thông báo |

Header: `Authorization: Bearer <token>`

## Avatar

- Mặc định: lưu vào `public/uploads`, URL `/uploads/...`
- Cloudinary: set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` trong `server/.env`

## PostgreSQL (Supabase)

Prisma đã dùng `provider = "postgresql"`. Set `DATABASE_URL` (URI từ Supabase) trong `server/.env` và trên host API. Chi tiết: [DEPLOY-SUPABASE.md](./DEPLOY-SUPABASE.md). Sync lịch: F-303 `GET/PUT /api/schedule-store`.

## Offline fallback

Nếu chưa chạy API hoặc chưa đăng nhập, FE vẫn lưu hồ sơ/cài đặt tạm trên `localStorage` (`LICHKHOA_LOCAL_PROFILE`, `LICHKHOA_LOCAL_SETTINGS`). Đổi mật khẩu thật **bắt buộc** có API.
