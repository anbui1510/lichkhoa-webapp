import { mondayOf } from './monthSchedule.js';
import { normalizeSheetDateIso } from './sheetDate.js';

/** Chuẩn hoá startDate tuần — tránh header (NaN/NaN) khi Sheet lưu sai định dạng. */
export function normalizeWeekStartIso(value) {
  const ymd = normalizeSheetDateIso(value);
  if (ymd) {
    const [y, m, d] = ymd.split('-').map(Number);
    return mondayOf(new Date(y, m - 1, d));
  }
  // Chỉ fallback «tuần hiện tại» khi thật sự không parse được (rỗng / rác).
  return mondayOf(new Date());
}
