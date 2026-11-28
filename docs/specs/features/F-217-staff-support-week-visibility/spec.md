# F-217: Học viên / hỗ trợ — khoảng ngày + hiện trên Lịch tuần

| Trường | Giá trị |
|--------|---------|
| Trạng thái | implemented |
| Phụ thuộc | F-304 (NhanSu Sheet), F-201 (lưới tuần) |
| Module | web |

## Mục tiêu

Quản lý nhân sự: học viên / hỗ trợ có khoảng ngày hỗ trợ/học; Lịch tuần (và phân công bệnh phòng) chỉ hiện hàng khi được bật và nằm trong khoảng ngày. Lịch tháng vẫn hiện tên.

## Phạm vi

### In scope

- Form Quản lý BS: ngày bắt đầu/kết thúc khi chức danh hoặc vị trí là học viên/hỗ trợ
- `showInWeek` (ShowInLichTuan): On/Off
- Lọc hàng trên Lịch tuần + ẩn cột Phân công bệnh phòng tương ứng
- Persist `studyFrom`, `studyTo`, `showInWeek` trên tab NhanSu (Google Sheet)

### Out of scope

- Đổi quyền tab (F-301)
- Ẩn trên lịch tháng

## Ràng buộc nghiệp vụ

| ID | Điều kiện | Kết quả |
|----|-----------|---------|
| BR-217-01 | Không phải HV/hỗ trợ | Hiện mọi tuần; không bắt buộc ngày |
| BR-217-02 | HV/hỗ trợ, trống cả hai ngày | Hiện mọi tuần (nếu showInWeek On) |
| BR-217-03 | Có studyFrom/studyTo | Chỉ hiện tuần giao với khoảng |
| BR-217-04 | showInWeek Off | Ẩn Lịch tuần + cột phòng; tháng/nghỉ/học vẫn hiện |
| BR-217-05 | Lưu NhanSu | Đẩy studyFrom, studyTo, showInWeek lên Sheet |

## Test cases

| ID | Mô tả | Kỳ vọng |
|----|-------|---------|
| TC-F217-01 | Hỗ trợ trong khoảng | `traineeOnWeek` true |
| TC-F217-02 | Ngoài khoảng | false |
| TC-F217-03 | showInWeek off | false dù trong khoảng |
| TC-F217-04 | Import/export NhanSu có 3 field | khứ hồi |

## Definition of Done

- [x] UI form + logic lọc tuần
- [x] Sheet NhanSu headers
- [x] Unit test traineePeriod / nhanSu
