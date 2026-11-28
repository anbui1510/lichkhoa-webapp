# F-215: Cửa sổ khóa lịch tháng (Epic 4.3)

| Trường | Giá trị |
|--------|---------|
| Trạng thái | implemented |
| Phụ thuộc | F-214, F-304 |
| Module | web (lặp lại local/Sheet); API `monthOpenAt`/`monthLockAt` tùy backend |

## Mục tiêu

Mod/Admin đặt **thời gian mở khóa** và **thời gian khóa** cho tab Lịch tháng; User chỉ sửa khi cửa sổ đang mở. Hỗ trợ **lặp lại tùy chỉnh** (cùng engine `leaveRepeat`).

## Phạm vi

### In scope

- Nút toolbar tab tháng (`MonthLockToolbarControl`): popup datetime-local, Lưu / Xóa / Khóa ngay, lặp lại.
- `isMonthWindowOpen` (`monthLockWindow.js`): open → lock, optional repeat.
- Member bị chặn sửa lịch tháng khi cửa sổ đóng; banner trạng thái.

### Out of scope

- Lưu `monthLockRepeat` qua API Prisma (chỉ local + Google Sheet metadata khi có).

## Ràng buộc nghiệp vụ

| ID | Điều kiện | Kết quả mong đợi |
|----|-----------|------------------|
| BR-215-01 | Không `monthOpenAt` và không `monthLockAt` | Cửa sổ mở (hành vi cũ) |
| BR-215-02 | `now` < `monthOpenAt` (không lặp) | Đóng |
| BR-215-03 | `monthOpenAt` ≤ `now` < `monthLockAt` | Mở |
| BR-215-04 | `monthOpenAt` ≥ `monthLockAt` khi lưu UI | Lỗi validation |
| BR-215-05 | Member + cửa sổ đóng | Alert, không mutate tháng |

## Test cases

| ID | Mô tả | Input | Kỳ vọng |
|----|-------|-------|---------|
| TC-F215-01 | Không hạn | `{}` | mở |
| TC-F215-02 | Chỉ lock tương lai | `monthLockAt` | mở trước hạn |
| TC-F215-03 | Trong cửa sổ | open+lock | mở |
| TC-F215-04 | Trước open | open+lock | đóng |
| TC-F215-05 | Sau lock | open+lock | đóng |