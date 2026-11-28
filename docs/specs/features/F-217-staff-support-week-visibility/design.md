# Design — F-217: Học viên / hỗ trợ — khoảng ngày + hiện trên Lịch tuần

## Tổng quan

Mở rộng `traineePeriod` cho hỗ trợ + cờ `showInWeek`. UI StaffManager; persist NhanSu.

## Thành phần

| Layer | File | Trách nhiệm |
|-------|------|-------------|
| Logic | `src/logic/traineePeriod.js` | `isPeriodLimitedStaff`, bounds, covers, onWeek + showInWeek |
| UI | `src/components/StaffManager.jsx` | Ngày + dropdown ShowInLichTuan |
| Constants | `src/store/constants.js` | Title/position Hỗ trợ |
| Sheet | `src/logic/sheetStore/nhanSu.js` + headers | studyFrom, studyTo, showInWeek |
| Week UI | `SheetView` (đã dùng `traineeOnWeek`) | Lọc hàng / ẩn phòng |

## Mô hình dữ liệu

Staff: `{ studyFrom?: ISO, studyTo?: ISO, showInWeek?: boolean }` — mặc định `showInWeek` true khi thiếu.
