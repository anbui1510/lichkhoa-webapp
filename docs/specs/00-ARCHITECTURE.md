# Kiến trúc hệ thống — lichkhoa-webapp

## Sơ đồ tổng quan

```mermaid
flowchart TB
  subgraph browser [Browser mobile or desktop]
    UI[React App.jsx + components]
    Cache[(localStorage cache)]
    UI --> Cache
  end
  subgraph apiHost [API host Render or Railway]
    API[Express app.js]
  end
  subgraph supabase [Supabase]
    PG[(Postgres)]
  end
  UI -->|"JWT /api"| API
  API --> PG
  Logic[src/logic/* pure JS]
  UI --> Logic
```

## Frontend

| Khu vực | Vai trò |
|---------|---------|
| `src/App.jsx` | Orchestration: tab, sheet state, persist |
| `src/components/*` | Lịch tuần/tháng, toolbar, modals |
| `src/logic/*` | Nghiệp vụ thuần: schedule, cảnh báo, merge, access |
| `src/store/dbStore.js` | Seed & persist department JSON |
| `src/features/account/*` | Auth UI + `accountApi` |

## Backend

| Route prefix | Module |
|--------------|--------|
| `/api/auth` | Register, login, Google, me |
| `/api/profile` | Hồ sơ, avatar |
| `/api/settings` | Cài đặt, mật khẩu |
| `/api/schedule-store` | GET/PUT snapshot lịch (F-303) |

Validators: Zod trong `server/src/validators/*`.

## Dữ liệu lịch

Một **department** gồm: `staff[]`, `tasks[]`, sheets (week/month/…), grids, warnings, BU ledger fields.

- **Cache:** `localStorage` (`LICHKHOA_DATA_STORE_V1`)
- **Nguồn đồng bộ (khi login):** Postgres Supabase qua `ScheduleStore` (F-303) — mobile và desktop cùng user thấy cùng lịch
- Deploy: [DEPLOY-SUPABASE.md](../DEPLOY-SUPABASE.md)

## Quy ước mở rộng

1. Logic nghiệp vụ **ưu tiên** `src/logic/` (testable, không JSX).
2. API mới: route → controller → service → Prisma; spec mô tả status code & body.
3. Feature flag: chưa dùng; nếu cần ghi trong design feature.
