# Design — F-304 Google Sheets backend

## Kiến trúc

```
SPA → sheetSync (idToken) → Apps Script Web App → Spreadsheet tabs
         ↓
    sheetStore import/export ↔ LICHKHOA_DATA_STORE_V1 (cache localStorage)
         ↓
    F-301 access.js (actor từ NhanSu + email Google)
```

## Tab Sheet (hàng 1 = header)

### `_meta` (cột A=key, B=value)

`schemaVersion`, `updatedAt`, `activeDeptId`, `deptName`, `deptCode`

### `NhanSu`

`id`, `name`, `shortName`, `title`, `dutyQuota`, `buBalance`, `phepBalance`, `email`, `loginEmail`, `position`, `accessRole`, `access_week`, `access_month`, `access_leave`, `access_study`, `access_calendar`, `access_dashboard`, `access_staff`, `access_tasks`

### `Task`

`id`, `code`, `name`, `category`, `session`, `scope`, `description`, `bgColor`, `textColor`, `blocker`, `delta`, `dutyRole`, `encodeDuty`, `buRt`, `buVg`, `deltaRt`, `deltaVg`, `triggerRT`, `ownersJson`, `ownerOrderJson`, `fixedDaysJson`, `fixedSlotsJson`, `locksJson`

### `LichNghi` / `LichHoc`

`id`, `staffId`, `fromDate`, `toDate`, `note`, `type` (leave); `id`, `staffId`, `fromDate`, `toDate`, `note` (study)

### `LichTuan`

`recordType`, `sheetId`, `sheetName`, `startDate`, `weekStart`, `staffId`, `dayIndex`, `slot`, `value`

- `recordType=sheet_meta`: các cột meta cho workbook tuần
- `recordType=week_cell`: ô lịch (slot = S|R|C|T)

### `LichThang`

`recordType`, `sheetId`, `monthKey`, `field`, `key`, `value`

- `field=month_cell` → key = cellKey trong `monthGrid`
- `field=meta` → monthColumnOrder, monthRoles (JSON string in value)

### `Dashboard`

`metric`, `staffId`, `label`, `value`, `updatedAt` (snapshot MVP)

## Map tab ↔ F-301

| Tab | access tab id |
|-----|----------------|
| LichTuan | week |
| LichThang | month |
| LichNghi | leave |
| LichHoc | study |
| NhanSu | staff |
| Task | tasks |
| Dashboard | dashboard |

## AuthZ (Apps Script)

1. Verify `idToken` qua `https://oauth2.googleapis.com/tokeninfo?id_token=`
2. Đọc `NhanSu`, match `loginEmail` hoặc `email` (lowercase)
3. `push`: lọc tab theo `canEdit` (script mirror F-301 rules đơn giản)

## Bootstrap (khoa mới)

- `isNhanSuEmpty`: không có dòng data với cột `id`
- `getProfile`: nếu empty → `{ bootstrapEligible: true, email, updatedAt }`
- `bootstrap`: POST tabs (giống push) + ghi `_meta`; từ chối 409 nếu đã có nhân sự
- FE: dialog “Thiết lập khoa” → `exportStoreToTabs` (admin `loginEmail` = Gmail đăng nhập)

## Đồng bộ FE (eventual)

- App → Sheet: debounce push qua `saveStore`
- Sheet → App: pull sau login/đổi sổ, `visibilitychange`, interval ~45s, nút sync
- Trước push: nếu `_meta.updatedAt` remote > local → pull trước
