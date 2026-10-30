# Design — F-101: Đăng nhập API

## Luồng

```text
Client POST /api/auth/login
  → validateBody(loginSchema)
  → userController.login
  → userService.verifyCredentials
  → jwt.sign → res.json({ token, user })
```

## Thành phần

| Layer | File | Trách nhiệm |
|-------|------|-------------|
| Route | `server/src/routes/userRoutes.js` | Mount POST `/login` |
| Validation | `server/src/validators/profileValidator.js` | `loginSchema` |
| Controller | `server/src/controllers/userController.js` | HTTP status |
| Service | `server/src/services/userService.js` | DB + bcrypt |
| Config | `server/src/config/jwt.js` | Secret, expiry |

## Dữ liệu

- Model `User` (`server/prisma/schema.prisma`): `email` unique, `passwordHash`.

## Lỗi

| HTTP | Nguồn |
|------|--------|
| 400 | `validateRequest` + Zod |
| 401 | Service khi credential fail |
| 500 | Unhandled |

## Frontend (tham chiếu)

`src/features/account/services/accountApi.js` gọi login, lưu token localStorage — chi tiết nằm ngoài F-101 nhưng consumer chính.
