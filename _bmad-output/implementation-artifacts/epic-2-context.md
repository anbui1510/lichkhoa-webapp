# Epic 2 Context: Lịch chung trên Google Sheet (SoT)

<!-- Compiled for Epic 2 implementation. -->

## Goal

Nhiều người dùng cùng một nguồn lịch qua app → Express proxy → Google Spreadsheet; localStorage chỉ cache (FR19, AD-2, AD-8).

## Stories

- Story 2.1: Proxy đọc lịch từ Sheet SoT
- Story 2.2: Proxy ghi lịch lên Sheet SoT
- Story 2.3: Revision token cho đồng bộ an toàn
- Story 2.4: Cache local chỉ hỗ trợ, không SoT

## Requirements & Constraints

- Spreadsheet SoT đã liên kết ở 1.2 (`DeptScheduleConfig.spreadsheetId`).
- Chỉ server gọi Google Sheets; browser không giữ secret.
- Authorize JWT; Mod/Admin ghi vùng được phép; User không ghi vùng cấm.
- Revision + LWW (AD-6): đọc kèm revision; ghi kèm baseRevision; lệch → conflict signal.
- Cache: xem được offline kèm trạng thái; online lại Sheet thắng.

## Technical Decisions

- Payload lịch = JSON department store slice (tương thích `dbStore` / `sheetsByDept`) lưu trên tab Sheet dành riêng (vd. `_smoothwork_data`) + revision trên `_smoothwork_meta` hoặc cùng tab.
- API dưới `/api/schedule/...` cạnh F-103 `/config`.
- Widen Sheets scope read/write khi có credentials; không credentials → lỗi rõ (không giả SoT local).
- SDD: F-201 giữ engine; thêm F-210 (hoặc F-206) schedule sheet proxy.

## Cross-Story Dependencies

- 1.2 spreadsheetId bắt buộc trước khi sync.
- Epic 3+ dựa SoT Sheet; 2.3 nền cho Epic 4 concurrent.
