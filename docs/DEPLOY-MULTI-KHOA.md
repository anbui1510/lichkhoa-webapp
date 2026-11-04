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
- Một Render API + một Supabase dùng chung nhiều URL Pages (thêm origin Google OAuth / CORS khi mở rộng).
