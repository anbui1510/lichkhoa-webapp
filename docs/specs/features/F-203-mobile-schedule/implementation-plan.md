# Implementation Plan — F-203: Mobile schedule mode

**Spec:** [spec.md](./spec.md) · **Design:** [design.md](./design.md)

## Trạng thái tổng

- [x] Spec approved
- [x] Design reviewed
- [x] Implementation
- [x] Tests (TC-F203 — helper assertions via node)
- [x] Manual smoke

## Tasks (theo thứ tự)

| # | Task | File dự kiến | Done |
|---|------|--------------|------|
| 1 | Spec + INDEX | `docs/specs/...` | [x] |
| 2 | `uiMode` + `useMediaQuery` | `src/logic/uiMode.js`, `src/hooks/useMediaQuery.js` | [x] |
| 3 | `buildDayAgenda` | `src/logic/mobileAgenda.js` | [x] |
| 4 | MobileShell 4-tab + SheetView | `src/components/mobile/*` | [x] |
| 5 | Wire App (bỏ nút ép mode) | `src/App.jsx` | [x] |
| 6 | CSS mobile chrome | `src/index.css` | [x] |
| 7 | `sdd:check` + smoke | — | [x] |

## Ghi chú triển khai

- Feature không flag riêng ngoài `lichkhoa_ui_mode`.
- Rollback: xóa nhánh mobile trong App hoặc set mode=`desktop`.

## Smoke test thủ công

1. DevTools iPhone width → thấy bottom nav + agenda ngày.
2. Chọn ngày / tuần trước-sau → nội dung đổi.
3. Ép desktop: `localStorage.setItem('lichkhoa_ui_mode','desktop'); location.reload()`.
4. Desktop rộng → Navbar + Sheet như cũ.
