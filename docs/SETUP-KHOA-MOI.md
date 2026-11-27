# Thêm một khoa mới (5 phút — **không** dán Apps Script)

Dùng khi bệnh viện đã có **một** web app Cloudflare + **một** URL bridge (IT setup một lần theo [DEPLOY-GOOGLE-SHEETS.md](./DEPLOY-GOOGLE-SHEETS.md)).

## Admin khoa làm

1. **Tạo hoặc copy** Google Spreadsheet (file lịch khoa).
2. **Chia sẻ** file cho email Gmail mà IT dùng để deploy bridge (quyền **Biên tập viên**). IT cho bạn biết email này (vd. `lichkhoa.it@benhvien.vn`).
3. Mở web app (URL chung) → **Đăng nhập Google** (Gmail của bạn).
4. **Tài khoản → Tùy chọn → Sổ lịch Google Sheet** → dán link file → **Lưu kết nối sổ**.
5. Nếu app hỏi **Thiết lập khoa mới** → đồng ý (ghi tab mẫu lên Sheet).
6. **Quản lý BS** / tab **NhanSu** trên Sheet: thêm nhân viên, cột **`loginEmail`** = Gmail từng người.

## Nhân viên

Cùng URL → **Đăng nhập Google** (email đã có trong **NhanSu**).

## Không cần

- Dán `Code.gs` vào Sheet (IT đã có bridge chung).
- Thêm biến Cloudflare theo khoa.
- Render / API (nếu chỉ dùng Google + Sheet).

## IT (một lần cho cả viện)

Xem mục **«Bridge một lần»** trong [DEPLOY-GOOGLE-SHEETS.md](./DEPLOY-GOOGLE-SHEETS.md).