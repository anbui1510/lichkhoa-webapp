# Design — F-203: Mobile schedule mode

## Tổng quan

```
viewport hẹp / touch
        │
        ▼
   MobileShell
   ├─ top: Lịch khoa + khoa | theme · bell · settings · user · logout
   ├─ body: SHEET | STAFF | TASKS | DASHBOARD | ACCOUNT
   └─ bottom: Xếp lịch · Nhân viên · Task · Dashboard
```

`SHEET` mount **cùng `SheetView`** như desktop (plan tabs tuần/tháng/nghỉ/dạy). Không dùng agenda riêng làm tab chính. Không có nút ép desktop/mobile trên UI.

## Thành phần

| Layer | File | Trách nhiệm |
|-------|------|-------------|
| Hook | `useViewportWidth` | width live |
| Logic | `uiMode.js` | `resolveUiMode` |
| UI | `MobileShell.jsx` | chrome mobile |
| UI | `SheetView` / Staff / Task / Dashboard | nội dung tab |
| CSS | `index.css` `.mobile-*` | layout; ẩn TaskPalette |

## Bảo mật / quyền

`visibleNav(actor)` lọc bottom tabs. Account mở từ top icons (`openAccount`).
