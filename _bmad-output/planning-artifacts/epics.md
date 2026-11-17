---
status: final
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-Smoothwork-2026-11-17/prd.md
  - _bmad-output/planning-artifacts/prds/prd-Smoothwork-2026-11-17/addendum.md
  - _bmad-output/planning-artifacts/architecture/architecture-Smoothwork-2026-11-17/ARCHITECTURE-SPINE.md
  - docs/specs/features/F-201-weekly-auto-schedule/spec.md
---

# Smoothwork - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Smoothwork (phase Nội), decomposing the requirements from the PRD and Architecture (plus F-201 baseline) into implementable stories. UX design contract: không có — UX-DR bỏ trống.

## Requirements Inventory

### Functional Requirements

FR1: User/Mod/Admin đăng nhập Smoothwork bằng Google account được phép (JWT).
FR2: Ngắt login mật khẩu/local làm đường chính sau cutover; migrate/map identity sang Google.
FR3: Admin gán vai trò Admin / Mod / User; quyền khớp Public, sửa lịch, cấu hình.
FR4: Mod chạy Auto lịch tuần bằng một thao tác; không auto tháng/nghỉ/học.
FR5: Auto xếp bệnh phòng: thử BS chính → phụ theo thứ tự → trống + cảnh báo (Policy phụ nhận hết); không ½ phòng / không BS ngoài list.
FR6: Giảm/tắt/sửa Cảnh báo giả theo danh sách ưu tiên product (OQ-1).
FR7: Lưới P0 trên sheet được phép sửa: multi-select, copy/cut/paste, đậm/nghiêng, màu chữ/nền, kéo-thả, undo/redo (desktop).
FR8: User thấy tuần trống/chưa công bố cho đến khi Mod Public; Mod vẫn xem/sửa draft.
FR9: Mod Public Lịch tuần đang soạn → User trong khoa xem được.
FR10: Mod Unpublish → User mất bản chốt; Mod sửa rồi Public lại; ghi audit.
FR11: User sửa Lịch nghỉ trong cửa sổ khóa (ngày cấu hình được).
FR12: User đổi Lịch tháng với User khác trong cửa sổ; sau khóa qua Mod.
FR13: User đăng ký/sửa Lịch học trong phạm vi template Nội.
FR14: Admin (hoặc ủy quyền) cấu hình ngày/giờ khóa nghỉ và tháng.
FR15: Concurrent: last-write-wins theo revision trên SoT.
FR16: Báo conflict UI + ghi nhật ký khi baseRevision lệch / bị ghi đè.
FR17: Ghi nhật ký sự kiện thay đổi lịch quan trọng (ai–khi–sheet/ô–hành động–diff).
FR18: Admin/Mod xem/lọc nhật ký sự kiện theo thời gian.
FR19: SoT lịch bền vững trên Google Sheet; tuần bình thường không cần Sheet cũ song song ngoài SoT.
FR20: Mod chia sẻ lịch liên khoa; người ngoài khoa chỉ xem.
FR21: Vận hành trên Template Nội (Tim mạch); chỗ cắm templateId cho sau.
FR22: UI Phân công bệnh phòng có dòng BS chính và BS phụ; Mod/Admin setup; Auto đọc cấu hình này.
FR23: (F-201 baseline) Giữ 5 layer auto tuần BR-201-01…06 và nguyên lý đổ tháng / nghỉ–tháng thắng / bù–phép trừ phần phòng & cảnh báo giả do FR5/FR6 đổi.

### NonFunctional Requirements

NFR1: Platform desktop-first; mobile không phải AC phase Nội.
NFR2: Performance: lưới P0 và auto tuần đủ nhanh cho buổi xếp của Mod (ngưỡng cụ thể hóa khi implement).
NFR3: Reliability: không mất trạng thái Public / audit đã commit trên SoT.
NFR4: Security: authorize Admin/Mod/User trên Express proxy; browser không giữ Sheet secret; liên khoa không leo thang thành sửa.
NFR5: Auditability: mọi thay đổi vận hành quan trọng có event log (FR17).
NFR6: i18n: UI tiếng Việt.
NFR7: Domain logic thuần trong `src/logic` (AD-1); một implementation `generateWeeklySchedule` (AD-9).
NFR8: Chỉ server gọi Google Sheet SoT (AD-8); localStorage chỉ cache (AD-2).

