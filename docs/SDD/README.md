# Spec-Driven Development (SDD) — lichkhoa-webapp

Quy trình phát triển tính năng **bắt buộc** trong repo này. Mục tiêu: tránh “vibe coding” (prompt mơ hồ → AI đoán mò → debug lâu hơn tự viết).

## Workflow 4 bước

| Bước | Tài liệu | Mục đích |
|------|----------|----------|
| 1 | **Requirements Spec** (`spec.md`) | “Hợp đồng” nghiệp vụ: input, output, ràng buộc, test case |
| 2 | **Design** (`design.md`) | Kiến trúc, luồng dữ liệu, file/module chạm tới |
| 3 | **Implementation Plan** (`implementation-plan.md`) | Thứ tự task nhỏ, checklist, tiêu chí Done |
| 4 | **Code + tests** | Chỉ sau khi 1–3 được review (hoặc tự review nếu solo) |

```text
spec.md → design.md → implementation-plan.md → code → tests (theo mục Test trong spec)
```

## Cấu trúc thư mục

```text
docs/
  SDD/
    README.md          ← bạn đang đọc
    templates/         ← copy khi mở feature mới
  specs/
    INDEX.md           ← danh mục feature + trạng thái
    00-REQUIREMENTS.md ← yêu cầu sản phẩm cấp hệ thống
    00-ARCHITECTURE.md ← thiết kế tổng thể
    features/
      F-XXX-<slug>/
        spec.md
        design.md
        implementation-plan.md
```

## Mở feature mới

1. Chọn mã `F-XXX` tiếp theo trong [`specs/INDEX.md`](../specs/INDEX.md).
2. Copy thư mục mẫu từ `templates/feature-folder/` (hoặc duplicate feature tương tự).
3. Viết **spec.md** trước — đủ chi tiết để người khác (hoặc AI) **không cần đoán**.
4. Chạy `npm run sdd:check` trước khi mở PR.

## Quy tắc viết spec (rút gọn)

- Mỗi endpoint / hành người dùng: **Method, path, input, output, mã lỗi**.
- Mỗi ràng buộc nghiệp vụ: dạng **Given / When / Then** hoặc bảng điều kiện.
- **Test cases** liệt kê rõ trong spec; code test map 1–1 với ID (vd. `TC-F101-03`).
- Không code cho đến khi spec + design + plan tồn tại trong thư mục feature (trừ hotfix prod có ticket).

## AI / Cursor

Rule `.cursor/rules/spec-driven-development.mdc` bắt agent đọc spec feature liên quan trước khi sửa code.

Xem thêm [`AGENTS.md`](../../AGENTS.md) ở root repo.
