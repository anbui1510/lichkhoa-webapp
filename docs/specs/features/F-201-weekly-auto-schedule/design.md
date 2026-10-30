# Design — F-201: Weekly Auto-Schedule

## Module trung tâm

`src/logic/schedulerEngine.js` — pure functions, import:

- `monthSchedule` — đọc ô tháng, ngày tuần
- `taskMatch`, `cellOrder`, `leaveRepeat`
- `staffDuties` — pin / duty task
- `traineePeriod`, `taskAlert`, `cathSchedule`, `taskDisplay`

## Pipeline

```text
emptyWeekGrid / grid hiện tại
  → Layer 1 (VG → RT)
  → Layer 2 (month pour + encode role)
  → Layer 3 (leave)
  → Layer 4 (teaching)
  → Layer 5 (pins + weekly tasks)
  → taskAlerts → warnings
```

## Cấu trúc grid

- Key ngoài: `staff.shortName`
- Key trong: `dayIndex` 0..6 (T2..CN)
- Session: `S`, `R`, `C`, `T` (+ metadata `isRT`)

## UI integration

`App.jsx` gọi `generateWeeklySchedule` khi user thao tác auto-fill; kết quả gán lại `sheet.grid` và merge warnings.

## Mở rộng

Thêm layer → **bắt buộc** cập nhật BR-201-xx trong spec và mô tả thứ tự trong file (comment header hiện có là source of truth ngắn).
