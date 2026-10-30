# F-201: Sinh lịch tuần tự động (Weekly Auto-Schedule)

| Trường | Giá trị |
|--------|---------|
| Trạng thái | implemented |
| Phụ thuộc | F-301 (quyền sửa tab week) |
| Module | web (logic thuần) |

## Mục tiêu

Từ lịch tháng, nghỉ, dạy, pin bác sĩ và danh sách task — điền **lưới tuần** đang mở theo thứ tự ưu tiên cố định, không ghi đè ô đến từ roster tháng khi nghỉ conflict.

## Phạm vi

### In scope

- Hàm `generateWeeklySchedule(...)` trong `src/logic/schedulerEngine.js`
- 5 lớp (layer) xử lý tuần tự — mô tả BR bên dưới
- Cảnh báo qua `taskAlerts` / warnings sau sinh

### Out of scope

- UI nút bấm (component gọi hàm — xem `App.jsx` / toolbar)
- Persist — caller merge kết quả vào sheet state

## Input / output (hợp đồng hàm)

**Input (tóm tắt):** department state: `staff`, `tasks`, `grid` hiện tại, `startDate`, month data, leave/study registrations, day session config, locks.

**Output:** `{ grid, warnings, roomWarnings?, ... }` — grid mới sau 5 layer; warnings không trùng lặp (caller có thể `sameAlerts`).

## Ràng buộc nghiệp vụ (layers)

| ID | Layer | Hành vi |
|----|-------|---------|
| BR-201-01 | 1 | Chủ nhật tuần trước VG → Thứ 2 sáng/chiều RT |
| BR-201-02 | 2 | Copy roster tháng vào ô tuần khớp ngày; task “mã hóa vào gác” map sang mã cùng role |
| BR-201-03 | 3 | Nghỉ đăng ký — **từ chối** nếu ô đã từ roster tháng |
| BR-201-04 | 4 | Lịch dạy đăng ký |
| BR-201-05 | 5 | Pin bác sĩ trước; task tuần theo thứ tự Quản lý Task; task tháng / P, BÙ, CT, H không pour tuần |
| BR-201-06 | Session | Task khoa chỉ slot Sáng/Chiều đã chọn; khóa chỉ block session đó |

## Test cases (manual / future automated)

| ID | Mô tả | Kỳ vọng |
|----|-------|---------|
| TC-F201-01 | Tuần trống + roster tháng có VG CN | T2 có RT đúng người |
| TC-F201-02 | Ô tháng đã có mã + đăng ký nghỉ trùng | Nghỉ không ghi đè |
| TC-F201-03 | Task chỉ session Chiều | Không xuất hiện ở Sáng |
| TC-F201-04 | `buildWeekDays` với ngày lễ trong `HOLIDAY_DICTIONARY` | `isHoliday === true` |

Automated hiện có: `buildWeekDays` / `addIsoDays` có thể unit test — chưa bắt buộc trong PR này.

## Definition of Done

- [x] Logic 5 layer trong `schedulerEngine.js`
- [x] Spec/design/plan retro
- [ ] Unit test grid layers (backlog)
