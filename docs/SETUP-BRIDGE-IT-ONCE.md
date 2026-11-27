# IT: Cài bridge Apps Script **một lần** (mọi khoa dùng chung)

Bridge = URL Web App đọc/ghi Google Sheet khi user đăng nhập Google trên web. **100 khoa = 100 file Sheet**, **1 URL bridge**.

Thời gian ước lượng: **15–20 phút** (lần đầu).

---

## Chuẩn bị

- Gmail IT (vd. `lichkhoa.it@benhvien.vn`) — sẽ là chủ deploy và **nhận quyền Editor** mọi file Sheet khoa.
- Google Cloud project đã có **OAuth Client ID Web** (cùng project dùng cho `VITE_GOOGLE_CLIENT_ID` trên Cloudflare), vd. project `lichkhoawebapp`.
- File code: [`google-apps-script/Code.gs`](../google-apps-script/Code.gs) trong repo (copy toàn bộ).

---

## Bước 1 — Tạo project Apps Script (độc lập)

1. Mở [https://script.google.com](https://script.google.com) (đăng nhập Gmail IT).
2. **Dự án mới** (New project).
3. Đặt tên: `lichkhoa-sheet-bridge` (tuỳ ý).

**Không** bắt buộc mở *Extensions → Apps Script* trong từng file Sheet.

---

## Bước 2 — Dán code

1. Xóa nội dung mặc định trong `Code.gs`.
2. Mở trên GitHub:  
   `https://github.com/anbui1510/lichkhoa-webapp/blob/main/google-apps-script/Code.gs`  
   → **Raw** → chọn hết → Copy.
3. Dán vào editor Apps Script → **Ctrl+S** (Lưu).

---

## Bước 3 — Liên kết Google Cloud (quan trọng)

1. Trong Apps Script: **Cài đặt dự án** (biểu tượng bánh răng trái).
2. **Google Cloud Platform (GCP)**  
   - Nếu chưa có: **Thay đổi dự án** → chọn project OAuth (vd. `lichkhoawebapp`).  
   - Nếu báo chưa liên kết: làm theo wizard (dùng **cùng project** với OAuth Web client).
3. Thiếu bước này thường gây lỗi ***API Key không hợp lệ*** trên web.

---

## Bước 4 — (Tuỳ chọn) Script property

1. **Cài đặt dự án** → **Thuộc tính tập lệnh** (Script properties).
2. Thêm:
   - Tên: `GOOGLE_OAUTH_CLIENT_ID`
   - Giá trị: Client ID Web (vd. `....apps.googleusercontent.com`)

Bridge sẽ kiểm tra token Google đúng ứng dụng (`aud`).

---

## Bước 5 — Deploy Web App

1. **Triển khai** → **Triển khai mới** (New deployment).
2. Loại: **Ứng dụng web** (Web app).
3. Cấu hình:
   - **Mô tả:** `bridge v1`
   - **Execute as:** **Tôi** (`Me`) — Gmail IT
   - **Who has access:** **Bất kỳ ai** (`Anyone`) hoặc *Anyone within hospital* nếu Workspace
4. **Triển khai** → **Ủy quyền** (Authorize) lần đầu → chọn tài khoản IT → **Cho phép**.
5. Copy **URL triển khai** dạng:  
   `https://script.google.com/macros/s/AKfycb…/exec`

Giữ URL này — không đổi khi **chỉnh code** (xem bước 7).

---

## Bước 6 — Kiểm tra nhanh

Mở tab trình duyệt (đã đăng nhập Google IT):

```
https://script.google.com/macros/s/YOUR_ID/exec
```

Kỳ vọng JSON:

```json
{"ok":true,"service":"lichkhoa-sheet-bridge"}
```

---

## Bước 7 — Gắn lên Cloudflare (một lần)

1. Cloudflare Pages → project `lichkhoa-webapp` → **Settings** → **Variables**.
2. `VITE_SHEET_BRIDGE_URL` = URL `/exec` ở bước 5.
3. Đã có: `VITE_DATA_BACKEND=sheet`, `VITE_GOOGLE_CLIENT_ID=...`
4. **Retry deployment** (build lại).

---

## Bước 8 — Cho từng khoa (admin khoa, không code)

Gửi admin khoa checklist [SETUP-KHOA-MOI.md](./SETUP-KHOA-MOI.md):

1. Tạo/copy **một** Spreadsheet lịch khoa.
2. **Chia sẻ** file cho **Gmail IT** (bước 5 — người deploy) quyền **Biên tập viên**.
3. Web app → Google login → **Lưu kết nối sổ** (dán link Sheet).
4. Tab **NhanSu**: `loginEmail` = Gmail từng người.

IT **không** deploy lại bridge khi thêm khoa mới — chỉ cần Sheet được share Editor cho Gmail deploy.

---

## Cập nhật `Code.gs` sau này

1. Sửa code trong Apps Script (hoặc dán bản mới từ GitHub).
2. **Triển khai** → **Quản lý triển khai** → biểu tượng **bút** ở deployment Web app.
3. **Version: New version** → **Triển khai**.

**Không** đổi URL `/exec` trên Cloudflare.

---

## Xử lý lỗi thường gặp

| Triệu chứng | Cách xử lý |
|-------------|------------|
| Web: *API Key không hợp lệ* | Bước 3 GCP + dán `Code.gs` mới + New version deploy |
| *Email chưa có trong NhanSu* | Thêm `loginEmail` trên tab NhanSu |
| *Exception: You do not have permission* | Share Sheet cho Gmail **Execute as** (IT deploy) |
| Google login *origin_mismatch* | OAuth origins thêm `https://lichkhoa-webapp.pages.dev` |

---

## Tóm tắt

```
1 bridge URL  +  1 web URL  +  N file Sheet (N khoa)
     ↑ IT 1 lần              ↑ admin / khoa: share + lưu link
```