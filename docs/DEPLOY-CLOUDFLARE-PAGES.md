# Deploy frontend lên Cloudflare Pages (F-304)

App Lịch khoa là **SPA tĩnh** (Vite → `dist/`). **Không** dùng `wrangler deploy` / Workers.

## Tạo project đúng loại

1. **Workers & Pages** → **Create** → **Pages** → **Connect to Git** (không chọn “Create Worker”).
2. Repo: `anbui1510/lichkhoa-webapp`
3. Branch: `cursor/mobile-schedule-mode-8f61` (hoặc `main` nếu đã merge F-304).

## Build settings (quan trọng)

| Mục | Giá trị |
|-----|---------|
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Deploy command** | **Để trống / None** — xóa hết nếu đang là `npx wrangler deploy` |

Lỗi thường gặp: build **Success** rồi **Deploying** fail với `Error parsing file: vite.config.js` → do **Deploy command** sai (Wrangler coi `vite.config.js` là config Worker).

## Environment variables (Production)

| Biến | Ví dụ |
|------|--------|
| `VITE_DATA_BACKEND` | `sheet` |
| `VITE_SHEET_BRIDGE_URL` | URL Apps Script Web App |
| `VITE_API_BASE` | `https://YOUR-API.onrender.com/api` (bắt buộc nếu muốn email/mật khẩu; không set → Pages POST `/api` = **405**) |
| `GOOGLE_CLIENT_ID` | OAuth Web client (Google login trên Pages; thêm origin `*.pages.dev`) |

Sau khi đổi biến `VITE_*` → **Retry deployment**.

**Lưu ý seed:** `admin@lichkhoa.local` / `admin123` chỉ tồn tại sau `npm run api:setup` trên API (Postgres). Pages tĩnh không seed user.

## SPA routing

File [`public/_redirects`](../public/_redirects) (`/* /index.html 200`) được copy vào `dist` khi build.

## Kiểm tra

Mở URL `https://<project>.pages.dev` → thấy app Lịch khoa, không trang trắng 404.
