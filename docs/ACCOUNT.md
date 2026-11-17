# Tài khoản cá nhân / Cài đặt (Profile & Settings)

> Đặc tả SDD: [F-101-auth-login](./specs/features/F-101-auth-login/spec.md) (login mật khẩu), [F-102-auth-google-bootstrap](./specs/features/F-102-auth-google-bootstrap/spec.md) (Google + bootstrap Admin). Feature API khác: bổ sung thư mục `docs/specs/features/` theo [SDD/README.md](./SDD/README.md).

Mô hình kết hợp: **UI React** + **API Node/Express** + **Prisma (SQLite mặc định, Postgres khi deploy)** + **JWT** + **Google Identity Services** + **avatar (disk hoặc Cloudinary)** + **đổi mật khẩu**.

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

### Google bootstrap Admin (F-102)

- Env `BOOTSTRAP_ADMIN_EMAILS` (CSV): email được phép nhận/giữ `role=Admin` khi khoa đã có Admin.
- Khi chưa có user `role=Admin`: lần Google login đầu được gán Admin (first-user), kể cả ngoài allowlist.
- Ngoài policy → HTTP 403 `{ error }` tiếng Việt.
- Profile / JWT có field `role` (`"Admin"` hoặc `""`).

Header: `Authorization: Bearer <token>`

## Avatar

- Mặc định: lưu vào `public/uploads`, URL `/uploads/...`
- Cloudinary: set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` trong `server/.env`

## PostgreSQL (production)

Trong `server/prisma/schema.prisma` đổi:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

`DATABASE_URL=postgresql://user:pass@host:5432/lichkhoa`

## Offline fallback

Nếu chưa chạy API hoặc chưa đăng nhập, FE vẫn lưu hồ sơ/cài đặt tạm trên `localStorage` (`LICHKHOA_LOCAL_PROFILE`, `LICHKHOA_LOCAL_SETTINGS`). Đổi mật khẩu thật **bắt buộc** có API.
