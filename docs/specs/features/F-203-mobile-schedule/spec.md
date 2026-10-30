# F-203: Mobile schedule mode

| Trường | Giá trị |
|--------|---------|
| Trạng thái | implemented |
| Phụ thuộc | F-201 (week grid), F-301 (access / visibleNav) |
| Module | web |

## Mục tiêu

Bác sĩ / trưởng khoa mở app trên điện thoại và **xem lịch tuần theo ngày** (agenda) thay vì lưới Handsontable desktop — điều hướng bằng bottom bar, không cần xoay ngang.

## Phạm vi

### In scope

- Tự bật layout mobile khi viewport ≤ 768px (có thể ép bằng `localStorage` key `lichkhoa_ui_mode` = `mobile` \| `desktop`)
- Shell mobile: top bar gọn + bottom nav (Lịch / Tài khoản + các tab được phép)
- Agenda ngày: strip chọn T2–CN, nhóm theo ca S/R/C/T, chip task theo màu task
- Lọc “Tôi” khi có `linkedStaff`; mặc định xem cả khoa
- Ẩn TaskPalette, Navbar desktop, SheetToolbar / Handsontable khi đang mobile mode
- Banner: chỉnh sửa ô sheet vẫn trên desktop

### Out of scope

- Sửa ô lịch tuần / auto-schedule trên mobile
- Handsontable touch editing
- PWA / push notification
- Refactor MonthSheet / SheetToolbar sang shadcn

## Yêu cầu chi tiết

### UI

- Breakpoint mặc định: `max-width: 768px`
- Bottom nav tối đa ~5 mục: Lịch, Calendar (nếu thấy), Dashboard (nếu thấy), Thêm… (Staff/Tasks/Account)
- Agenda lấy từ `scheduleData.grid` + `buildWeekDays` + `normalizeDaySessions`
- Hiển thị nghỉ / dạy trong ngày từ `leaveEntries` / `studyEntries` nếu `leaveCovers`

## Ràng buộc nghiệp vụ

| ID | Điều kiện | Kết quả mong đợi |
|----|-----------|------------------|
| BR-203-01 | Viewport ≤ 768px và không ép desktop | Dùng MobileShell |
| BR-203-02 | `lichkhoa_ui_mode=desktop` | Luôn desktop dù hẹp |
| BR-203-03 | `lichkhoa_ui_mode=mobile` | Luôn mobile dù rộng |
| BR-203-04 | Member không thấy calendar | Bottom nav không có mục Calendar |
| BR-203-05 | Lọc “Tôi” + có linkedShortName | Chỉ dòng của BS đó |
| BR-203-06 | Ô trống / `'0'` | Không hiện assignment |

## Test cases

| ID | Mô tả | Input | Kỳ vọng |
|----|-------|-------|---------|
| TC-F203-01 | buildDayAgenda ô S có TN | grid LỢI day0 S=`TN` | 1 assignment TN / Sáng |
| TC-F203-02 | filter shortName | filter=`LỢI`, grid có 2 BS | Chỉ LỢI |
| TC-F203-03 | bỏ qua `0` | cell=`0` | 0 assignment |
| TC-F203-04 | resolveUiMode | width=400, mode unset | `mobile` |
| TC-F203-05 | resolveUiMode ép desktop | width=400, mode=`desktop` | `desktop` |

## Tiêu chí hoàn thành (Definition of Done)

- [x] `design.md` và `implementation-plan.md` đã cập nhật
- [x] Code + logic helper testable (`mobileAgenda.js`, `uiMode.js`)
- [x] `npm run sdd:check` pass
- [x] Không phá F-201 / F-301
