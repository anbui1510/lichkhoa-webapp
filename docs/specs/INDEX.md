# Danh mục feature (SDD)

Cập nhật khi thêm feature mới. Mã `F-1xx` = API/tài khoản, `F-2xx` = lịch & scheduler, `F-3xx` = phân quyền & dữ liệu / sync.

| ID | Slug | Mô tả ngắn | Trạng thái | Thư mục |
|----|------|------------|------------|---------|
| — | — | Yêu cầu & kiến trúc hệ thống | living doc | [00-REQUIREMENTS.md](./00-REQUIREMENTS.md), [00-ARCHITECTURE.md](./00-ARCHITECTURE.md) |
| F-101 | auth-login | POST `/api/auth/login` — JWT | implemented | [features/F-101-auth-login](./features/F-101-auth-login/) |
| F-102 | auth-google-bootstrap | POST `/api/auth/google` — bootstrap Admin (Q1=C) | implemented | [features/F-102-auth-google-bootstrap](./features/F-102-auth-google-bootstrap/) |
| F-102 | login-gate | Màn hình đăng nhập chặn app trước khi vào view | implemented | [features/F-102-login-gate](./features/F-102-login-gate/) |
| F-103 | schedule-sheet-link | GET/PUT `/api/schedule/config` — liên kết Spreadsheet SoT | implemented | [features/F-103-schedule-sheet-link](./features/F-103-schedule-sheet-link/) |
| F-104 | roster-people | CRUD `/api/roster` — danh sách tên + role Admin/Mod/User | implemented | [features/F-104-roster-people](./features/F-104-roster-people/) |
| F-105 | roster-link-google | Google pending + `POST /api/roster/:id/link` + resolveActor Mod/User | implemented | [features/F-105-roster-link-google](./features/F-105-roster-link-google/) |
| F-201 | weekly-auto-schedule | Sinh lịch tuần tự động (5 lớp) | implemented | [features/F-201-weekly-auto-schedule](./features/F-201-weekly-auto-schedule/) |
| F-203 | mobile-schedule | Layout mobile: agenda ngày + bottom nav | implemented | [features/F-203-mobile-schedule](./features/F-203-mobile-schedule/) |
| F-210 | schedule-sheet-proxy | GET/PUT `/api/schedule/data` — Sheet SoT JSON + revision LWW | implemented | [features/F-210-schedule-sheet-proxy](./features/F-210-schedule-sheet-proxy/) |
| F-211 | room-primary-deputy | RoomTable chính/phụ + placeWards FR5 + false-warning subset | implemented | [features/F-211-room-primary-deputy](./features/F-211-room-primary-deputy/) |
| F-212 | week-publish | Draft/Public/Unpublish tuần; User mask draft | implemented | [features/F-212-week-publish](./features/F-212-week-publish/) |
| F-213 | week-grid-p0 | Lưới P0 (audit + room drag-swap) | implemented | [features/F-213-week-grid-p0](./features/F-213-week-grid-p0/) |
| F-214 | leave-lock-window | Cửa sổ khóa nghỉ + User ghi SoT (Epic 4.1/4.2/4.5 nền) | implemented | [features/F-214-leave-lock-window](./features/F-214-leave-lock-window/) |
| F-301 | access-control | Phân quyền tab theo staff/member | implemented | [features/F-301-access-control](./features/F-301-access-control/) |
| F-303 | schedule-cloud-sync | Sync lịch ↔ Postgres (Supabase); mobile+desktop | implemented | [features/F-303-schedule-cloud-sync](./features/F-303-schedule-cloud-sync/) |
| F-304 | google-sheets-backend | Lịch khoa ↔ Google Sheet (tab NhanSu RBAC) | implemented | [features/F-304-google-sheets-backend](./features/F-304-google-sheets-backend/) |
| F-305 | multi-khoa-tenant | Tenant URL/env + Sheet mặc định + deptId NhanSu | implemented | [features/F-305-multi-khoa-tenant](./features/F-305-multi-khoa-tenant/) |
| F-306 | hospital-catalog-discovery | Một URL — catalog Sheet + discover khoa theo email | implemented | [features/F-306-hospital-catalog-discovery](./features/F-306-hospital-catalog-discovery/) |

Deploy: [DEPLOY-MULTI-KHOA.md](../DEPLOY-MULTI-KHOA.md) · [DEPLOY-GOOGLE-SHEETS.md](../DEPLOY-GOOGLE-SHEETS.md) · [DEPLOY-SUPABASE.md](../DEPLOY-SUPABASE.md)

## Feature tiếp theo (gợi ý)

- F-215: User đổi lịch tháng trong cửa sổ (Epic 4.3) + gate `monthLockAt`
- F-216: User đăng ký lịch học Template Nội (Epic 4.4)
- F-202: export PDF/Excel lịch
- F-302: liên kết tài khoản ↔ bác sĩ local (`findLinkedStaff`) — song song roster F-105