### Additional Requirements

- Brownfield: không starter greenfield; mở rộng React/Vite + Express hiện có.
- SoT lịch = Google Spreadsheet; Prisma chỉ auth/profile/map User↔Staff (AD-2, AD-3).
- Express = JWT proxy: đọc/ghi Sheet, Public meta, revision LWW, audit tab (AD-4…AD-8).
- Spike chọn Sheets API vs Apps Script (Deferred spine) + SDD `F-xxx` cho tab schema (AD-12).
- `roomTable` trên SoT: hàng chính + phụ ordered; `placeWards` FR5/FR22 (AD-10).
- UI kit: Account/dialogs shadcn; sheet chrome legacy trừ khi hỏi (AD-13).
- Cutover: bỏ phụ thuộc Sheet lịch cũ song song ngoài Spreadsheet SoT đã chọn.
- Deploy/env: Sheet id dev vs prod + secrets trên server (Deferred ops).
- F-201: layers VG→RT, month pour, leave, teaching, pins+weekly tasks; unit/fixture regression khi đổi `placeWards`.
- Open trước implement: OQ-1 cảnh báo giả; OQ-2 fixture phòng; OQ-5 migrate Google; OQ-6 widget nhiều phụ.

### UX Design Requirements

Không có UX design contract trong planning artifacts. UX-DR: *không áp dụng* — story UI bám PRD journeys + AD-13; có thể bổ sung sau `bmad-ux`.

### FR Coverage Map

FR1: Epic 1 — Đăng nhập Google  
FR2: Epic 1 — Ngắt login cũ  
FR3: Epic 1 — Gán vai trò Admin/Mod/User  
FR4: Epic 3 — Auto tuần 1 click  
FR5: Epic 3 — Xếp phòng chính → phụ  
FR6: Epic 3 — Giảm cảnh báo giả  
FR7: Epic 3 — Lưới P0  
FR8: Epic 3 — Ẩn tuần draft với User  
FR9: Epic 3 — Public tuần  
FR10: Epic 3 — Unpublish  
FR11: Epic 4 — Sửa lịch nghỉ trong cửa sổ  
FR12: Epic 4 — Đổi lịch tháng  
FR13: Epic 4 — Lịch học tự đăng ký  
FR14: Epic 4 — Cấu hình ngày khóa  
FR15: Epic 4 — LWW revision  
FR16: Epic 4 — Báo conflict  
FR17: Epic 5 — Ghi nhật ký  
FR18: Epic 5 — Xem nhật ký  
FR19: Epic 2 — Google Sheet SoT + sync  
FR20: Epic 5 — Liên khoa chỉ xem  
FR21: Epic 5 — Template Nội  
FR22: Epic 3 — UI bảng chính/phụ  
FR23: Epic 3 — Baseline F-201 layers  

## Epic List

### Epic 1: Đăng nhập Google & phân quyền
Admin nhận link → Google (lần đầu full) → Cài đặt liên kết Sheet → setup + phân quyền danh sách tên. Mod/User Google login → Liên kết tài khoản với tên đã phân → chỉ thấy đúng quyền role.  
**FRs covered:** FR1, FR2, FR3

### Epic 2: Lịch chung trên Google Sheet (SoT)
Nhiều người cùng một nguồn lịch qua app → Express proxy → Sheet; localStorage chỉ cache.  
**FRs covered:** FR19

### Epic 3: Mod xếp tuần — auto, phòng, Public, lưới P0
Mod setup chính/phụ → auto tuần (giữ F-201) → lưới P0 → Public/Unpublish; User chỉ thấy tuần đã Public.  
**FRs covered:** FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR22, FR23

