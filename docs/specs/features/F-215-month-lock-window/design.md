# Design — F-215: Cửa sổ khóa lịch tháng

## UI

- `SheetToolbar.extraControls` → `MonthLockToolbarControl` khi `activePlan === 'month'`.
- Dialog shadcn: `monthOpenAt`, `monthLockAt` (`datetime-local` + nhãn `formatLockAtLabel`), `LockRepeatFields`.
- CSS legacy: `.tb-month-lock`, `.tb-month-lock-label` (ẩn nhãn &lt; 900px).

## Logic

- `src/logic/monthLockWindow.js` — `isMonthWindowOpen(config, now)`.
- Config: `monthOpenAt`, `monthLockAt`, `monthLockRepeat` (JSON giống leave repeat).
- Lặp: neo ngày `monthOpenAt`, span = lock − open, quét ±120 ngày + `occurrenceStartOn`.

## Persistence

- `useAccount.saveLockWindows`: API gửi `monthOpenAt`/`monthLockAt`; `monthLockRepeat` qua `localLockWindows` / Sheet khi không API field.

## App gate

- `monthLockedForMember = member && !monthWindowOpen`
- Handlers tháng gọi `assertMonthEditable()`; `SheetView` `monthReadOnly` tắt merge/role/cell.