# Implementation Plan — F-303: Sync lịch lên Postgres (Supabase)

**Spec:** [spec.md](./spec.md) · **Design:** [design.md](./design.md)

## Trạng thái tổng

- [x] Spec approved
- [x] Design reviewed
- [x] Implementation
- [x] Tests (TC-F303-01/04 validator; TC-F303-02 route 401; TC-F303-03 cần DB)
- [x] Manual smoke với project Supabase `radescazwukbdfgqmepd` (db push + seed + PUT/GET schedule-store)

## Tasks

| # | Task | File | Done |
|---|------|------|------|
| 1 | Prisma postgresql + ScheduleStore | `server/prisma/schema.prisma` | [x] |
| 2 | Service + routes + app mount | `server/src/**` | [x] |
| 3 | FE scheduleApi + dbStore/App hydrate | `src/**` | [x] |
| 4 | Docs deploy Supabase | `docs/DEPLOY-SUPABASE.md` | [x] |
| 5 | INDEX + architecture | `docs/specs/*` | [x] |

## Ghi chú triển khai

1. Tạo project [supabase.com](https://supabase.com) → Settings → Database → URI (mode **URI**, prefer **Session** pooler hoặc direct port 5432 cho Prisma migrate).
2. `DATABASE_URL` trong `server/.env`.
3. `cd server && npx prisma db push && npm run db:seed`
4. Deploy API (Render/Railway) với cùng env; `CLIENT_ORIGIN` = URL frontend.

## Smoke test thủ công

1. Login admin → sửa 1 ô lịch → refresh / mở điện thoại cùng account → thấy thay đổi.
2. Logout → chỉ còn cache local (không đè cloud).
