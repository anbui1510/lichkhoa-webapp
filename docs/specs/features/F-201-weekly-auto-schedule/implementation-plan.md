# Implementation Plan — F-201

**Trạng thái:** implemented (engine ~800 LOC).

| # | Task | Done |
|---|------|------|
| 1 | `buildWeekDays`, `emptyWeekGrid`, holidays | [x] |
| 2 | Layers 1–2 month + VG | [x] |
| 3 | Layers 3–4 leave + teach | [x] |
| 4 | Layer 5 pins + weekly task order | [x] |
| 5 | Wire alerts | [x] |
| 6 | Unit tests TC-F201-04+ | [ ] backlog |

## Smoke (manual)

1. `npm run dev` — mở Lịch tuần
2. Có dữ liệu tháng + staff + task
3. Chạy auto schedule — kiểm tra ô T2 và cảnh báo sidebar
