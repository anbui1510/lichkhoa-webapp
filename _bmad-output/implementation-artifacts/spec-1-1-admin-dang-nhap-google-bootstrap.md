---
title: '1.1 Admin đăng nhập Google lần đầu (bootstrap)'
type: 'feature'
created: '2026-11-17'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '978d2b859fc526817af7db1bb0daa2dbc602cfc9'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/docs/specs/features/F-101-auth-login/spec.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Google login đã tạo user + JWT nhưng chưa có bootstrap Admin: email được phép không được gắn quyền Admin full, và `resolveActor` vẫn dựa heuristic `admin`/local — khoa mới không vào được full app đúng nghĩa Phase Nội.

**Approach:** Mở rộng luồng `POST /api/auth/google` + model User để nhận diện bootstrap Admin theo chính sách email được phép; session/JWT/client phản ánh quyền Admin full; Google là đường đăng nhập chính, không bắt buộc mật khẩu local.

**Decisions:**
- **Q1 = C (kết hợp):** Email được phép Admin Google khi (1) email ∈ `BOOTSTRAP_ADMIN_EMAILS` (CSV env), **hoặc** (2) khoa chưa có user `role=Admin` và đây là lần Google login bootstrap đầu (first-user wins). Sau khi đã có ≥1 Admin: chỉ email trong allowlist **hoặc** user đã là Admin được tiếp tục; email ngoài allowlist và chưa phải Admin → từ chối.
- **Q2 = A:** Giữ nguyên AuthPanel (Google + form mật khẩu); không demote/ẩn password UI trong 1.1.

## Boundaries & Constraints

**Always:**
- Session JWT từ `POST /api/auth/google`; authorize Admin trên server (không tin client).
- Chính sách Q1=C: allowlist env **hoặc** first-user khi chưa có Admin; ngoài policy → 403 rõ ràng.
- Bootstrap thành công → user đó có quyền Admin full.
- Giữ F-101 password API + UI form mật khẩu (Q2=A) cho đến cutover riêng.
- UI Account/dialogs theo shadcn hiện có; tiếng Việt.

**Never:**
- Không làm Story 1.2 (liên kết Sheet), 1.3 (danh sách người + role Mod/User), 1.4 (liên kết tên).
- Không rewrite scheduler / F-201 / sheet chrome Handsontable.
- Không xóa `POST /api/auth/login` và không ẩn form mật khẩu trong story này.
- Không dùng heuristic `username === 'admin'` làm giải pháp bootstrap Google cuối cùng.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Bootstrap first-user | Chưa có Admin; Google OK (kể cả ngoài allowlist) | 200 + JWT; gán Admin; vào app | N/A |
| Bootstrap/allowlist | Email ∈ `BOOTSTRAP_ADMIN_EMAILS` | 200 + JWT; Admin (tạo mới hoặc giữ) | N/A |
| Email không phép | Đã có Admin; email ∉ allowlist; user chưa Admin | Không vào app | 403 + `{ error }` tiếng Việt |
| Đã có Admin | Admin hiện có đăng nhập Google lại | 200 + JWT; giữ Admin | Không demote |
| Credential lỗi | Token Google invalid/expired | Không tạo user | 401 từ verify |
| Email đã gắn googleId khác | Cùng email, googleId khác | Không ghi đè | 409 như hiện tại |

</frozen-after-approval>

## Code Map

- `server/prisma/schema.prisma` — `User` chưa có `role` / bootstrap flag; cần mở rộng cho Admin.
- `server/src/services/googleAuth.js` — `verifyGoogleCredential`.
- `server/src/services/userService.js` — `loginWithGoogle` (L70–121): tạo/link user, chưa gán Admin / chặn allowlist.
- `server/src/controllers/userController.js` — `google`, `googleConfig`.
- `server/src/routes/userRoutes.js` — `POST /api/auth/google`, `GET /api/auth/google/config`.
- `server/src/middlewares/authMiddleware.js` — JWT → `req.user`.
- `src/features/account/services/accountApi.js` — client `google` / token storage.
- `src/features/account/components/GoogleSignInButton.jsx` — GSI button.
- `src/features/account/components/AuthPanel.jsx` — login UI (Google + password).
- `src/features/account/hooks/useAccount.js` — `loginWithGoogle`, session bootstrap.
- `src/logic/access.js` — `resolveActor` / `needsStaffLink` heuristic admin local — thay bằng role từ server khi Admin Google.
- `docs/specs/features/F-101-auth-login/spec.md` — password only; có thể thêm F-102 SDD folder cho Google bootstrap (theo AD-12).
- `docs/ACCOUNT.md` — bổ sung endpoint Google nếu đổi contract.

**Reuse:** `loginWithGoogle` + GSI + JWT stack hiện có.  
**Không đụng:** `schedulerEngine.js`, Handsontable sheet chrome, Story 1.2–1.4 UI.

## Tasks & Acceptance

