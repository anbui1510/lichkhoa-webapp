import { mondayOf } from './monthSchedule.js';

/** Chuẩn hoá startDate tuần — tránh header (NaN/NaN) khi Sheet lưu sai định dạng. */
export function normalizeWeekStartIso(value) {
  const raw = String(value ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split('-').map(Number);
    const probe = new Date(y, m - 1, d);
    if (!Number.isNaN(probe.getTime())) return mondayOf(probe);
  }
  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (slash) {
    let y = slash[3] ? Number(slash[3]) : new Date().getFullYear();
    if (y < 100) y += 2000;
    const m = Number(slash[2]);
    const d = Number(slash[1]);
    const probe = new Date(y, m - 1, d);
    if (!Number.isNaN(probe.getTime())) return mondayOf(probe);
  }
  return mondayOf(new Date());
}