# Design — F-211: Room chính/phụ + Auto

## Tổng quan

`roomTable`: cột = bác sĩ tuần; hàng 1 = shortName; hàng 2–3 = tên phòng. `placeWards` đọc `roomDutiesOf` (mỗi ô phòng → duty với BS cột đó).

## Thành phần

| Layer | File | Trách nhiệm |
|-------|------|-------------|
| Logic | `src/logic/roomDuty.js` | Parse/migrate/warnings |
| Engine | `src/logic/schedulerEngine.js` | `placeWards` FR5 |
| Filter | `src/logic/falseWarnings.js` | OQ-1 subset |
| UI | `RoomSheet.jsx`, `SheetView.jsx` | Setup chính/phụ |
| App | `App.jsx` | Auto + merge warnings |

## Mô hình dữ liệu

```json
{
  "labels": ["BS", "", ""],
  "matrix": [["An", "Bình"], ["P1", ""], ["", "P2"]],
  "colWidths": [120, 120],
  "rowHeights": [32, 32, 32]
}
```

Shape cũ (Tên bệnh phòng / BS chính / BS hỗ trợ) migrate → doctor-first khi `roomTableOf`.

Staff tuần: `applyWeekStaffToDoctorRow` đổ `shortName` lên hàng đầu; giữ tên phòng hàng 2–3 theo cột khớp.

## Google Sheet (F-304)

`exportWeekRows` / `importWeekRows` ghi `recordType: room_meta` trên tab **LichTuan** (cột `value` = JSON `labels` + `matrix` + kích thước). Pull/push giữ cùng `sheetId` với lưới tuần.