**Execution:**
- [x] `server/prisma/schema.prisma` (+ migration) -- thêm field role (hoặc tương đương) trên User cho Admin -- SoT quyền auth trên Prisma
- [x] `server/src/services/userService.js` -- trong `loginWithGoogle`: enforce Q1=C (allowlist env **hoặc** first-user); trả role trong profile DTO -- server là nguồn quyền
- [x] `server/src/controllers/userController.js` / validators nếu cần -- map lỗi 403/401 rõ -- API contract
- [x] `src/logic/access.js` (+ chỗ đọc user session) -- Admin Google dùng role server, không phụ thuộc `username === 'admin'` -- hết heuristic bootstrap
- [x] `docs/specs/features/` -- thêm F-102 (Google OAuth / bootstrap) + test map; cập nhật INDEX -- AD-12 / SDD
- [x] Unit/integration tests cho I/O matrix (first-user / allowlist / reject) -- khóa hành vi
- [x] `AuthPanel` -- **không đổi** layout (Q2=A); chỉ smoke rằng Google + password vẫn hiện -- tránh scope creep UX

**Acceptance Criteria:**
- Given khoa chưa có Admin, when đăng nhập Google thành công (kể cả ngoài allowlist), then user thành Admin full và vào app.
- Given email ∈ `BOOTSTRAP_ADMIN_EMAILS`, when đăng nhập Google, then nhận/giữ Admin.
- Given đã có Admin và email ∉ allowlist và user chưa Admin, when đăng nhập Google, then 403, không vào app.
- Given Admin hiện có, when đăng nhập Google lại, then vẫn Admin.
- Given F-101, when gọi `POST /api/auth/login` hợp lệ hoặc mở AuthPanel, then API + form mật khẩu vẫn hoạt động (Q2=A).

## Implementation Notes

- Policy thuần trong `server/src/services/adminBootstrap.js` (`resolveGoogleAdminBootstrap`); `loginWithGoogle` gọi trước create/update.
- `User.role` + DTO/JWT `role`; `access.js` ưu tiên `role === 'Admin'`.
- F-102 folder + TC-F102-01..10; `npm test` 13/13; `sdd:check` OK.
- Rủi ro: seed local Admin chặn first-user trên DB đã seed; migrate history có thể lệch `db push`.

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Evidence / route |
|---------|---------|------------------|
| ACCOUNT.md bullet block phá bảng API (orphan rows) | medium | Xác nhận L32–43: bullet giữa table → rows profile orphan — **patch** |
| Absolute Windows path trong migration (diff) | false | Artifact đóng gói diff review; repo có `server/prisma/migrations/20261117120000_add_user_role/` tương đối |
| DoD/plan thiếu TC-F102-09/10 | low | Docs lệch; reject (fix docs không cần cho AC runtime; plan checkbox cosmetic) |
| Thiếu test `loginWithGoogle` (403/persist role) | medium | verification-gap: helper unit pass khi bỏ enforce/persist — **patch** |
| `toProfilePayload.role` không có test | medium | Cùng gap client Admin UX — **patch** (gom test) |
| TC-F102-10 chỉ test guard, không call site | medium | Bỏ `assertNoGoogleIdConflict` ở service vẫn green — **patch** (gom) |
| Google chỉ Admin; Mod/User chưa login được | false | Intent 1.1 + Never 1.4; Q1=C đúng như frozen |
| TOCTOU adminCount → 2 Admin | medium | Race thật nhưng hiếm; fix transaction không trivial trên SQLite — **defer** |
| Không middleware authorize Admin route | false | Story 1.1 = bootstrap login; gate Sheet thuộc epic sau |
| Design bỏ sót googleAccountGuards.js | low | Docs only; reject |
| Không backfill role cho admin password cũ | medium | Ngoài seed; liên quan cutover OQ-5 — **defer** |
| `username==='admin'` fallback vẫn full admin | false | Design Notes cố ý giữ offline seed; role server ưu tiên trước |
| fresh null sau create → TypeError | false | Prisma create rồi findUnique cùng id không null trong path bình thường |
| Password login fresh null | defer | Pattern sẵn có, không do story — **defer** |
| googleId hit nhưng email Google lệch | maybe-false | Chưa chứng minh GSI đổi email thường xuyên; cần case thật — **defer** unverified medium |
| adminCount null → grant Admin | false | Caller luôn truyền `prisma.user.count` số |

## Design Notes

- Gán Admin ở **server** trong `loginWithGoogle` (sau verify credential), đưa `role` vào profile/JWT claim tối thiểu cần cho client UX; mọi gate nhạy cảm sau này vẫn check server.
- `resolveActor`: nếu `user.role === 'Admin'` (tên field chốt khi implement) → `kind: 'admin'` full; giữ fallback local seed tạm cho dev offline nếu còn, nhưng không thay bootstrap Google.
- SDD: ưu tiên folder `F-102` (Google OAuth / bootstrap) thay vì nhét vào F-101 password.

## Verification

**Commands:**
- `npm run sdd:check` -- expected: pass sau khi thêm F-spec
- Test mới cho allowlist/bootstrap (file test server tương ứng) -- expected: pass các case matrix

**Manual checks:**
- Dev chưa có Admin: Google login bất kỳ → Admin full.
- Dev đã có Admin + `BOOTSTRAP_ADMIN_EMAILS`: email trong list OK; email ngoài list (non-Admin) → 403 tiếng Việt.
- AuthPanel vẫn hiện Google + form mật khẩu.
