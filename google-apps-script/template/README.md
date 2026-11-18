# Sheet mẫu — tab & header (F-304)

Tạo Spreadsheet với các tab sau. Hàng 1 = header (copy từ cột trong design).

| Tab | Mục đích |
|-----|----------|
| `_meta` | Cột A=key, B=value: `schemaVersion`, `updatedAt`, `activeDeptId`, `deptName`, `deptCode` |
| `NhanSu` | Nhân sự + `loginEmail` + `accessRole` + `access_week` … |
| `Task` | Ca trực / task |
| `LichTuan` | `recordType`, `sheetId`, … — xem design.md |
| `LichThang` | Lịch tháng (cell + meta) |
| `LichNghi` | Lịch nghỉ |
| `LichHoc` | Lịch học |
| `Dashboard` | Snapshot KPI (tuỳ chọn) |

Chi tiết cột: [design.md](../../docs/specs/features/F-304-google-sheets-backend/design.md).
