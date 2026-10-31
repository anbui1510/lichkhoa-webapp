# F-203: Mobile schedule mode

| Trường | Giá trị |
|--------|---------|
| Trạng thái | implemented |
| Phụ thuộc | F-201 (week grid), F-301 (access / visibleNav) |
| Module | web |

## Mục tiêu

Trên điện thoại, dùng **cùng dữ liệu / cùng SheetView** như desktop, với chrome mobile: bottom nav 4 tab + top actions — không cần nút chuyển desktop/mobile.

## Phạm vi

### In scope

- Tự bật layout mobile khi viewport hẹp / touch tablet (`resolveUiMode`)
- Top bar: tên app + chọn khoa; cùng hàng: sáng/tối, chuông, cài đặt, tài khoản, đăng xuất
- Bottom nav cố định (theo quyền):
  1. **Xếp lịch** (`SHEET`) — `SheetView` với tab nhỏ Lịch tuần / tháng / nghỉ / dạy
  2. **Nhân viên** (`STAFF`) — `StaffManager`
  3. **Task** (`TASKS`) — `TaskManager`
  4. **Dashboard** (`DASHBOARD`) — `FairnessDashboard`
- Ẩn TaskPalette trên mobile
- Không có nút “Giao diện máy tính” / “Dùng bản điện thoại”

### Out of scope

- Handsontable UX tối ưu touch (vẫn scroll ngang)
- PWA / push notification
- Refactor MonthSheet / SheetToolbar sang shadcn

## Ràng buộc nghiệp vụ

| ID | Điều kiện | Kết quả mong đợi |
|----|-----------|------------------|
| BR-203-01 | Viewport mobile, không ép mode | MobileShell |
| BR-203-02 | Tab Xếp lịch | SheetView + plan tabs tuần/tháng/nghỉ/dạy |
| BR-203-03 | Tab Nhân viên / Task | Đủ trang quản lý (không phải palette) |
| BR-203-04 | Member không có staff | Ẩn tab Nhân viên |
| BR-203-05 | Top bar | 5 nút: theme, bell, settings, profile, logout |

## Test cases

| ID | Mô tả | Input | Kỳ vọng |
|----|-------|-------|---------|
| TC-F203-01 | buildDayAgenda ô S có TN | grid LỢI day0 S=`TN` | 1 assignment TN / Sáng |
| TC-F203-02 | filter shortName | filter=`LỢI` | Chỉ LỢI |
| TC-F203-03 | bỏ qua `0` | cell=`0` | 0 assignment |
| TC-F203-04 | resolveUiMode | width=400 | `mobile` |
| TC-F203-05 | resolveUiMode ép desktop | forced=`desktop` | `desktop` |

## Definition of Done

- [x] design / implementation-plan
- [x] Bottom nav 4 tab + SheetView trên mobile
- [x] `npm run sdd:check`
