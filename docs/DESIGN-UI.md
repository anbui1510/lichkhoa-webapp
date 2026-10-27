# Design UI — lichkhoa-webapp

## Hai lớp UI (song song)

| Lớp | Dùng khi | Nguồn |
|-----|----------|--------|
| **shadcn/ui** (ưu tiên UI mới) | Account, ConfirmDialog, form/modal mới | `src/components/ui/*`, theme `src/styles/shadcn.css` |
| **Legacy CSS** | Lịch tuần/tháng, SheetToolbar, MonthSheet, Navbar sheet chrome | `src/index.css` (`.action-btn`, `.tb-btn`, …) |

**Không** refactor MonthSheet / SheetToolbar sang shadcn trong đợt này.

## Theme (mặc định shadcn)

- Light: `:root` tokens trong `src/styles/shadcn.css`
- Dark: class `.dark` trên `<html>` (đồng bộ với `applyThemeClass` trong `App.jsx`)
- Font app: **Be Vietnam Pro** (giữ tiếng Việt); màu theo **default shadcn Nova / neutral**

Thêm component:

```bash
npx shadcn@latest add <component>
```

Import:

```jsx
import { Button } from '@/components/ui/button'
```

## Map legacy → shadcn

| Legacy (`index.css`) | shadcn |
|----------------------|--------|
| `action-btn primary` | `<Button>` / `variant="default"` |
| `action-btn` (phụ) | `<Button variant="outline">` hoặc `secondary` |
| `action-btn danger` | `<Button variant="destructive">` |
| `nav-btn` / `tb-btn` | Giữ legacy (chưa migrate) — hoặc `variant="ghost"` `size="sm"` nếu làm pilot riêng |
| `form-input` | `<Input />` từ `@/components/ui/input` |
| `form-label` | `<Label />` từ `@/components/ui/label` |
| `modal-overlay` + `modal-content` | `<Dialog>` + `DialogContent` + `DialogHeader` / `Footer` |

## Quy tắc cho AI / PR

1. UI **mới** (Account, dialog, settings): dùng `@/components/ui/*` + Tailwind utility; **không** bịa theme gradient / font mới.
2. Sheet / lịch: giữ class `index.css`; không Tailwind hoá lưới Handsontable.
3. Không thêm MUI / Ant / Chakra / CSS framework khác.
4. Alias `@/` → `src/` (`vite.config.js`, `jsconfig.json`).

Xem thêm: [Cursor rule UI](../.cursor/rules/ui-shadcn.mdc), [SDD](./SDD/README.md).
