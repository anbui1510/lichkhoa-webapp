# Thêm một khoa mới (5–10 phút — **không** dán Apps Script)

Dùng khi bệnh viện đã có **một** web app Cloudflare + **một** URL bridge (IT setup một lần theo [SETUP-BRIDGE-IT-ONCE.md](./SETUP-BRIDGE-IT-ONCE.md)).

Trong app: **Tài khoản → Tùy chọn** — mục **Triển khai khoa mới trên Google Sheet** (checklist đầy đủ).

## Ví dụ: Khoa Tiêu hóa

| Bước | Việc |
|------|------|
| 1 | Tạo Google Sheet (vd. tên `LichkhoaTieuhoa`) hoặc copy file khoa khác |
| 2 | **Chia sẻ** → Gmail IT deploy bridge → **Biên tập viên** |
| 3 | Cùng URL web với Tim mạch → **Đăng nhập Google** (trưởng khoa) |
| 4 | **Tài khoản → Tùy chọn** → dán link Sheet → **Lưu kết nối sổ** |
| 5 | Đợi đồng bộ / **Đồng bộ từ Sheet**. Sheet **đã có** NhanSu → **không** «Thiết lập khoa mới» |
| 5b | Tab **_meta**: sửa `activeDeptId` = `dept_tieu_hoa`, `deptName` = `Khoa Tiêu hóa`, `deptCode` = `TIEU_HOA` (nếu đang lẫn slug preview) |
| 6 | Tab **NhanSu**: `loginEmail`, `accessRole` (`admin` / `member`) |
| 7 | **Quản lý BS / Task** trên app hoặc Sheet |

Cột `deptId` gợi ý: `dept_tieu_hoa` (tuỳ quy ước khoa).

**Không** thêm biến Cloudflare theo khoa khi dùng một URL chung (chế độ 0 trong [DEPLOY-MULTI-KHOA.md](./DEPLOY-MULTI-KHOA.md)).

## Admin khoa (tóm tắt)

1. **Tạo hoặc copy** Google Spreadsheet (file lịch khoa).
2. **Chia sẻ** file cho email Gmail mà IT dùng để deploy bridge (quyền **Biên tập viên**).
3. Mở web app (URL chung) → **Đăng nhập Google** (Gmail của bạn).
4. **Tài khoản → Tùy chọn → Sổ lịch Google Sheet** → dán link file → **Lưu kết nối sổ**.
5. Nếu app hỏi **Thiết lập khoa mới** → chỉ đồng ý khi tab **NhanSu trống** (Sheet mới).
6. **Quản lý BS** / tab **NhanSu** trên Sheet: thêm nhân viên, cột **`loginEmail`** = Gmail từng người.

## Nhân viên

Cùng URL → **Đăng nhập Google** (email đã có trong **NhanSu**).

## Không cần

- Dán `Code.gs` vào Sheet (IT đã có bridge chung).
- Thêm biến Cloudflare theo khoa (một URL chung).
- Render / API (nếu chỉ dùng Google + Sheet).

## IT (một lần cho cả viện)

Xem [SETUP-BRIDGE-IT-ONCE.md](./SETUP-BRIDGE-IT-ONCE.md) và mục **«Bridge một lần»** trong [DEPLOY-GOOGLE-SHEETS.md](./DEPLOY-GOOGLE-SHEETS.md).