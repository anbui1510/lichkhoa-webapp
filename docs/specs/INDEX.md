# Danh mục feature (SDD)

Cập nhật khi thêm feature mới. Mã `F-1xx` = API/tài khoản, `F-2xx` = lịch & scheduler, `F-3xx` = phân quyền & dữ liệu / sync.

| ID | Slug | Mô tả ngắn | Trạng thái | Thư mục |
|----|------|------------|------------|---------|
| — | — | Yêu cầu & kiến trúc hệ thống | living doc | [00-REQUIREMENTS.md](./00-REQUIREMENTS.md), [00-ARCHITECTURE.md](./00-ARCHITECTURE.md) |
| F-101 | auth-login | POST `/api/auth/login` — JWT | implemented | [features/F-101-auth-login](./features/F-101-auth-login/) |
| F-201 | weekly-auto-schedule | Sinh lịch tuần tự động (5 lớp) | implemented | [features/F-201-weekly-auto-schedule](./features/F-201-weekly-auto-schedule/) |
| F-203 | mobile-schedule | Layout mobile: agenda ngày + bottom nav | implemented | [features/F-203-mobile-schedule](./features/F-203-mobile-schedule/) |
| F-301 | access-control | Phân quyền tab theo staff/member | implemented | [features/F-301-access-control](./features/F-301-access-control/) |
| F-303 | schedule-cloud-sync | Sync lịch ↔ Postgres (Supabase); mobile+desktop | implemented | [features/F-303-schedule-cloud-sync](./features/F-303-schedule-cloud-sync/) |
| F-304 | google-sheets-backend | Lịch khoa ↔ Google Sheet (tab NhanSu RBAC) | implemented | [features/F-304-google-sheets-backend](./features/F-304-google-sheets-backend/) |

Deploy: [DEPLOY-SUPABASE.md](../DEPLOY-SUPABASE.md) · [DEPLOY-GOOGLE-SHEETS.md](../DEPLOY-GOOGLE-SHEETS.md)

## Feature tiếp theo (gợi ý)

- F-102: đăng ký / Google OAuth (mở rộng từ [ACCOUNT.md](../ACCOUNT.md))
- F-202: export PDF/Excel lịch
- F-302: liên kết tài khoản ↔ bác sĩ (`findLinkedStaff`) — UI đã có một phần
- F-305: multi-khoa registry (deep link nhiều spreadsheetId)
