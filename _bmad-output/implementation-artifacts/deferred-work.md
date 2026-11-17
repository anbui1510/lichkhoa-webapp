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
  summary: Chua c� API/UI unlink/clear Spreadsheet SoT sau khi d� luu
  evidence: Intent 1.2 ch? luu/validate; NOT NULL spreadsheetId; c?n story sau n?u mu?n g? li�n k?t

- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-admin-lien-ket-google-sheet.md`
  summary: Thi?u HTTP/route E2E tests cho GET/PUT /api/schedule/config
  evidence: C� unit parse/service/middleware; stack Express chua du?c cover end-to-end

- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-admin-lien-ket-google-sheet.md`
  summary: Race overlapping refreshScheduleConfig c� th? ghi d� state
  evidence: Hi?m; chua c� seq guard tr�n client
