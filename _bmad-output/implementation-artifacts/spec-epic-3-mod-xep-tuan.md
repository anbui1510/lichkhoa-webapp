---
title: 'Epic 3 — Mod xếp tuần (3.1–3.8)'
type: 'feature'
created: '2026-11-19'
status: 'done'
---

## Intent

Mod setup chính/phụ → Auto tuần (F-201) → lưới P0 → Public/Unpublish; User chỉ thấy tuần published.

## Mapping

| Story | Feature |
|-------|---------|
| 3.1–3.4 | F-211 |
| 3.5 | F-213 |
| 3.6–3.8 | F-212 |

## Verification

- `npm run test:sheet` — TC-F211 / TC-F212 pass
- `npm run sdd:check` — OK
- Live Sheet smoke: cần `GOOGLE_SHEETS_*` (F-210)
