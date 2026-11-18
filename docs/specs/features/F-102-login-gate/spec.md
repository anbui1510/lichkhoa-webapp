# F-102: Cổng đăng nhập (Login Gate UI)

| Trường | Giá trị |
|--------|---------|
| Trạng thái | implemented |
| Phụ thuộc | F-101 (API email/password), F-304 (Google / Sheet session) |
| Module | web |

## Mục tiêu

Khi mở webapp lần đầu (chưa có phiên đăng nhập hợp lệ), người dùng thấy **màn hình đăng nhập** dạng thẻ (card) trước; chỉ sau khi đăng nhập thành công mới vào các view lịch / quản lý.

## Phạm vi

### In scope

- Full-screen login gate chặn Navbar / Sheet / các view nghiệp vụ khi chưa authenticated
- Card UI: brand (icon + tên app/tenant), mô tả ngắn, phiên bản, form đăng nhập, nút Đăng nhập
- Cảnh báo «phiên hết hạn» khi vừa logout hoặc token/session không còn hợp lệ
- Đăng nhập email/mật khẩu (F-101) — có thể chọn nhân viên từ roster để điền email
- Đăng nhập Google (session Sheet / API Google) khi cấu hình
- Đăng xuất (Thoát) đưa về login gate

### Out of scope

- Mật khẩu riêng từng nhân viên trên Sheet (chưa có model)
- Refresh token / idle timeout tự động (chỉ hiển thị notice khi session đã mất)
- Đăng ký tài khoản trên gate (vẫn có trên Account khi cần)

## Yêu cầu chi tiết

### UI

- Nền trang nhạt; thẻ trắng giữa màn hình, bo góc, đổ bóng nhẹ
- Header: icon brand (ô accent), tiêu đề app/tenant, 1–2 dòng phụ, dòng phiên bản nhỏ
- Form:
  - **Tên nhân viên** — `<select>` roster (tuỳ chọn) hoặc fallback ô Email
  - **Mật khẩu** — disabled đến khi đã chọn nhân viên / có email
  - Nút **Đăng nhập** full-width (brand emerald)
  - Google Sign-In khi backend Sheet hoặc đã cấu hình OAuth
- Alert đỏ/hồng nhạt khi `sessionNotice === 'expired'`

### Điều kiện vào app (`sessionReady`)

| Backend | `sessionReady` |
|---------|----------------|
| Sheet (`VITE_DATA_BACKEND=sheet`) | Có Google ID token **và** `user.email` |
| API / Supabase | Có JWT **và** `user.id` **và** không ở chế độ offline-local |

Local profile không token (`id: local` / «Tiếp tục offline») **không** vượt gate.

### API

Không thêm endpoint mới — dùng F-101 `POST /api/auth/login` và Google auth hiện có.

## Ràng buộc nghiệp vụ

| ID | Điều kiện | Kết quả mong đợi |
|----|-----------|------------------|
| BR-102-01 | Chưa `sessionReady`, `account.loading === false` | Chỉ render Login Gate; không Navbar/Sheet |
| BR-102-02 | Đăng nhập email/password thành công (F-101) | `sessionReady` → vào view mặc định theo quyền |
| BR-102-03 | Đăng nhập Google thành công (Sheet hoặc API) | `sessionReady` → vào app |
| BR-102-04 | Người dùng chọn Thoát / logout | Xoá JWT + Google token; hiện gate + notice hết hạn phiên |
| BR-102-05 | Token lưu sẵn nhưng `/api/auth/me` fail | Coi như hết phiên; gate + notice (không vào app bằng local profile) |

## Test cases

| ID | Mô tả | Input | Kỳ vọng |
|----|-------|-------|---------|
| TC-F102-01 | `sessionReady` Sheet thiếu Google token | user có email, không token | `false` |
| TC-F102-02 | `sessionReady` Sheet đủ | Google token + email | `true` |
| TC-F102-03 | `sessionReady` API offline local | token rỗng, user local | `false` |
| TC-F102-04 | `sessionReady` API JWT | token + user.id, offline false | `true` |

Automated: `tests/loginGate.test.js`.

## Tiêu chí hoàn thành (Definition of Done)

- [x] `design.md` và `implementation-plan.md` đã cập nhật
- [x] INDEX.md có F-102
- [x] Login Gate + gate trong `App.jsx`
- [x] TC-F102-01..04 pass
- [x] `npm run sdd:check`
