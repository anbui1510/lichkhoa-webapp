# Design — F-212: Week publish

## Thành phần

| Layer | File | Trách nhiệm |
|-------|------|-------------|
| Logic | `src/logic/weekPublish.js` | status, mask, audit |
| App | `App.jsx` | handlers + mask `scheduleData` |
| UI | `SheetToolbar.jsx`, `SheetView.jsx` | Public/Unpublish + banner |

## Luồng

1. Mod soạn tuần draft → User thấy banner “chưa công bố”.
2. Public → `publishStatus=published` + audit.
3. Unpublish → draft lại; User mask.
