# Epic 1 Context: Đăng nhập Google & phân quyền

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Thiết lập nền xác thực và phân quyền Phase Nội: Admin bootstrap bằng Google, liên kết Spreadsheet SoT của khoa, tạo danh sách người và gán Admin/Mod/User; Mod/User đăng nhập Google rồi liên kết đúng tên đã phân để chỉ thấy/thực hiện đúng quyền. Epic này thay hẳn login mật khẩu/local làm đường chính, mở đường cho đồng bộ lịch qua proxy (Epic 2) và mọi thao tác xếp lịch theo role.

## Stories

- Story 1.1: Admin đăng nhập Google lần đầu (bootstrap)
- Story 1.2: Admin liên kết Google Sheet trong Cài đặt
- Story 1.3: Admin setup danh sách người + phân quyền
- Story 1.4: Mod/User đăng nhập Google và liên kết tên

## Requirements & Constraints

- Chỉ tài khoản Google được phép đăng nhập; tài khoản ngoài allowlist không vào app. Sau cutover, mật khẩu/local auth không còn đường mặc định cho phiên mới/hàng ngày.
- Ba vai trò theo mục đích vận hành:
  - **Admin:** full — liên kết Sheet DB, tài khoản Google, cấu hình khóa/template, vận hành, nhật ký đầy đủ (theo chính sách).
  - **Mod:** xếp lịch — auto tuần, sửa lưới tuần/tháng, Public/Unpublish, gửi lịch liên khoa; setup Phân công bệnh phòng.
  - **User:** xem tuần sau Public; tự phục vụ nghỉ/tháng/học trong cửa sổ khóa; không Public và không sửa lịch tuần ngoài quyền xem.
- Admin tạo/sửa danh sách tên và gán role trước khi người dùng tự liên kết; một tên không bị hai người liên kết (hoặc có quy tắc Admin xử lý).
- Liên kết Spreadsheet SoT hợp lệ trong Cài đặt; lỗi link/quyền báo rõ; chưa liên kết thì nhắc setup, không crash.
- Thành công vận hành: Google login đủ ổn để Mod dựa app là chính; role khớp quyền Public / sửa lịch / cấu hình.
- Bảo mật: authorize Admin/Mod/User trên Express; browser không giữ Sheet secret. UI tiếng Việt; desktop-first.
- Mở trước cutover: chính sách migrate/map identity local → Google (allowlist email / map User↔Staff) — cần chốt trước khi khóa FR đăng nhập.

## Technical Decisions

- Session = JWT từ `POST /api/auth/google` (stack Google auth + Prisma). Prisma/SQLite|Postgres **chỉ** auth/profile/session và map User↔Staff — **không** SoT lưới lịch.
- User record phải map tới staff identity khoa trước khi nhận quyền Mod/User lịch.
- Mọi đọc-ghi lịch sau này đi Express kèm `Authorization: Bearer <jwt>`; server authorize role rồi mới gọi Sheets API hoặc Apps Script. Client chỉ hỗ trợ UX quyền, không phải nguồn authorize.
- Spreadsheet SoT do Admin liên kết ở Epic này; lịch vận hành chung qua app → proxy → Sheet (nền Epic 2). localStorage chỉ cache.
- Brownfield: mở rộng React/Vite + Express hiện có; UI Account/dialogs theo shadcn; không invent kit mới.
- Header/convention: JWT Bearer; naming theo glossary (Admin, Mod, User).

## UX & Interaction Patterns

- **Admin bootstrap:** nhận link → Google login lần đầu (email được phép) → vào full app → Cài đặt: liên kết Sheet → setup danh sách tên + gán Admin/Mod/User.
- **Mod/User:** Google login → Liên kết tài khoản → chọn đúng tên Admin đã tạo → session gắn tên + role; UI/API chỉ mở đúng quyền (không full Admin).
- Không UX design contract riêng; bám journey đăng nhập/phân quyền trên; không bắt buộc mật khẩu local làm bước chính.

## Cross-Story Dependencies

- 1.1 → nền cho 1.2 / 1.3; 1.3 phải có danh sách + role trước 1.4.
- 1.2 mở đường Epic 2 (proxy đọc/ghi Sheet SoT); chưa liên kết Sheet thì không kỳ vọng sync lịch đầy đủ.
- Phân quyền Epic 1 là điều kiện cho mọi story xếp lịch / Public / tự phục vụ ở Epic 3–5.
- Phụ thuộc chốt migrate Google (OQ-5) trước cutover FR đăng nhập.
