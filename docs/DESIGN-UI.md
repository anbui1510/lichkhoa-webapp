# Design UI — lichkhoa-webapp

## Nguồn tham chiếu (bắt buộc cho UI mới)

Repo mẫu UI của dự án:

**https://github.com/anbui1510/an_ui** — fork của [shadcn-ui/ui](https://github.com/shadcn-ui/ui), style **base-nova**, docs/demo tại [ui.shadcn.com](https://ui.shadcn.com).

Khi thiết kế / sửa dialog, button, form, Account:

1. Mở component tương ứng trong `an_ui` (vd. `apps/v4/examples/base/alert-dialog-*.tsx`, `apps/v4/registry/bases/base/ui/*`).
2. Thêm vào app bằng `npx shadcn@latest add <name>` (đã cấu hình `components.json` → `style: base-nova`).
3. Giữ Be Vietnam Pro; CTA primary của app dùng **emerald** (`--accent-emerald`) khi map từ legacy `action-btn primary` — không để nút xác nhận mặc định Nova đen nếu ngữ cảnh là lưu/đồng ý trong app lịch.
4. Clone tham chiếu local khi cần: `git clone --depth 1 https://github.com/anbui1510/an_ui.git /tmp/an_ui`.

## Hai lớp UI (song song)

| Lớp | Dùng khi | Nguồn |
|-----|----------|--------|
| **shadcn/ui** (ưu tiên UI mới) | Account, ConfirmDialog, form/modal mới | `src/components/ui/*`, theme `src/styles/shadcn.css` — pattern từ **an_ui** |
| **Legacy CSS** | Lịch tuần/tháng, SheetToolbar, MonthSheet, Navbar sheet chrome | `src/index.css` (`.action-btn`, `.tb-btn`, …) |

**Không** refactor MonthSheet / SheetToolbar sang shadcn trong đợt này.

## Theme (mặc định shadcn)

- Light: `:root` tokens trong `src/styles/shadcn.css`
- Dark: class `.dark` trên `<html>` (đồng bộ với `applyThemeClass` trong `App.jsx`)
- Font app: **Be Vietnam Pro** (giữ tiếng Việt); base color **neutral** / style **base-nova**
- Confirm / AlertDialog: cấu trúc như `an_ui` AlertDialog (Media + Footer muted); nút primary dùng emerald brand

Thêm component:

```bash
npx shadcn@latest add <component>
```

Import:

```jsx
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
```

## Map legacy → shadcn

| Legacy (`index.css`) | shadcn |
|----------------------|--------|
| `action-btn primary` | `<Button>` + emerald / `variant="default"` (brand) |
| `action-btn` (phụ) | `<Button variant="outline">` hoặc `secondary` |
| `action-btn danger` | `<Button variant="destructive">` |
| `nav-btn` / `tb-btn` | Giữ legacy (chưa migrate) — hoặc `variant="ghost"` `size="sm"` nếu làm pilot riêng |
| `form-input` | `<Input />` từ `@/components/ui/input` |
| `form-label` | `<Label />` từ `@/components/ui/label` |
| `modal-overlay` + `modal-content` | `<Dialog>` / `<AlertDialog>` từ `@/components/ui/*` |
| Confirm popup | `ConfirmDialog` → AlertDialog (an_ui) |

## Quy tắc cho AI / PR

1. **Trước khi vẽ UI mới**: đọc pattern trong [anbui1510/an_ui](https://github.com/anbui1510/an_ui) (hoặc `/tmp/an_ui` nếu đã clone), rồi `npx shadcn@latest add` nếu thiếu file trong `src/components/ui/`.
2. UI **mới** (Account, dialog, settings): dùng `@/components/ui/*` + Tailwind utility; **không** bịa theme gradient / font mới.
3. Sheet / lịch: giữ class `index.css`; không Tailwind hoá lưới Handsontable.
4. Không thêm MUI / Ant / Chakra / CSS framework khác.
5. Alias `@/` → `src/` (`vite.config.js`, `jsconfig.json`).

Xem thêm: [Cursor rule UI](../.cursor/rules/ui-shadcn.mdc), [SDD](./SDD/README.md).
