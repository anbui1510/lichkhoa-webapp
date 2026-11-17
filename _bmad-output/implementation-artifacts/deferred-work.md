# Deferred work

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-admin-dang-nhap-google-bootstrap.md`
  summary: TOCTOU khi hai Google login đồng thời thấy adminCount=0 có thể tạo hai Admin
  evidence: `loginWithGoogle` đếm Admin rồi create/update không transaction; race hiếm lúc bootstrap; cần Serializable/unique constraint nếu siết

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-admin-dang-nhap-google-bootstrap.md`
  summary: Không backfill `User.role=Admin` cho tài khoản admin mật khẩu cũ ngoài seed
  evidence: Chỉ seed `admin@lichkhoa.local` được upsert role; cutover OQ-5 / migrate data chưa làm trong 1.1

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-admin-dang-nhap-google-bootstrap.md`
  summary: Password login re-fetch null vẫn có thể TypeError trên `fresh.role`
  evidence: Pattern sẵn có trước story; không do bootstrap Google

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-admin-dang-nhap-google-bootstrap.md`
  summary: googleId đã gắn nhưng email Google lệch so với user.email — allowlist/JWT có thể lệch
  evidence: maybe-false unverified medium; cần case GSI thật đổi email để settle

- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-admin-lien-ket-google-sheet.md`
  summary: Chưa có API/UI unlink/clear Spreadsheet SoT sau khi đã lưu
  evidence: Intent 1.2 chỉ lưu/validate; NOT NULL spreadsheetId; cần story sau nếu muốn gỡ liên kết

- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-admin-lien-ket-google-sheet.md`
  summary: Thiếu HTTP/route E2E đầy đủ cho GET/PUT /api/schedule/config (401/400/response shape)
  evidence: Có wiring requireAdmin + unit service; chưa createApp HTTP end-to-end

- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-admin-lien-ket-google-sheet.md`
  summary: Race overlapping refreshScheduleConfig có thể ghi đè state
  evidence: Hiếm; chưa có seq guard trên client

- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-admin-lien-ket-google-sheet.md`
  summary: Banner “chưa liên kết” trên AccountPage không có automated FE test (BR-103-05)
  evidence: Repo verify path chỉ chạy server tests; UI smoke vẫn manual
