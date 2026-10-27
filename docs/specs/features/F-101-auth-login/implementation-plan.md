# Implementation Plan — F-101: Đăng nhập API

**Trạng thái:** đã triển khai (retro-documented).

| # | Task | File | Done |
|---|------|------|------|
| 1 | Schema login | `profileValidator.js` | [x] |
| 2 | Route POST login | `userRoutes.js` | [x] |
| 3 | Controller + service | `userController.js`, `userService.js` | [x] |
| 4 | Test TC-F101-01..03 | `server/test/profileValidator.test.js` | [x] |

## Smoke

1. `npm run api:setup && npm run dev:api`
2. `curl -X POST localhost:4000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@lichkhoa.local","password":"admin123"}'`
