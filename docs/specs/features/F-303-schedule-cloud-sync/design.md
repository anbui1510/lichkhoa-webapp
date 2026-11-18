# Design — F-303: Sync lịch lên Postgres (Supabase)

## Tổng quan

```
Mobile / Desktop (cùng SPA)
        │  JWT
        ▼
   Express API  ──────►  Postgres (Supabase)
   GET/PUT /api/schedule-store
        │
        ▼
   localStorage cache (offline)
```

Supabase **chỉ là DB Postgres** (+ connection pooler). Auth vẫn JWT Express hiện có (F-101).

## Thành phần

| Layer | File | Trách nhiệm |
|-------|------|-------------|
| Prisma | `server/prisma/schema.prisma` | `provider = postgresql`, model `ScheduleStore` |
| Service | `server/src/services/scheduleStoreService.js` | get / upsert |
| Route | `server/src/routes/scheduleStoreRoutes.js` | GET/PUT |
| FE API | `src/features/scheduleSync/scheduleApi.js` | gọi API |
| Store | `src/store/dbStore.js` | save local + queue cloud push |
| App | `src/App.jsx` | hydrate từ cloud sau login |

## Luồng dữ liệu

1. Login → JWT trong `localStorage`
2. `pullScheduleStore()` → nếu 200 và mới hơn local → `setStore` + `saveStore(local only)`
3. Mọi thay đổi lịch → debounce `saveStore` → local + `pushScheduleStore`
4. 401/network → giữ local, không chặn UI

## Mô hình dữ liệu

```prisma
model ScheduleStore {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(...)
  payload   Json
  updatedAt DateTime @updatedAt
  createdAt DateTime @default(now())
}
```

`payload` ≈ shape `LICHKHOA_DATA_STORE_V1` (`departments`, `sheetsByDept`, …).

## Lỗi & edge cases

| Tình huống | Xử lý |
|------------|--------|
| Chưa từng PUT | GET 404 → FE push local |
| Hai tab cùng sửa | Last-write-wins |
| Payload quá lớn | 413 / limit Express 5mb |
| API down | Offline local |

## Bảo mật / quyền

- Mọi route `authMiddleware`
- User chỉ đọc/ghi **store của chính mình** (`userId` từ JWT)
- Chia sẻ đa user cùng khoa: phase sau (orgId)
