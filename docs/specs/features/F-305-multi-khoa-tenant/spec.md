# F-305: Multi-khoa tenant (URL / env / Sheet mặc định)

| Trường | Giá trị |
|--------|---------|
| Trạng thái | implemented |
| Phụ thuộc | F-304, F-301 |
| Module | web |

## Mục tiêu

Nhiều khoa / bệnh viện: mỗi tenant có URL hoặc env riêng; nhân viên **không** dán link Sheet lần lượt; admin gán **deptId** trên NhanSu; member vào đúng khoa/phòng.

## Phạm vi

### In scope

- `resolveTenant()` từ env (`VITE_TENANT_*`, `VITE_TENANT_REGISTRY`) + hostname slug
- `getSpreadsheetId`: `?sheet=` → tenant → localStorage
- Navbar ẩn chọn khoa cho member có `staff.deptId`
- Cột Sheet **NhanSu**: `deptId`, `deptLabel`
- StaffManager: chọn khoa/phòng từ tenant catalog

### Out of scope

- Tạo Sheet Google từ app
- Multi-spreadsheet trong một file
- CORS multi-origin Render (vận hành thủ công)

## Ràng buộc nghiệp vụ

| ID | Điều kiện | Kết quả |
|----|-----------|---------|
| BR-305-01 | Host `{slug}-lichkhoa-webapp.pages.dev` hoặc registry | Resolve tenant entry |
| BR-305-02 | Tenant có `spreadsheetId` | Không bắt dialog kết nối sổ; ID dùng được ngay |
| BR-305-03 | Admin đổi sổ | Giữ F-304 Cài đặt; member read-only |
| BR-305-04 | Member + `staff.deptId` | Ẩn dropdown chọn khoa |
| BR-305-05 | NhanSu `deptId` | Map phòng/khoa con trong tenant |

## Test cases

| ID | Mô tả | Kỳ vọng |
|----|-------|---------|
| TC-F305-01 | resolveTenant env đơn | slug, label, spreadsheetId |
| TC-F305-02 | getSpreadsheetId + tenant id | Trả ID không cần localStorage |
| TC-F305-03 | import NhanSu deptId | Round-trip deptId |

## Definition of Done

- [x] spec / design / implementation-plan
- [x] tenant.js + sheetStorage + UI
- [x] DEPLOY-MULTI-KHOA.md
- [x] `npm run sdd:check`
