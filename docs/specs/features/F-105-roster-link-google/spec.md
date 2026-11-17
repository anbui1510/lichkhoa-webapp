# F-105: Mod/User Google login + liên kết tên roster

| Trường | Giá trị |
|--------|---------|
| Trạng thái | implemented |
| Phụ thuộc | F-104, F-102 |
| Module | cả hai |

## Mục tiêu

Sau khi có roster (F-104), user Google ngoài allowlist đăng nhập được (pending `role=""`), tự liên kết tên chưa taken → nhận `User.role` + `linkedUserId`; `resolveActor` tôn trọng Admin/Mod/User.

## Phạm vi

### In scope

- Nới Google login: đã có Admin → ngoài allowlist vẫn login với `role=""` (pending)
- `POST /api/roster/:id/link` (self); Admin `POST /api/roster/:id/unlink`
- UI chọn tên chưa linked; JWT/profile cập nhật role
- `access.js`: Admin|Mod → full; User → member defaults; chưa link → guest

### Out of scope

- Rewrite F-103 Sheet; F-201; bắt buộc map `dept.staff`

## Yêu cầu chi tiết

### Google policy (mở rộng F-102)

| Điều kiện | Kết quả |
|-----------|---------|
| First-user / allowlist / existing Admin | `allowed` + `grantAdmin` (F-102) |
| Đã có Admin; ngoài allowlist; chưa Admin | `allowed`; `grantAdmin=false`; `role=""` |

**Không còn 403** cho case “đã có Admin + ngoài allowlist” (BR-102-03 superseded bởi F-105).

### Endpoint

| Method / path | Ai | Input | Output |
|---------------|----|-------|--------|
| `POST /api/roster/:id/link` | JWT (self) | — | `{ token, user, person }` — copy roster.role → User.role; set linkedUserId |
| `POST /api/roster/:id/unlink` | JWT + Admin | — | `{ person }` — clear linkedUserId; optional clear User.role nếu khớp |

- **409:** tên đã linked bởi user khác; hoặc user đã link tên khác (một user một tên)
- **404:** roster id không tồn tại
- **403:** unlink non-Admin

## Ràng buộc nghiệp vụ

| ID | Điều kiện | Kết quả |
|----|-----------|---------|
| BR-105-01 | Đã Admin; Google ngoài allowlist | 200; role `""` |
| BR-105-02 | Link roster role User free | User.role=User; linked |
| BR-105-03 | Link roster role Mod | User.role=Mod; full access |
| BR-105-04 | Tên taken | 409 |
| BR-105-05 | Admin bootstrap F-102 | vẫn grant Admin |
| BR-105-06 | resolveActor Mod | kind admin (full) |
| BR-105-07 | resolveActor User | kind member + MEMBER_DEFAULT |
| BR-105-08 | role `""` | guest; nhắc link |

## Test cases

| ID | Mô tả | Input | Kỳ vọng |
|----|-------|-------|---------|
| TC-F105-01 | Pending login policy | adminCount≥1, ngoài list | allowed; !grantAdmin |
| TC-F105-02 | Link free User | roster User null link | role User + linked |
| TC-F105-03 | Link taken | linkedUserId set | 409 |
| TC-F105-04 | resolveActor Mod | role Mod | kind admin |
| TC-F105-05 | resolveActor User | role User | kind member |
| TC-F105-06 | needsStaffLink pending | role `""` | true |
| TC-F105-07 | needsStaffLink Mod/User | role set | false |

Automated: `adminBootstrap`/`googleLoginPolicy`, `rosterLink`, `accessRole` tests.

## Definition of Done

- [x] Spec / design / plan
- [x] Policy + link API + UI + access.js
- [x] Regression F-102 Admin bootstrap
- [x] INDEX cập nhật
