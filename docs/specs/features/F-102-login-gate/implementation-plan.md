# Implementation Plan — F-102: Cổng đăng nhập

**Spec:** [spec.md](./spec.md) · **Design:** [design.md](./design.md)

## Trạng thái tổng

- [x] Spec approved
- [x] Design reviewed
- [x] Implementation
- [x] Tests (TC-F102-01..04)
- [ ] Manual smoke

## Tasks (theo thứ tự)

| # | Task | File dự kiến | Done |
|---|------|--------------|------|
| 1 | Spec + INDEX | `docs/specs/features/F-102-*`, `INDEX.md` | [x] |
| 2 | Helper `isSessionReady` + test | `sessionAuth.js`, `tests/loginGate.test.js` | [x] |
| 3 | `LoginGate.jsx` | `src/features/account/components/` | [x] |
| 4 | `useAccount` — logout clear Google; bootstrap không lách gate | `useAccount.js` | [x] |
| 5 | Gate trong `App.jsx` | `src/App.jsx` | [x] |
| 6 | `npm run sdd:check` + unit tests | — | [x] |

## Ghi chú triển khai

- UI shadcn (`Button`, `Input`, `Label`); CTA emerald theo DESIGN-UI.
- Không đổi F-101 API.
- Rollback: bỏ early-return LoginGate trong `App.jsx`.

## Smoke test thủ công

1. Mở app không token → thấy Login Gate, không bảng lịch.
2. Đăng nhập admin seed (API) hoặc Google (Sheet) → vào Sheet/Navbar.
3. Bấm Thoát → về gate + thông báo hết hạn phiên.
