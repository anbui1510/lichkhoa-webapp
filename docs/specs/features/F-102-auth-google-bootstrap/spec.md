# F-102: Đăng nhập Google + bootstrap Admin

| Trường | Giá trị |
|--------|---------|
| Trạng thái | implemented |
| Phụ thuộc | F-101 |
| Module | cả hai |

## Mục tiêu

Cho phép Admin khoa đăng nhập bằng Google lần đầu (bootstrap): gán `User.role=Admin` theo allowlist env hoặc first-user khi chưa có Admin; session/JWT/client phản ánh quyền Admin full; giữ song song login mật khẩu F-101.

## Phạm vi

### In scope

- `POST /api/auth/google` với chính sách Q1=C (allowlist **hoặc** first-user)
- Field `User.role` trên Prisma; `role` trong profile DTO + JWT claim
- `GET /api/auth/google/config` (clientId) — giữ nguyên
- Client `resolveActor` / `needsStaffLink` ưu tiên `user.role === 'Admin'`

### Out of scope

- Story 1.2 liên kết Sheet, 1.3 danh sách Mod/User, 1.4 liên kết tên
- Ẩn/demote form mật khẩu (giữ Q2=A / F-101)

## Yêu cầu chi tiết

### Endpoint

- **Method / path:** `POST /api/auth/google`
- **Input (JSON):** `credential` — string Google ID token
- **Output thành công (200):** `{ token, user }` — `user.role` có thể là `"Admin"`
- **401:** credential Google invalid/expired (verify)
- **409:** email đã gắn `googleId` khác
- *(F-105)* Đã có Admin + email ∉ allowlist → **200** với `role=""` (pending), không còn 403 BR-102-03

### Env

- `BOOTSTRAP_ADMIN_EMAILS` — CSV email được phép nhận/giữ Admin khi khoa đã có ≥1 Admin
- `GOOGLE_CLIENT_ID` — bắt buộc để verify

## Ràng buộc nghiệp vụ

| ID | Điều kiện | Kết quả |
|----|-----------|---------|
| BR-102-01 | Chưa có user `role=Admin`; Google OK | 200; gán Admin (first-user) |
| BR-102-02 | Email ∈ `BOOTSTRAP_ADMIN_EMAILS` | 200; gán/giữ Admin |
| BR-102-03 | ~~Đã có Admin; email ∉ allowlist; chưa Admin → 403~~ | **Superseded by F-105:** 200; `role=""` (pending) |
| BR-102-04 | User đã `role=Admin` đăng nhập lại | 200; giữ Admin (không demote) |
| BR-102-05 | Token Google invalid | 401; không tạo user |
| BR-102-06 | Cùng email, `googleId` khác | 409 |

## Test cases

| ID | Mô tả | Input | Kỳ vọng |
|----|-------|-------|---------|
| TC-F102-01 | Parse CSV allowlist | `" a@b.co , C@D.co"` | `['a@b.co','c@d.co']` |
| TC-F102-02 | First-user | adminCount=0, ngoài allowlist | allowed + grantAdmin |
| TC-F102-03 | Allowlist | email trong list, đã có Admin | allowed + grantAdmin |
| TC-F102-04 | Pending (F-105) | đã Admin khác, ngoài list | allowed=true; grantAdmin=false |
| TC-F102-05 | Existing Admin | existingRole=Admin | giữ Admin |
| TC-F102-06 | resolveActor Admin | `user.role=Admin` | kind admin |
| TC-F102-07 | needsStaffLink Admin | role Admin | false |
| TC-F102-08 | Non-admin chưa link | role rỗng | guest |
| TC-F102-09 | Credential Google invalid | token giả + clientId set | 401 từ verify |
| TC-F102-10 | googleId conflict | existing.googleId khác | 409 |

Automated: `server/test/adminBootstrap.test.js`, `server/test/accessRole.test.js`.

## Definition of Done

- [x] Spec / design / plan
- [x] Schema `role` + `loginWithGoogle` Q1=C
- [x] `access.js` dùng role server
- [x] Test map TC-F102-01..08
