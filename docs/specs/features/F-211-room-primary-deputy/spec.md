# F-211: Phân công bệnh phòng chính/phụ + Auto tuần (Epic 3.1–3.4)

| Trường | Giá trị |
|--------|---------|
| Trạng thái | implemented |
| Phụ thuộc | F-201, F-210 |
| Module | web (logic + UI) |

## Mục tiêu

Bảng Phân công bệnh phòng hỗ trợ BS chính + BS phụ có thứ tự; Auto tuần (`placeWards`) thử chính → phụ → trống; giảm cảnh báo giả subset OQ-1.

## Phạm vi

### In scope

- `roomTable` doctor-first: hàng 1 = `shortName` BS (đổ từ Lịch tuần); hàng 2–3 = tên phòng (không nhãn «Tên bệnh phòng»)
- Migrate legacy doctor-column → chính/phụ
- `placeWards` policy phụ nhận hết cả ngày; không ½ phòng; không BS ngoài list
- Cảnh báo thiếu BS chính; filter false warnings subset
- Auto tuần 1 click giữ F-201 layers (persist qua store / F-210)

### Out of scope

- Public/Unpublish (F-212)
- Full OQ-1 list ngoài subset sprint
- Toolbar Sheets P1/P2

## Ràng buộc nghiệp vụ

| ID | Điều kiện | Kết quả mong đợi |
|----|-----------|------------------|
| BR-211-01 | Setup | Cột = BS tuần; hàng 1 shortName; hàng 2–3 tên phòng; lưu `roomTable` SoT |
| BR-211-02 | Phòng có tên, thiếu chính | Cảnh báo rõ |
| BR-211-03 | Auto; chính miss cả session ngày | Thử phụ theo thứ tự; phụ nhận hết ngày |
| BR-211-04 | Hết phụ | Trống + `roomWarnings` |
| BR-211-05 | Auto tuần | BR-201-01…06 giữ nguyên trừ phòng (FR5) |
| BR-211-06 | Warning “chưa chọn Trách nhiệm” nhưng task đã trên grid | Lọc bỏ (OQ-1 subset) |
| BR-211-07 | Staff hiện trên Lịch tuần | Đổ `shortName` lên **hàng đầu**; hàng 2–3 để ghi tên phòng; bỏ nhãn «Tên bệnh phòng» |

## Test cases

| ID | Mô tả | Kỳ vọng |
|----|-------|---------|
| TC-F211-07 | Cột vai trò (BS chính/phụ) | Sửa trực tiếp trên lưới chính/phụ |
| TC-F211-08 | Pull Sheet sau sửa phòng | `roomTable` cục bộ giữ ~2 phút |
| TC-F211-01 | Migrate legacy | 1 phòng, chính + phụ |
| TC-F211-02 | Thiếu chính | Warning |
| TC-F211-03 | Chính nghỉ, phụ free | Phụ nhận P1 cả S+C |
| TC-F211-04 | False warning filter | Drop no-owner khi đã đặt |
| TC-F211-09 | `isDoctorAssignmentLabel` | Nhận BS / BS chính / Phụ trách; không nhận Tên bệnh phòng |
| TC-F211-10 | `applyWeekStaffToDoctorRow` | Hàng đầu = shortName; labels `['BS','','']` |
| TC-F211-10b | Giữ tên phòng khi reorder BS | Phòng theo cột khớp shortName |

## Tiêu chí hoàn thành

- [x] design + implementation-plan
- [x] TC-F211-01..04
- [x] Không phá F-201 layers ngoài placeWards
