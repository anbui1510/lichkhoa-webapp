# Design — F-211: Room chính/phụ + Auto

## Tổng quan

`roomTable` chuyển sang cột = phòng; hàng tên + BS chính + BS phụ N. `placeWards` đọc `roomDutiesOf` và gán theo ngày (phụ nhận hết).

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
  "labels": ["Tên bệnh phòng", "BS chính", "BS phụ 1"],
  "matrix": [["P1"], ["An"], ["Bình"]],
  "colWidths": [120],
  "rowHeights": [32, 32, 32]
}
```

Legacy `BS Phụ trách` + `Tên bệnh phòng` được migrate khi `roomTableOf`.

Staff tuần (`traineeOnWeek`): `applyWeekStaffToPrimaryRow` đổ `shortName` lên hàng **BS chính** (một cột / bác sĩ, cùng thứ tự hàng lưới tuần); tên phòng + hàng phụ/hỗ trợ giữ theo cột khớp tên BS chính.

## Google Sheet (F-304)

`exportWeekRows` / `importWeekRows` ghi `recordType: room_meta` trên tab **LichTuan** (cột `value` = JSON `labels` + `matrix` + kích thước). Pull/push giữ cùng `sheetId` với lưới tuần.
