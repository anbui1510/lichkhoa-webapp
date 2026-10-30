# Yêu cầu sản phẩm — lichkhoa-webapp

**Phiên bản tài liệu:** 1.0 · **Đối tượng:** quản lý lịch khoa (bác sĩ, ca trực, phòng, nghỉ, dạy học)

## Tóm tắt

Ứng dụng web giúp khoa lập và duy trì **lịch tuần**, **lịch tháng**, **lịch nghỉ**, **lịch dạy**, xem **calendar**, **dashboard công bằng ca**, quản lý **danh sách bác sĩ** và **task**. Dữ liệu lịch chủ yếu lưu **client** (`localStorage` qua `dbStore`); module **tài khoản** có API Node/Express + Prisma tùy chọn.

## Persona

| Persona | Mục tiêu |
|---------|----------|
| Trưởng khoa / admin | Sửa toàn bộ lịch, staff, task |
| Bác sĩ (member) | Xem/sửa tab được cấp trong `staff.access` |
| Khách (chưa link staff) | Chỉ xem hạn chế / không sửa |

## Chức năng cấp hệ thống

| ID | Chức năng | Ghi chú |
|----|-----------|---------|
| SYS-01 | Lịch tuần (grid S/R/C/T) | Auto-schedule, cảnh báo, khóa ô |
| SYS-02 | Lịch tháng / nghỉ / dạy / CATH | Logic riêng trong `src/logic/*` |
| SYS-03 | Quản lý bác sĩ & task | `StaffManager`, `TaskManager` |
| SYS-04 | Export Excel/PDF/iCal | `src/services/*` |
| SYS-05 | Tài khoản & cài đặt | API + fallback local — xem [ACCOUNT.md](../ACCOUNT.md) |
| SYS-06 | Phân quyền theo tab | `src/logic/access.js` — spec F-301 |

## Phi chức năng

| ID | Yêu cầu |
|----|---------|
| NFR-01 | Chạy offline được cho phần lịch (localStorage) |
| NFR-02 | UI tiếng Việt, font Roboto (PDF) |
| NFR-03 | API JSON, JWT cho route bảo vệ |
| NFR-04 | Mọi tính năng mới có bộ SDD trong `docs/specs/features/` |

## Ràng buộc kỹ thuật

- Frontend: React 18 + Vite
- Backend (tùy chọn): Express, Prisma (SQLite dev / Postgres prod)
- Không thêm framework state global; state lịch trong `App.jsx` + `dbStore`

## Traceability

Chi tiết từng capability → thư mục feature trong [INDEX.md](./INDEX.md).
