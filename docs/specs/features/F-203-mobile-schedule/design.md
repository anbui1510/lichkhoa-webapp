# Design — F-203: Mobile schedule mode

## Tổng quan

```
viewport / localStorage
        │
        ▼
   resolveUiMode ──► desktop: Navbar + SheetView (hiện tại)
        │
        └──► mobile: MobileShell
                    ├─ MobileTopBar (khoa, tuần, theme)
                    ├─ body: MobileWeekAgenda | Calendar | … | Account
                    └─ MobileBottomNav (visibleNav)
```

## Thành phần

| Layer | File / module | Trách nhiệm |
|-------|---------------|-------------|
| Hook | `src/hooks/useMediaQuery.js` | `matchMedia` listener |
| Logic | `src/logic/uiMode.js` | `resolveUiMode`, storage key |
| Logic | `src/logic/mobileAgenda.js` | `buildDayAgenda` từ grid + tasks |
| UI | `src/components/mobile/MobileShell.jsx` | Layout + bottom nav |
| UI | `src/components/mobile/MobileWeekAgenda.jsx` | Day strip + session cards |
| CSS | `src/index.css` (`.mobile-*`) | Chrome mobile, token legacy |
| Orchestration | `src/App.jsx` | Chọn shell theo `uiMode` |

## Luồng dữ liệu

1. `App` tính `scheduleData` như desktop (`buildWeekDays` + active sheet).
2. `MobileWeekAgenda` gọi `buildDayAgenda({ days, grid, staff, tasks, dayIndex, sessions, filterShortName })`.
3. Đổi tuần: reuse `onDateChange` / `onGoCurrentWeek` từ App (cùng sheet weeks).
4. Đổi khoa: `onSelectDept` như Navbar.

## Mô hình dữ liệu

Không đổi store. Agenda là view-model tạm:

```js
{
  day, // buildWeekDays[i]
  sessions: [
    {
      id: 'S',
      label: 'Sáng',
      items: [{ shortName, staffName, code, taskName, bgColor, textColor }]
    }
  ],
  leaves: [...],
  studies: [...]
}
```

## Lỗi & edge cases

| Tình huống | Xử lý |
|------------|--------|
| Không có sheet / grid trống | Agenda rỗng + copy “Chưa có lịch tuần này” |
| Không linked staff | Ẩn chip “Tôi”, mặc định “Cả khoa” |
| Resize qua 768 | Cập nhật live qua `matchMedia` |
| FullCalendar trên mobile | Vẫn mount CalendarView trong body (scroll) |

## Bảo mật / quyền

Reuse `visibleNav(actor)`, `canSee` / `canEdit` — mobile không nới quyền. Edit sheet không expose trên mobile v1.
