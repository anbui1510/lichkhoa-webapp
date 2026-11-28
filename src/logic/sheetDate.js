/**
 * Chuẩn hoá ngày từ Google Sheet / form → `YYYY-MM-DD`.
 * Sheet + Apps Script thường trả Date/ISO UTC (vd. 2026-10-31T17:00:00.000Z = 01/11 Asia/Bangkok).
 */

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;
const SHEET_TZ = 'Asia/Bangkok';

function ymdInTimeZone(date, timeZone) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

/** @returns {string} YYYY-MM-DD hoặc '' */
export function normalizeSheetDateIso(value) {
  if (value == null || value === '') return '';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    return ymdInTimeZone(value, SHEET_TZ);
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    // Serial ngày Excel/Sheets hiếm khi lọt JSON — bỏ qua
    return '';
  }
  const raw = String(value).trim();
  if (!raw || raw === '-') return '';

  const plain = raw.match(YMD);
  if (plain) {
    const y = Number(plain[1]);
    const m = Number(plain[2]);
    const d = Number(plain[3]);
    const probe = new Date(y, m - 1, d);
    if (Number.isNaN(probe.getTime())) return '';
    if (probe.getFullYear() !== y || probe.getMonth() !== m - 1 || probe.getDate() !== d) return '';
    return `${plain[1]}-${plain[2]}-${plain[3]}`;
  }

  // ISO datetime / RFC
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw) || /Z$/i.test(raw) || /[+-]\d{2}:\d{2}$/.test(raw)) {
    const dt = new Date(raw);
    if (!Number.isNaN(dt.getTime())) return ymdInTimeZone(dt, SHEET_TZ);
  }

  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (slash) {
    let y = slash[3] ? Number(slash[3]) : new Date().getFullYear();
    if (y < 100) y += 2000;
    const m = Number(slash[2]);
    const d = Number(slash[1]);
    const probe = new Date(y, m - 1, d);
    if (Number.isNaN(probe.getTime())) return '';
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  return '';
}