### Epic 4: User tự phục vụ nghỉ / tháng / học + concurrent
User sửa trong cửa sổ khóa; đổi tháng; LWW + báo conflict.  
**FRs covered:** FR11, FR12, FR13, FR14, FR15, FR16

### Epic 5: Audit, liên khoa & Template Nội
Truy vết ai sửa; chia sẻ ngoài khoa chỉ xem; gắn Template Nội.  
**FRs covered:** FR17, FR18, FR20, FR21

## Epic 1: Đăng nhập Google & phân quyền

Admin nhận link webapp → đăng nhập Google (lần đầu vào full app) → Cài đặt: liên kết Google Sheet → setup cơ bản và phân quyền danh sách tên. Mod/User có link → Google login → Liên kết tài khoản với đúng tên Admin đã tạo → chỉ thấy quyền của role đó (FR1–FR3).

### Story 1.1: Admin đăng nhập Google lần đầu (bootstrap)

As a Admin nhận link webapp,
I want đăng nhập Google lần đầu và vào được full app,
So that tôi setup khoa được ngay.

**Acceptance Criteria:**

**Given** khoa chưa có Admin / đây là lần bootstrap
**When** Admin đăng nhập Google thành công bằng email được phép
**Then** vào app với quyền Admin (full)
**And** không bắt buộc mật khẩu local làm bước chính (FR1, FR2)

### Story 1.2: Admin liên kết Google Sheet trong Cài đặt

As a Admin,
I want trong Cài đặt liên kết Spreadsheet SoT của khoa,
So that lịch sau này đồng bộ từ Sheet (mở đường Epic 2 / FR19).

**Acceptance Criteria:**

**Given** Admin đã đăng nhập
**When** Admin lưu liên kết Google Sheet hợp lệ trong Cài đặt
**Then** app/proxy biết Spreadsheet SoT của khoa
**And** link/quyền lỗi thì hiện thông báo rõ
**And** chưa liên kết thì nhắc setup, không crash

### Story 1.3: Admin setup danh sách người + phân quyền

As a Admin,
I want tạo/sửa danh sách tên và gán Admin/Mod/User,
So that mọi người sau này tự liên kết đúng chỗ.

**Acceptance Criteria:**

**Given** Admin đã vào được app (và ideally đã/đang setup khoa)
**When** Admin tạo tên (vd. A, B) và gán role User/Mod/Admin
**Then** danh sách sẵn sàng để liên kết tài khoản
**And** quyền được lưu theo Architecture (server / SoT) (FR3)

### Story 1.4: Mod/User đăng nhập Google và liên kết tên

As a User (vd. A),
I want đăng nhập Google rồi chọn Liên kết tài khoản → chọn tên A trong danh sách,
So that tôi chỉ thấy đúng quyền User.

**Acceptance Criteria:**

**Given** Admin đã tạo tên A với role User (và tương tự cho Mod)
**When** người đó Google login và chọn liên kết với tên A
**Then** session gắn A + role User
**And** UI/API chỉ cho phép đúng quyền User (không full Admin)
**And** không chọn được tên đã bị người khác liên kết (hoặc có quy tắc Admin xử lý)
**And** Mod làm cùng flow với role Mod (FR1, FR3)

## Epic 2: Lịch chung trên Google Sheet (SoT)

Nhiều người cùng một nguồn lịch qua app → Express proxy → Google Sheet; localStorage chỉ cache (FR19, AD-2, AD-8).

### Story 2.1: Proxy đọc lịch từ Sheet SoT

As a Mod/User đã liên kết khoa,
I want mở app và thấy lịch lấy từ Google Sheet,
So that mọi người cùng một nguồn (không phải SoT localStorage).

**Acceptance Criteria:**

**Given** Admin đã liên kết Spreadsheet SoT (Story 1.2)
**When** user tải khoa / tuần / sheet lịch
**Then** dữ liệu đến từ proxy → Google Sheet
**And** localStorage không quyết định bản đúng sau cutover (FR19)

