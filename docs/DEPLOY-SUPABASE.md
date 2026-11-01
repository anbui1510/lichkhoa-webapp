# Deploy: API Lịch khoa + Postgres Supabase

Mobile và desktop dùng **cùng một SPA + cùng API**. Supabase chỉ cung cấp **Postgres** (không thay JWT login hiện có).

## 1. Tạo project Supabase (free)

1. Vào [https://supabase.com](https://supabase.com) → New project (region gần VN: `ap-southeast-1` nếu có).
2. **Settings → Database → Connection string → URI**.
3. Copy URI, thay `[YOUR-PASSWORD]`.
4. Với Prisma, ưu tiên:
   - **Direct connection** (port `5432`) khi chạy `prisma db push` / migrate, hoặc
   - **Session mode** pooler nếu direct bị firewall.

## 2. Cấu hình API local

```bash
cd server
cp .env.example .env
# Sửa DATABASE_URL = URI Supabase
# Sửa JWT_SECRET = chuỗi dài ngẫu nhiên

npm run setup
# = prisma generate + db push + seed admin@lichkhoa.local / admin123

npm run dev
```

Frontend (terminal khác):

```bash
npm run dev
# hoặc VITE_API_BASE=https://YOUR-API.onrender.com/api npm run build
```

## 3. Deploy API (Render / Railway — chọn 1)

Supabase **không** chạy Express giúp bạn. Host riêng folder `server/`:

| Host | Gợi ý |
|------|--------|
| **Render** | Dùng blueprint `render.yaml` ở root repo, hoặc Web Service root `server`, build `npm install && npx prisma generate`, start `npx prisma db push && npm start` |
| **Railway** | New service từ repo, root `server`, cùng lệnh build/start như trên |

Env bắt buộc trên host API:

- `DATABASE_URL` (Supabase URI)
- `JWT_SECRET`
- `CLIENT_ORIGIN` = URL frontend (Cloudflare Pages / Vercel / tunnel…)
- `PORT` (host thường tự set)

Lần đầu sau khi API lên: chạy seed (shell Render/Railway hoặc máy local trỏ cùng `DATABASE_URL`):

```bash
cd server && npm run db:seed
```

## 4. Frontend production

Build static `dist/`, trỏ `VITE_API_BASE` tới API public, ví dụ:

```bash
VITE_API_BASE=https://lichkhoa-api.onrender.com/api npm run build
```

Cùng URL đó mở trên điện thoại và máy tính → login cùng account → lịch sync (F-303).

## 5. Kiểm tra nhanh

1. `GET https://YOUR-API/api/health` → `{ ok: true }`
2. Login `admin@lichkhoa.local` / `admin123` (sau seed)
3. Sửa ô lịch → F5 hoặc mở điện thoại cùng user → thấy thay đổi

## Lưu ý free tier

- Supabase free: project pause nếu lâu không dùng — wake lại trên dashboard.
- Render free: API có thể sleep → request đầu chậm.
- Chưa login → app vẫn chạy offline bằng `localStorage` (như trước).
