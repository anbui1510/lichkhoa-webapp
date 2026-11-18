# F-213: Lưới P0 thao tác kiểu Sheet (Epic 3.5)

| Trường | Giá trị |
|--------|---------|
| Trạng thái | implemented |
| Phụ thuộc | — |
| Module | web |

## Mục tiêu

Xác nhận/gap-fill P0 trên lưới tuần (+ room): multi-select, copy/cut/paste, đậm/nghiêng/màu, kéo-thả, undo/redo.

## Phạm vi

### In scope

- Audit Handsontable week grid (đã có sẵn)
- Gắn `attachCellDragSwap` cho RoomSheet (gap)
- Không làm toolbar Sheets P1/P2

### Out of scope

- Mobile full P0 parity
- Merge cells advanced P1

## Ràng buộc

| ID | Điều kiện | Kết quả |
|----|-----------|---------|
| BR-213-01 | Desktop week grid | P0 thao tác hoạt động |
| BR-213-02 | Room grid | Drag-swap + copy/paste/undo như week |

## Test cases

| ID | Mô tả | Kỳ vọng |
|----|-------|---------|
| TC-F213-01 | Manual smoke P0 | Multi-select / format / undo / drag |