### Story 2.2: Proxy ghi lịch lên Sheet SoT

As a Mod,
I want sửa lịch trên app và lưu lên Sheet,
So that người khác sync thấy thay đổi.

**Acceptance Criteria:**

**Given** user có quyền Mod (hoặc quyền sửa tương ứng)
**When** lưu thay đổi lưới/sheet được phép
**Then** Google Sheet SoT được cập nhật
**And** user khác tải lại thấy thay đổi sau sync
**And** User không ghi được vùng không được phép (AD-4, AD-8)

### Story 2.3: Revision token cho đồng bộ an toàn

As a Mod/User,
I want mỗi vùng lịch có revision khi đọc/ghi,
So that ghi đè được kiểm soát (nền FR15/16 / Epic 4).

**Acceptance Criteria:**

**Given** client đọc lịch từ proxy
**When** response trả về
**Then** kèm `revision` (hoặc tương đương) cho phạm vi đó
**And** mọi ghi kèm `baseRevision`
**And** khi lệch revision, proxy áp LWW / trả tín hiệu conflict theo AD-6

### Story 2.4: Cache local chỉ hỗ trợ, không SoT

As a User,
I want app vẫn mở được nhờ cache khi mạng chậm,
So that trải nghiệm mượt — nhưng Sheet vẫn là nguồn đúng.

**Acceptance Criteria:**

**Given** đã sync thành công trước đó
**When** dùng cache / tạm offline
**Then** có thể xem bản cache kèm trạng thái rõ (cache / cần sync)
**And** khi online lại, bản Sheet SoT thắng nếu lệch (FR19, AD-2)

## Epic 3: Mod xếp tuần — auto, phòng, Public, lưới P0

Mod setup chính/phụ → auto tuần (giữ F-201) → lưới P0 → Public/Unpublish; User chỉ thấy tuần đã Public (FR4–10, FR22, FR23).

### Story 3.1: UI Phân công bệnh phòng — chính và phụ

As a Mod/Admin,
I want bảng Phân công bệnh phòng có dòng BS chính và BS phụ,
So that Auto biết ai nhận phòng khi chính miss.

**Acceptance Criteria:**

**Given** Mod/Admin mở khu Phân công bệnh phòng
**When** setup tên phòng, một BS chính, 0…n BS phụ có thứ tự
**Then** cấu hình lưu lên SoT qua proxy
**And** thiếu BS chính cho phòng đang dùng thì cảnh báo rõ (FR22, AD-10)

### Story 3.2: Auto tuần 1 click giữ baseline F-201

As a Mod,
I want bấm một nút auto xếp lịch tuần,
So that lưới được điền theo 5 layer F-201 rồi lưu lên Sheet.

**Acceptance Criteria:**

**Given** Mod đang mở tuần draft và có quyền sửa tuần
**When** chạy Auto tuần
**Then** `generateWeeklySchedule` áp BR-201-01…06 (trừ phần phòng sẽ tinh ở 3.3)
**And** kết quả grid/warnings persist qua proxy → Sheet
**And** không auto tháng/nghỉ/học (FR4, FR23, AD-1, AD-9)

### Story 3.3: Xếp bệnh phòng — phụ nhận hết khi chính miss

As a Mod,
I want auto xếp phòng theo chính → phụ → trống,
So that ít phải sửa phòng bằng tay.

**Acceptance Criteria:**

**Given** roomTable đã có chính/phụ (3.1)
**When** Auto tuần chạy `placeWards`
**Then** mỗi slot thử chính rồi phụ theo thứ tự
**And** hết phụ thì để trống + `roomWarnings`
**And** không gán BS ngoài list; không ½ phòng (FR5)

### Story 3.4: Giảm cảnh báo giả theo danh sách ưu tiên

As a Mod,
I want ít cảnh báo nhiễu sau auto,
So that tôi không bỏ qua hàng loạt.

