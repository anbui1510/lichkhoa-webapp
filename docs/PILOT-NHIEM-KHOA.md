# Pilot khoa 2 — Nhiễm (F-305)

Checklist vận hành sau khi API Render đã deploy **CORS đa origin** (`CLIENT_ORIGIN_SUFFIX=-lichkhoa-webapp.pages.dev` hoặc origin trong `CLIENT_ORIGINS`). Chi tiết chung: [DEPLOY-MULTI-KHOA.md](./DEPLOY-MULTI-KHOA.md).

## URL mục tiêu

| Mục | Giá trị |
|-----|---------|
| Cloudflare project | `nhiem-lichkhoa-webapp` |
| Production URL | `https://nhiem-lichkhoa-webapp.pages.dev` |
| Tenant slug | `nhiem` |
| Label gợi ý | `Khoa Nhiễm` |

Quy ước slug: chữ thường, không dấu, dấu gạch nếu cần (`nhiem`, `timmach`).

## Trước khi tạo Pages

1. **Render API** — env production:
   - `CLIENT_ORIGIN_SUFFIX=-lichkhoa-webapp.pages.dev`  
     (hoặc thêm `https://nhiem-lichkhoa-webapp.pages.dev` vào `CLIENT_ORIGINS`)
   - Redeploy service sau khi đổi env.
2. **Google Cloud Console** — OAuth client Web (cùng Client ID app đang dùng):
   - **Authorized JavaScript origins:** thêm `https://nhiem-lichkhoa-webapp.pages.dev`
   - Giữ origin Tim mạch nếu vẫn dùng: `https://lichkhoa-webapp.pages.dev`

## Google Sheet + Apps Script

1. Tạo Google Sheet mới cho khoa Nhiễm.
2. **Extensions → Apps Script** — dán `google-apps-script/Code.gs` từ repo `main`.
3. **Deploy → New deployment → Web app** (Execute as: deployer, Anyone with link hoặc Anyone).
4. Lưu **Web App URL** → `VITE_SHEET_BRIDGE_URL`.
5. Lưu **Spreadsheet ID** (từ URL Sheet) → `VITE_DEFAULT_SPREADSHEET_ID`.

**Bridge chung vs riêng:** Nếu một tài khoản deploy sở hữu mọi Sheet khoa, có thể dùng **cùng** Web App URL cho Tim và Nhiễm (script `openById(spreadsheetId)`). Nếu Sheet thuộc tài khoản khác, mỗi khoa cần deployment riêng trong file Sheet đó.

## Cloudflare Pages

1. **Create project** → Connect Git → repo `lichkhoa-webapp`, branch **`main`**.
2. Project name: **`nhiem-lichkhoa-webapp`**.
3. Build: `npm run build`, output **`dist`**, deploy command để trống (Pages build only).
4. **Production environment variables** (mẫu: [templates/cloudflare-env-khoa.example.env](./templates/cloudflare-env-khoa.example.env)):

| Biến | Ví dụ Nhiễm |
|------|-------------|
| `VITE_DATA_BACKEND` | `sheet` |
| `VITE_SHEET_BRIDGE_URL` | URL Web App (khoa hoặc chung) |
| `VITE_API_BASE` | `https://lichkhoa-webapp.onrender.com/api` |
| `VITE_TENANT_SLUG` | `nhiem` |
| `VITE_TENANT_LABEL` | `Khoa Nhiễm` |
| `VITE_DEFAULT_SPREADSHEET_ID` | ID Sheet Nhiễm |

5. Deploy; giao admin **URL production** (không link preview/hash deploy).

## Admin khoa Nhiễm (trên URL trên)

1. **Đăng nhập Google** (email admin đã có quyền Sheet).
2. Sheet **NhanSu** trống → **Thiết lập khoa mới** (bootstrap F-304).
3. **Quản lý BS** — điền `loginEmail` Gmail từng nhân viên + `deptId` nếu có nhiều phòng.
4. Lập lịch; gửi cùng URL cho NV.

## Kiểm tra

- Mở DevTools → Network: login Google không lỗi CORS tới `…/api/auth/…`.
- Sheet đồng bộ sau chỉnh sửa lịch / nhân sự.
- NV đăng nhập đúng Gmail khớp `loginEmail` → không 403 NhanSu.

## Tim mạch (khoa 1)

Tim có thể giữ URL cũ `https://lichkhoa-webapp.pages.dev` (không bắt buộc đổi project thành `timmach-lichkhoa-webapp`). Suffix CORS vẫn cho phép hostname không có slug prefix khi khớp `-lichkhoa-webapp.pages.dev`.
