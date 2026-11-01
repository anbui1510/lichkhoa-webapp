# F-303: Sync lịch lên Postgres (Supabase)

| Trường | Giá trị |
|--------|---------|
| Trạng thái | implemented |
| Phụ thuộc | F-101 (JWT login), F-301 (access UI) |
| Module | cả hai |

## Mục tiêu

Một người (hoặc nhiều người đăng nhập cùng tài khoản/khoa sau này) mở web trên **mobile hoặc desktop** đều thấy **cùng dữ liệu lịch** — lưu trên **Postgres (Supabase)**, không chỉ `localStorage` từng máy.

## Phạm vi

### In scope

- Đổi Prisma datasource sang **PostgreSQL** (Supabase connection string)
- API:
  - `GET /api/schedule-store` — tải snapshot lịch của user đang login
  - `PUT /api/schedule-store` — ghi snapshot (payload JSON cùng shape `LICHKHOA_DATA_STORE_V1`)
- FE: khi có JWT → pull lúc vào app / sau login; mỗi lần `saveStore` → push (debounce) lên API; vẫn ghi `localStorage` làm cache offline
- Docs deploy: tạo project Supabase + `DATABASE_URL` + host API (Render/Railway)

### Out of scope

- Multi-tenant khoa / share theo org (một user một store MVP)
- Conflict merge chi tiết (MVP: last-write-wins theo `updatedAt`)
- Realtime websocket
- Dùng Supabase Auth thay JWT hiện có
- Host API **trên** Supabase Edge Functions

## Yêu cầu chi tiết

### API

| Method | Path | Auth | Mô tả |
|--------|------|------|--------|
| GET | `/api/schedule-store` | Bearer JWT | `{ payload, updatedAt }` hoặc `404` nếu chưa có |
| PUT | `/api/schedule-store` | Bearer JWT | Body `{ payload }` — upsert theo `userId` |

- `payload` phải là object có `departments` (array)
- Giới hạn body JSON ~5MB

### FE

- Chưa login: hành vi cũ (chỉ localStorage + seed)
- Đã login: ưu tiên server nếu `updatedAt` mới hơn cache; không có remote thì push local lên

## Ràng buộc nghiệp vụ

| ID | Điều kiện | Kết quả mong đợi |
|----|-----------|------------------|
| BR-303-01 | User A login, PUT store | GET cùng token trả đúng payload |
| BR-303-02 | Không JWT | 401 |
| BR-303-03 | Payload thiếu `departments` | 400 |
| BR-303-04 | Mobile + desktop cùng user | Cùng dữ liệu sau sync |
| BR-303-05 | Offline / API down | Vẫn dùng localStorage; push lại khi có mạng |

## Test cases

| ID | Mô tả | Input | Kỳ vọng |
|----|-------|-------|---------|
| TC-F303-01 | PUT thiếu departments | `{}` | 400 |
| TC-F303-02 | GET không token | — | 401 |
| TC-F303-03 | PUT rồi GET | payload hợp lệ | 200, payload khớp |
| TC-F303-04 | Validator payload | có `departments: []` | pass schema |

## Definition of Done

- [x] design / implementation-plan
- [x] Prisma Postgres + model ScheduleStore
- [x] Routes + FE sync
- [x] Docs Supabase (`docs/DEPLOY-SUPABASE.md`)
- [x] `npm run sdd:check`