**Acceptance Criteria:**

**Given** danh sách ưu tiên OQ-1 (hoặc subset đã chốt cho sprint)
**When** Auto/hiển thị warnings
**Then** các loại trong danh sách được sửa/tắt có chủ đích hoặc còn mở có lý do
**And** regression F-201 không phá cảnh báo thật cần thiết (FR6)

### Story 3.5: Lưới P0 thao tác kiểu Sheet

As a Mod,
I want multi-select, copy/cut/paste, đậm/nghiêng, màu, kéo-thả, undo/redo trên lưới tuần,
So that sửa tay nhanh quen Sheet.

**Acceptance Criteria:**

**Given** Mod đang sửa sheet được phép (desktop)
**When** thực hiện các thao tác P0
**Then** từng thao tác hoạt động đúng trên lưới
**And** không yêu cầu full toolbar Sheets P1/P2 (FR7, AD-13)

### Story 3.6: Tuần draft ẩn với User

As a User,
I want không thấy phân công tuần khi Mod chưa Public,
So that tôi không làm việc theo bản nháp.

**Acceptance Criteria:**

**Given** tuần ở trạng thái draft
**When** User mở lịch tuần đó
**Then** thấy trống / chưa công bố (không phải bản draft Mod)
**And** Mod vẫn xem và sửa được draft (FR8, AD-5)

### Story 3.7: Mod Public tuần

As a Mod,
I want Public tuần đang soạn,
So that User trong khoa xem được lịch đã chốt.

**Acceptance Criteria:**

**Given** Mod đã soạn xong tuần draft
**When** bấm Public
**Then** status trên SoT = published
**And** User trong khoa thấy nội dung tuần đó
**And** sự kiện Public được ghi audit nếu tab audit đã sẵn (FR9)

### Story 3.8: Mod Unpublish và sửa lại

As a Mod,
I want Unpublish tuần đã Public,
So that tôi sửa sai sót rồi Public lại.

**Acceptance Criteria:**

**Given** tuần đang published
**When** Mod Unpublish
**Then** User trở lại trạng thái không thấy bản chốt (như FR8)
**And** Mod sửa draft rồi Public lại được
**And** Unpublish/Public lại có audit (FR10)

## Epic 4: User tự phục vụ nghỉ / tháng / học + concurrent

User sửa trong cửa sổ khóa; đổi tháng; LWW + báo conflict (FR11–16).

### Story 4.1: Cấu hình ngày khóa nghỉ và tháng

As a Admin,
I want cấu hình ngày/giờ khóa lịch nghỉ và lịch tháng,
So that khoa ổn định trước khi Mod xếp tuần/học/tháng.

**Acceptance Criteria:**

**Given** Admin (hoặc role được ủy quyền) đã login
**When** lưu cấu hình ngày khóa nghỉ và tháng
**Then** giá trị áp dụng cho chu kỳ tiếp theo theo quy tắc UI đã công bố
**And** User/Mod thấy được hạn khóa liên quan (FR14)

### Story 4.2: User sửa lịch nghỉ trong cửa sổ

As a User,
I want sửa lịch nghỉ khi còn trong cửa sổ mở,
So that Mod có dữ liệu nghỉ trước khi xếp tuần.

**Acceptance Criteria:**

**Given** chưa qua ngày khóa nghỉ đã cấu hình
**When** User lưu thay đổi lịch nghỉ của mình
**Then** lưu thành công lên SoT qua proxy
**And** ngoài cửa sổ User không lưu được và được hướng dẫn báo Mod (FR11)

### Story 4.3: User đổi lịch tháng trong cửa sổ

As a User,
I want đổi lịch tháng với user khác khi kỳ còn mở,
So that tự điều chỉnh trước ngày khóa.

**Acceptance Criteria:**

