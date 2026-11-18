# F-212: Public / Unpublish tuần (Epic 3.6–3.8)

| Trường | Giá trị |
|--------|---------|
| Trạng thái | implemented |
| Phụ thuộc | F-210, F-105 |
| Module | web |

## Mục tiêu

Tuần draft ẩn với User; Mod/Admin Public/Unpublish; ghi audit stub trên sheet.

## Phạm vi

### In scope

- `publishStatus`: `draft` \| `published` (per active week + `weeks[startDate]`)
- User/member mask draft → lưới trống + banner
- Mod/Admin Public / Unpublish toolbar + banner nháp
- `auditLog[]` trên sheet (`publish` / `unpublish`)

### Out of scope

- Full audit tab Sheet (Epic 5)
- Email/push notify

## Ràng buộc nghiệp vụ

| ID | Điều kiện | Kết quả |
|----|-----------|---------|
| BR-212-01 | Sheet cũ không có status | Coi như `published` |
| BR-212-02 | Tuần mới / openWeek fresh | `draft` |
| BR-212-03 | User + draft | Không thấy nội dung draft |
| BR-212-04 | Mod Public | `published`; User thấy |
| BR-212-05 | Mod Unpublish | `draft`; User mất bản chốt; Mod sửa rồi Public lại |
| BR-212-06 | Public/Unpublish | Append `auditLog` |

## Test cases

| ID | Mô tả | Kỳ vọng |
|----|-------|---------|
| TC-F212-01 | Legacy | published |
| TC-F212-02 | Mask User vs Mod | User masked |
| TC-F212-03 | Publish/Unpublish | status + audit |
