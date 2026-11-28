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
- Refresh Google JWT tự động (đồng bộ Sheet cần GIS lại khi JWT ~1h hết; phiên app có thể giữ vào UI)
- Đăng ký tài khoản trên gate (vẫn có trên Account khi cần)

## Yêu cầu chi tiết

### UI

- Nền trang nhạt; thẻ trắng giữa màn hình, bo góc, đổ bóng nhẹ
- Header: icon brand (ô accent), tiêu đề app/tenant, 1–2 dòng phụ, dòng phiên bản nhỏ
- Form:
  - **Tên nhân viên** — `<select>` roster (tuỳ chọn) hoặc fallback ô Email
  - **Mật khẩu** — disabled đến khi đã chọn nhân viên / có email
  - Nút **Đăng nhập** full-width (brand emerald)
  - Google Sign-In khi backend Sheet hoặc đã cấu hình OAuth; link **Tài khoản Google khác**; Sheet ẩn form API sau link tuỳ chọn
  - Sheet backend: link «Tài khoản Google khác»; form email/mật khẩu API ẩn sau link tuỳ chọn
- Alert khi `sessionNotice === 'expired'` hoặc `'idle'` (tự thoát do không hoạt động)
- **Account → Bảo mật**: «Thời gian không hoạt động (phút)» (mặc định 60), nút «Vô thời hạn» (`sessionTimeoutMinutes: null`)

### Điều kiện vào app (`sessionReady`)

| Backend | `sessionReady` |
|---------|----------------|
| Sheet (`VITE_DATA_BACKEND=sheet`) | Có Google ID token **và** `user.email`, **hoặc** phiên app còn hạn (`appSessionActive`), **hoặc** phiên xem trước Pages (`sheetPreview` + email) |
| API / Supabase | Có JWT **và** `user.id` **và** không ở chế độ offline-local |

Local profile không token (`id: local` / «Tiếp tục offline») **không** vượt gate.

**Pages không API:** form «Vào xem trước» (email, không mật khẩu) tạo `LICHKHOA_SHEET_PREVIEW_SESSION` — vào app local; Sheet bridge vẫn cần Google JWT thật để sync.

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
| BR-102-06 | Sheet + không `VITE_API_BASE` (Pages) | Hiện «Vào xem trước» bằng email; `sessionReady` với `sheetPreview` |
| BR-102-07 | Sheet preview | Không ghi được Sheet bridge (thiếu Google JWT) — chỉ UI/local |
| BR-102-08 | Sheet + đăng nhập Google | Chỉ GIS trên trình duyệt + `VITE_GOOGLE_CLIENT_ID`; **không** gọi `POST /api/auth/google` (Render) |
| BR-102-09 | Logout / «Tài khoản Google khác» | Gỡ gợi ý GIS (`revoke` + `disableAutoSelect`); người dùng **bấm tay** nút Google để mở cửa sổ chọn email — đăng xuất app ≠ đăng xuất Gmail trình duyệt |

## Test cases

| ID | Mô tả | Input | Kỳ vọng |
|----|-------|-------|---------|
| TC-F102-01 | `sessionReady` Sheet thiếu Google token | user có email, không token | `false` |
| TC-F102-01b | Sheet + `appSessionActive` | không Google token | `true` |
| TC-F102-02 | `sessionReady` Sheet đủ | Google token + email | `true` |
| TC-F102-03 | `sessionReady` API offline local | token rỗng, user local | `false` |
| TC-F102-04 | `sessionReady` API JWT | token + user.id, offline false | `true` |
| TC-F102-05 | Sheet preview Pages | sheetPreview + email, không Google token | `true` |
| TC-F102-08 | Sheet GIS login | credential Google, không gọi API | user + google token; sync bridge |

| TC-F102-10..13 | Phiên app / idle / vô thời hạn | `loginSession.js` | xem `tests/loginSession.test.js` |

Automated: `tests/loginGate.test.js`, `tests/loginSession.test.js`, `tests/previewSession.test.js`, `tests/googleClient.test.js`.

## Tiêu chí hoàn thành (Definition of Done)

- [x] `design.md` và `implementation-plan.md` đã cập nhật
- [x] INDEX.md có F-102
- [x] Login Gate + gate trong `App.jsx`
- [x] TC-F102-01..04 pass
- [x] `npm run sdd:check`
