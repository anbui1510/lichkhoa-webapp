# Implementation Plan — F-304

**Spec:** [spec.md](./spec.md) · **Design:** [design.md](./design.md)

## Trạng thái

- [x] Spec / design
- [x] `google-apps-script/` bridge
- [x] `src/logic/sheetStore/`
- [x] `src/features/sheetSync/` + `scheduleStoreClient`
- [x] App wiring + Connect Sheet dialog
- [x] Tests TC-F304-01..04
- [x] DEPLOY-GOOGLE-SHEETS.md
- [x] Bootstrap khoa mới (Code.gs + FE) — TC-F304-07..09
- [x] Đồng bộ 2 chiều eventual (pull focus/interval, push conflict hint)

## Tasks

| # | Task | Done |
|---|------|------|
| 1 | SDD + INDEX + ARCHITECTURE | [x] |
| 2 | Sheet template CSV + deploy doc | [x] |
| 3 | Apps Script | [x] |
| 4 | Mapper + tests | [x] |
| 5 | FE adapter + App.jsx | [x] |
