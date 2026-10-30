# F-301: Phân quyền tab (Access Control)

| Trường | Giá trị |
|--------|---------|
| Trạng thái | implemented |
| Phụ thuộc | F-101 (user đăng nhập) |
| Module | web |

## Mục tiêu

Sau đăng nhập, xác định **actor** (admin / member / guest) và mức `none | view | edit` trên từng tab (`week`, `month`, `leave`, …).

## Tab IDs

Định nghĩa trong `ACCESS_TABS`: week, month, leave, study, calendar, dashboard, staff, tasks.

## Ràng buộc nghiệp vụ

| ID | Điều kiện | Kết quả |
|----|-----------|---------|
| BR-301-01 | User local / admin username / chưa email | `kind: admin`, full edit |
| BR-301-02 | User có email, chưa link `staff` | `kind: guest`, access rỗng |
| BR-301-03 | Staff `accessRole !== 'member'` | admin full |
| BR-301-04 | Staff member | `normalizeAccess(staff.access)` với default `MEMBER_DEFAULT` |
| BR-301-05 | `canEdit(actor, tab)` | Chỉ true khi level `edit` hoặc admin |
| BR-301-06 | `canSee(actor, tab)` | false nếu `none` (member) |

## Test cases

| ID | Mô tả | Kỳ vọng |
|----|-------|---------|
| TC-F301-01 | Guest actor | `canEdit(week)` false |
| TC-F301-02 | Member week=view | see true, edit false |
| TC-F301-03 | Admin actor | mọi tab edit |

## Definition of Done

- [x] `src/logic/access.js`
- [x] Navbar dùng `visibleNav`, `canEdit` trong App
- [ ] Automated tests (backlog)
