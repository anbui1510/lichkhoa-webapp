# Deploy nhiều khoa (F-305)

Mỗi **khoa** (hoặc bệnh viện pilot) có URL riêng; **một Google Sheet / khoa** (F-304). Nhân viên dùng **cùng URL** — không dán link Sheet từng người.

Chi tiết Sheet + auth: [DEPLOY-SHEET-PLUS-AUTH.md](./DEPLOY-SHEET-PLUS-AUTH.md).

## Chế độ A — Một Cloudflare Pages project / khoa (khuyến nghị free)

1. Tạo project Pages tên **`{slug}-lichkhoa-webapp`** → URL `https://{slug}-lichkhoa-webapp.pages.dev`.
2. Cùng repo Git `main`, build `npm run build`, output `dist`.
3. **Production env** (ví dụ Tim mạch):

| Biến | Ví dụ |
|------|--------|
| `VITE_DATA_BACKEND` | `sheet` |
| `VITE_SHEET_BRIDGE_URL` | Apps Script Web App |
| `VITE_API_BASE` | `https://lichkhoa-webapp.onrender.com/api` |
| `VITE_TENANT_SLUG` | `timmach` |
| `VITE_TENANT_LABEL` | `Khoa Tim mạch` |
| `VITE_DEFAULT_SPREADSHEET_ID` | ID hoặc URL Sheet khoa |
| `VITE_TENANT_DEPARTMENTS` | (tuỳ chọn) `[{"id":"dept_tim_mach","name":"Tim mạch"}]` |

4. Cấp TK + NV **một URL** duy nhất của khoa.
5. TK: Google login → kết nối sổ (nếu chưa env Sheet) → **Thiết lập khoa** (Sheet NhanSu trống) → **Quản lý BS** (`loginEmail` Gmail từng NV) → lịch. App mới: 0 nhân sự + task mẫu chung; import JSON vẫn bootstrap lên Sheet được.

## Chế độ B — Một build, nhiều custom domain

Set `VITE_TENANT_REGISTRY` (JSON):

```json
[
  {
    "slug": "timmach",
    "label": "Khoa Tim mạch",
    "spreadsheetId": "1ABC…",
    "departments": [{ "id": "dept_tim_mach", "name": "Tim mạch" }]
  }
]
```

Hostname slug (vd. `timmach.benhvien.vn`) khớp entry `slug`.

## Nhân viên

- Cùng URL khoa → **Đăng nhập Google**.
- Email khớp cột **`loginEmail`** trên tab **NhanSu**.
- Có **`deptId`** → app tự chọn khoa/phòng (ẩn dropdown header).

## Admin

- **Tài khoản → Tùy chọn → Sổ lịch Google Sheet** — đổi file lưu trữ (F-304).
- **Quản lý BS** — gán khoa/phòng + `loginEmail`.

## Free tier

- Nhiều project Pages: theo dõi quota **builds/tháng**.
- Một Render API + một Supabase dùng chung nhiều URL Pages (CORS + Google OAuth origins — xem checklist dưới).

---

## &lt; 20 khoa — checklist nhà cung cấp

Dùng **Chế độ A** lặp tối đa ~20 lần. Không cần registry DB hay `VITE_TENANT_REGISTRY` trên nhiều subdomain `*.pages.dev` riêng lẻ.

### A. Làm một lần (dùng chung)

| Việc | Chi tiết |
|------|----------|
| Git / Cloudflare | Repo `main`; **không** tạo branch theo khoa |
| Render + Supabase | `VITE_API_BASE` = `https://lichkhoa-webapp.onrender.com/api` (hoặc URL API thực tế) |
| CORS API | Set `CLIENT_ORIGIN_SUFFIX=-lichkhoa-webapp.pages.dev` trên Render (xem [DEPLOY-SUPABASE.md](./DEPLOY-SUPABASE.md)). Tuỳ chọn `CLIENT_ORIGINS` cho origin lẻ (vd. custom domain). Redeploy API. |
| Google OAuth (Web) | **Một** Client ID; thêm dần **Authorized JavaScript origins** (đủ cho &lt; 20 URL `https://{slug}-lichkhoa-webapp.pages.dev` + URL Tim cũ nếu giữ) |
| Apps Script bridge | **Có thể một Web App URL chung** nếu cùng tài khoản deploy và script truy cập được mọi Sheet khoa; mỗi khoa vẫn **một file Sheet** + (khuyến nghị) copy `Code.gs` trong file đó |

### B. Mỗi khoa (lặp)

1. Google Sheet mới → Apps Script → `google-apps-script/Code.gs` → Deploy Web app.
2. Cloudflare Pages: project **`{slug}-lichkhoa-webapp`**, branch `main`, build `npm run build`, `dist`.
3. Production env — mẫu copy: [templates/cloudflare-env-khoa.example.env](./templates/cloudflare-env-khoa.example.env).
4. Google OAuth: thêm `https://{slug}-lichkhoa-webapp.pages.dev`.
5. Giao admin **một URL** production.

**Pilot khoa 2 (Nhiễm):** [PILOT-NHIEM-KHOA.md](./PILOT-NHIEM-KHOA.md).

### C. Giới hạn free cần theo dõi

| Dịch vụ | Ghi chú |
|---------|---------|
| **Cloudflare Pages** | ~20 project → mỗi push `main` có thể trigger ~20 build; theo dõi **builds/tháng** trên một tài khoản |
| **Render free** | API sleep — cold start; một service cho mọi khoa |
| **Apps Script** | Quota theo tài khoản deploy; &lt; 20 khoa pilot thường ổn nếu không poll cực dày |

### Quy ước URL / slug

- Khoa mới: `https://{slug}-lichkhoa-webapp.pages.dev`, slug ASCII (`timmach`, `nhiem`).
- Tim mạch có thể giữ `https://lichkhoa-webapp.pages.dev`; CORS suffix vẫn cho phép hostname đó.