**Given** kỳ tháng sau đang mở và chưa khóa
**When** hai User hoàn tất thao tác đổi (theo UX đã chốt — OQ-3)
**Then** lịch tháng cập nhật trên SoT và có audit nếu sẵn
**And** sau ngày khóa User không tự đổi được; phải qua Mod (FR12)

### Story 4.4: User đăng ký / sửa lịch học

As a User,
I want tự đăng ký hoặc sửa lịch học trong phạm vi cho phép,
So that không phải nhờ Mod từng dòng.

**Acceptance Criteria:**

**Given** User đã liên kết tài khoản
**When** đăng ký/sửa lịch học trong rule Template Nội
**Then** lưu thành công qua proxy
**And** thao tác ngoài phạm vi bị từ chối rõ ràng (FR13)

### Story 4.5: Concurrent LWW + báo conflict

As a User/Mod,
I want khi hai người sửa cùng vùng nghỉ/tháng thì hệ thống LWW và báo conflict,
So that không mất dữ liệu thầm và biết bị ghi đè.

**Acceptance Criteria:**

**Given** hai phiên sửa cùng phạm vi với revision khác nhau (nền Story 2.3)
**When** cả hai ghi
**Then** bản ghi sau thắng (LWW) và revision tăng
**And** bên bị ảnh hưởng nhận tín hiệu conflict (toast/banner)
**And** sự kiện conflict vào nhật ký nếu audit đã có (FR15, FR16, AD-6)

## Epic 5: Audit, liên khoa & Template Nội

Truy vết ai sửa; chia sẻ ngoài khoa chỉ xem; gắn Template Nội (FR17, FR18, FR20, FR21).

### Story 5.1: Ghi nhật ký sự kiện lên Sheet

As a hệ thống (sau thao tác Mod/User/Admin),
I want mọi thay đổi lịch quan trọng được ghi append-only,
So that có thể truy vết ai–khi nào–ô/sheet gì.

**Acceptance Criteria:**

**Given** thay đổi vận hành (sửa ô, Public/Unpublish, đổi quyền lịch, cấu hình khóa, …)
**When** thao tác commit thành công qua proxy
**Then** một dòng audit được append trên tab Audit (hoặc sheet log cùng Spreadsheet)
**And** có actor, timestamp, sheet, phạm vi ô (nếu có), hành động, before/after hoặc diff tóm tắt (FR17, AD-7)

### Story 5.2: Xem / lọc nhật ký sự kiện

As a Admin (và Mod theo chính sách),
I want xem và lọc nhật ký theo khoảng thời gian,
So that giải được tranh cãi “ai sửa”.

**Acceptance Criteria:**

**Given** đã có sự kiện audit trên SoT
**When** mở UI nhật ký và lọc theo thời gian / sheet
**Then** thấy danh sách sự kiện phù hợp
**And** truy được “ai sửa ô/sheet X trong tuần Y” trong thời gian hợp lý (FR18)
**And** không bắt buộc UI lịch sử per-cell kiểu Sheets

### Story 5.3: Chia sẻ lịch liên khoa chỉ xem

As a Mod,
I want gửi lịch cho khoa/NS ngoài khoa ở chế độ chỉ xem,
So that họ theo dõi được mà không sửa được phân công.

**Acceptance Criteria:**

**Given** Mod đã có tuần/lịch cần chia sẻ
**When** tạo chia sẻ liên khoa qua proxy (link hoặc export chỉ đọc — OQ-4)
**Then** người nhận ngoài khoa xem được nội dung được chia
**And** không lưu/sửa được phân công trên SoT khoa (FR20, AD-4)

### Story 5.4: Gắn Template Nội cho khoa

As a Admin,
I want gắn khoa triển khai với Template Nội,
So that rule/UI lịch tuân template Tim mạch / khối nội và còn chỗ cắm sau.

**Acceptance Criteria:**

**Given** Admin setup khoa
**When** chọn/gán `templateId` = Nội
**Then** app vận hành theo Template Nội
**And** không bắt buộc chọn Ngoại/Hồi sức để hoàn thành phase Nội (FR21)
