# F-214: Cửa sổ khóa lịch nghỉ + User ghi SoT (Epic 4.1 / 4.2 / 4.5 nền)

| Trường | Giá trị |
|--------|---------|
| Trạng thái | implemented |
| Phụ thuộc | F-103, F-105, F-210, F-301 |
| Module | cả hai |

## Mục tiêu

Admin cấu hình hạn khóa lịch nghỉ (và tháng); User chỉ sửa/ghi nghỉ của mình khi còn trong cửa sổ; ngoài cửa sổ phải nhờ Mod. Ghi lên Sheet SoT dùng LWW + dialog conflict sẵn có (F-210).

## Phạm vi

### In scope

- `DeptScheduleConfig.leaveLockAt` / `monthLockAt` (ISO datetime, nullable)
- `GET /api/schedule/config` trả thêm 2 field khóa
- `PUT /api/schedule/lock-windows` — Admin lưu hạn khóa
- Pure logic: `isLeaveWindowOpen`, ownership theo `shortName` liên kết
- User (role) được `PUT /api/schedule/data` khi cửa sổ nghỉ còn mở
- UI Account: form hạn khóa; banner tab nghỉ; chặn sửa khi khóa / không phải nghỉ của mình
- Conflict: tái sử dụng ConfirmDialog F-210 khi User/Mod ghi lệch revision

### Out of scope

- Story 4.3 đổi lịch tháng trong cửa sổ (chỉ lưu `monthLockAt` + hiển thị hạn)
- Story 4.4 lịch học Template Nội
- Audit tab đầy đủ (Epic 5) — conflict không bắt buộc ghi nhật ký
- Patch leave-only server-side merge (v1: User PUT full payload khi cửa sổ mở)
- F-304 Apps Script path (chỉ F-210 API + Sheet SoT)

## Yêu cầu chi tiết

### Endpoint

| Method / path | Ai | Input | Output |
|---------------|----|-------|--------|
| `GET /api/schedule/config` | JWT | — | `config` gồm thêm `leaveLockAt`, `monthLockAt` (ISO hoặc `null`) |
| `PUT /api/schedule/lock-windows` | JWT + Admin | `{ leaveLockAt?, monthLockAt? }` ISO hoặc `null`/rỗng để xóa | `{ config }` |
| `PUT /api/schedule/data` | Admin\|Mod\|(User + cửa sổ nghỉ mở) | như F-210 | như F-210 (+ conflict flag) |

- **401:** chưa đăng nhập
- **403:** không phải Admin khi PUT lock-windows; User ghi data khi đã khóa nghỉ
- **400:** datetime không parse được

### UI

- Account → Tùy chọn: Admin sửa `datetime-local` hạn khóa nghỉ / tháng; mọi role thấy hạn đã lưu
- Tab Lịch nghỉ: banner hạn khóa; User `readOnly` khi hết cửa sổ hoặc không match ownership

## Ràng buộc nghiệp vụ

| ID | Điều kiện | Kết quả mong đợi |
|----|-----------|------------------|
| BR-214-01 | Chưa cấu hình `leaveLockAt` | Cửa sổ nghỉ coi như **mở** |
| BR-214-02 | `now < leaveLockAt` | User (có `leave:edit`) được sửa nghỉ của mình + PUT SoT |
| BR-214-03 | `now >= leaveLockAt` | User không lưu/xóa nghỉ; thông báo nhờ Mod; PUT data → 403 |
| BR-214-04 | Admin/Mod | Luôn sửa được nghỉ (bỏ qua cửa sổ) |
| BR-214-05 | User sửa entry `shortName` không thuộc mình | Từ chối trên client |
| BR-214-06 | Hai phiên ghi lệch `baseRevision` | LWW + `conflict: true` + dialog reload (F-210) |
| BR-214-07 | `monthLockAt` lưu/hiển thị | Không gate lịch tháng trong F-214 |

## Test cases

| ID | Mô tả | Input | Kỳ vọng |
|----|-------|-------|---------|
| TC-F214-01 | Không có leaveLockAt | config null | `isLeaveWindowOpen` true |
| TC-F214-02 | Trước hạn | now &lt; lock | true |
| TC-F214-03 | Sau hạn | now ≥ lock | false |
| TC-F214-04 | Ownership match shortName | linked staff | `canMutateLeaveEntry` true |
| TC-F214-05 | Ownership lệch | shortName khác | false |
| TC-F214-06 | Admin bỏ qua ownership | kind admin | true |
| TC-F214-07 | GET config có lock fields | row có Date | ISO string |
| TC-F214-08 | PUT lock-windows ISO hợp lệ | Admin | persist |
| TC-F214-09 | PUT lock-windows invalid | `"abc"` | 400 |
| TC-F214-10 | User PUT data cửa sổ mở | role User + open | middleware next |
| TC-F214-11 | User PUT data đã khóa | role User + closed | 403 |

## Tiêu chí hoàn thành (Definition of Done)

- [x] `design.md` và `implementation-plan.md` đã cập nhật
- [x] Code + TC-F214-* pass
- [x] Không phá F-103 / F-210 contract (thêm field / nới quyền User có điều kiện)
