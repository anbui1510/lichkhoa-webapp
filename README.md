# lichkhoa-webapp

Ứng dụng web quản lý **lịch khoa** (tuần, tháng, nghỉ, dạy học, staff, task) — React + Vite; API tài khoản tùy chọn (Express + Prisma).

## Chạy nhanh

```bash
npm install
npm run dev          # frontend http://localhost:5173

npm run api:setup    # lần đầu: DB + seed
npm run dev:api      # API http://localhost:4000
```

Tài khoản seed: xem [docs/ACCOUNT.md](docs/ACCOUNT.md).

## Phát triển tính năng (SDD)

Repo dùng **Spec-Driven Development** — không “vibe code” thẳng vào `App.jsx`.

| Tài liệu | Link |
|----------|------|
| Quy trình SDD | [docs/SDD/README.md](docs/SDD/README.md) |
| Danh mục feature | [docs/specs/INDEX.md](docs/specs/INDEX.md) |
| Agent / AI | [AGENTS.md](AGENTS.md) |

```bash
npm run sdd:check    # kiểm tra thư mục feature đủ spec/design/plan
npm run test         # test API validator (map TC trong spec F-101)
```

## Cấu trúc chính

- `src/logic/` — nghiệp vụ lịch (scheduler, cảnh báo, access, …)
- `src/components/` — UI lịch (legacy CSS)
- `src/components/ui/` — shadcn/ui (Button, Dialog, Input, …)
- `server/` — auth, profile, settings
- `docs/specs/` — đặc tả theo feature (hợp đồng dev + AI)
- `docs/DESIGN-UI.md` — map legacy ↔ shadcn, quy tắc UI
