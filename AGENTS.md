# Hướng dẫn cho AI / Cloud Agent — lichkhoa-webapp

## Spec-Driven Development (bắt buộc)

1. **Đọc** [`docs/SDD/README.md`](docs/SDD/README.md) và [`docs/specs/INDEX.md`](docs/specs/INDEX.md).
2. Trước khi sửa code cho một capability, mở thư mục `docs/specs/features/F-XXX-*/` tương ứng.
3. Nếu feature **chưa có spec**: tạo `spec.md` → `design.md` → `implementation-plan.md` từ template `docs/SDD/templates/feature-folder/`, thêm dòng vào `INDEX.md`, **rồi mới code**.
4. Cập nhật spec khi đổi hành vi (endpoint, BR, test case ID).
5. Chạy `npm run sdd:check` trước commit.

## Kiến trúc nhanh

- Lịch & nghiệp vụ: `src/logic/` (ưu tiên đặt logic mới ở đây)
- UI: `src/components/`, orchestration `src/App.jsx`
- API: `server/src/`
- Tài khoản: `docs/ACCOUNT.md` + `src/features/account/`

## Commit / PR

- Một PR nên gắn feature ID (vd. `F-101`) trong mô tả.
- Test map tới `TC-FXXX-YY` trong spec khi có.

## Không làm

- Prompt chung “làm tính năng X” mà không có spec.
- Refactor lớn ngoài phạm vi feature đang spec.
