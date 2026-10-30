# F-101: Đăng nhập API (Login)

| Trường | Giá trị |
|--------|---------|
| Trạng thái | implemented |
| Phụ thuộc | — |
| Module | api |

## Mục tiêu

Xác thực email/mật khẩu, trả JWT để client gọi các route bảo vệ (`/api/profile`, `/api/settings`, …).

## Phạm vi

### In scope

- `POST /api/auth/login` với body JSON
- Validate input bằng Zod trước controller
- So khớp user trong DB, bcrypt password
- Response JWT + user DTO (không trả password hash)

### Out of scope

- Refresh token, rate limit, 2FA thực thi (chỉ flag settings)

## Yêu cầu chi tiết

### Endpoint

- **Method / path:** `POST /api/auth/login`
- **Input (JSON):**
  - `email` — string, email hợp lệ
  - `password` — string, không rỗng
- **Output thành công (200):**
  - `token` — JWT
  - `user` — object DTO (id, email, username, fullName, …)
- **Output lỗi validation (400):** `{ error: string }` từ middleware Zod
- **Output sai credential (401):** `{ error: '…' }` (message thống nhất, không tiết lộ email có tồn tại hay không — tùy implementation hiện tại)

## Ràng buộc nghiệp vụ

| ID | Điều kiện | Kết quả |
|----|-----------|---------|
| BR-101-01 | `email` không đúng định dạng email | HTTP 400, không query DB |
| BR-101-02 | `password` rỗng | HTTP 400 |
| BR-101-03 | Email không tồn tại hoặc password sai | HTTP 401 |
| BR-101-04 | Credential đúng | HTTP 200 + JWT hợp lệ (payload chứa user id) |

## Test cases

| ID | Mô tả | Input | Kỳ vọng |
|----|-------|-------|---------|
| TC-F101-01 | Email invalid | `{ email: "x", password: "secret" }` | Zod fail |
| TC-F101-02 | Password empty | `{ email: "a@b.co", password: "" }` | Zod fail |
| TC-F101-03 | Email valid format | `{ email: "a@b.co", password: "x" }` | Zod pass (integration: 401 nếu không seed) |

Automated: `server/test/profileValidator.test.js` (TC-F101-01, TC-F101-02, TC-F101-03 schema).

## Definition of Done

- [x] Spec / design / plan
- [x] Route + validator + service
- [x] Test validator map TC-F101-01..03
