# Deploy: API Lịch khoa + Postgres Supabase

Mobile và desktop dùng **cùng một SPA + cùng API**. Supabase chỉ cung cấp **Postgres** (không thay JWT login hiện có).

## 1. Project Supabase

Đã có project: **https://radescazwukbdfgqmepd.supabase.co** (`radescazwukbdfgqmepd`).

1. Dashboard → **Database → Settings** (hoặc nút **Connect**) → Connection string URI.
2. Copy URI, thay `[YOUR-PASSWORD]` — ký tự đặc biệt (`!`, `@`, `#`…) phải **URL-encode** (vd. `!` → `%21`).
3. Region project: **eu-west-1** (Ireland).
4. Hosts:
   - Direct (thường IPv6): `db.radescazwukbdfgqmepd.supabase.co:5432`
   - **Session pooler (IPv4, khuyến nghị cho Cloud Agent / nhiều host)**:  
     `postgresql://postgres.radescazwukbdfgqmepd:PASSWORD@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require`
5. Schema + seed đã chạy thành công trên project này (F-303 tables + `admin@lichkhoa.local`).

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
- **CORS nhiều khoa (&lt; 20 URL Pages):** `CLIENT_ORIGIN_SUFFIX=-lichkhoa-webapp.pages.dev` (khuyến nghị) hoặc `CLIENT_ORIGINS` (danh sách). Legacy: `CLIENT_ORIGIN` một URL.
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
