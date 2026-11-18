# Design — F-102: Cổng đăng nhập

## Tổng quan

```text
Mở app
  → account.bootstrap()
  → !sessionReady ?
       LoginGate (card)
         → login(email, password) | loginWithGoogle(credential)
         → sessionReady → App shell (Navbar / MobileShell + views)
  → Thoát → logout() → clear tokens → sessionNotice=expired → LoginGate
```

## Thành phần

| Layer | File / module | Trách nhiệm |
|-------|---------------|-------------|
| Helper | `src/features/account/sessionAuth.js` | `isSessionReady({ backend, token, googleToken, user, offline })` |
| UI | `src/features/account/components/LoginGate.jsx` | Card đăng nhập (shadcn Input/Label/Button + Google) |
| Hook | `src/features/account/hooks/useAccount.js` | logout xoá Google token; bootstrap không «lách» gate bằng local profile khi có token chết |
| Notice | `sessionStorage` `LICHKHOA_SESSION_NOTICE` | `expired` sau logout / me fail |
| Orchestration | `src/App.jsx` | Nếu `!sessionReady` → chỉ `LoginGate` |

## Luồng dữ liệu

1. `useAccount` bootstrap: không token → `user=null` (không load local profile vào session app).
2. Login API → JWT + user; Login Google → ID token (+ JWT nếu API có).
3. `App` tính `sessionReady` qua helper dùng chung với sync cloud.
4. Logout → xoá JWT, Google token, user; set notice `expired`.

## Mô hình dữ liệu

- JWT: `localStorage` `LICHKHOA_AUTH_TOKEN` (F-101)
- Google ID token: `sessionStorage` `LICHKHOA_GOOGLE_ID_TOKEN` (F-304)
- Notice: `sessionStorage` `LICHKHOA_SESSION_NOTICE`

## Lỗi & edge cases

| Tình huống | Xử lý |
|------------|--------|
| API down, Sheet backend | Chỉ Google; lỗi password hiện form-error |
| Roster trống | Fallback input Email thay select nhân viên |
| Chưa chọn nhân viên | Password disabled; nút submit disabled |
| Guest cần gắn NhanSu | Vào app rồi Account / LinkStaff (F-301) — đã qua gate |

## Bảo mật / quyền

- Gate chỉ kiểm tra phiên; phân quyền tab vẫn `access.js` sau login.
- Không lưu mật khẩu; không bypass bằng offline local trên gate.
