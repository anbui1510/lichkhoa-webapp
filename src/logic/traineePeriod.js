import { normalizeSheetDateIso } from './sheetDate.js';

function fold(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Học viên hoặc hỗ trợ — có khoảng ngày / tùy chọn ẩn lịch tuần. */
export function isPeriodLimitedStaff(person) {
  const title = fold(person?.title);
  const position = fold(person?.position);
  if (title === 'hoc vien' || title === 'ho tro') return true;
  if (position.includes('hoc vien') || position.includes('ho tro')) return true;
  return false;
}

/** @deprecated Dùng isPeriodLimitedStaff — giữ alias cho chỗ gọi cũ. */
export function isTrainee(person) {
  return fold(person?.title) === 'hoc vien'
    || fold(person?.position).includes('hoc vien');
}

export function parseShowInWeek(value) {
  if (value === false || value === 0 || value === '0') return false;
  const raw = fold(value);
  if (raw === 'off' || raw === 'false' || raw === 'no' || raw === 'an') return false;
  return true;
}

function bounds(person) {
  if (!isPeriodLimitedStaff(person)) return null;
  const from = normalizeSheetDateIso(person?.studyFrom);
  const to = normalizeSheetDateIso(person?.studyTo);
  if (!from && !to) return null;
  return { from, to };
}

/** Trong khoảng ngày hỗ trợ/học (hoặc không giới hạn). */
export function traineeCovers(person, iso) {
  const limit = bounds(person);
  if (!limit) return true;
  const day = normalizeSheetDateIso(iso) || String(iso || '').slice(0, 10);
  if (!day) return true;
  if (limit.from && day < limit.from) return false;
  if (limit.to && day > limit.to) return false;
  return true;
}

/**
 * Có hàng trên Lịch tuần / cột Phân công bệnh phòng.
 * BR-217: showInWeek Off → ẩn; có khoảng ngày → tuần phải giao khoảng.
 */
export function traineeOnWeek(person, days) {
  if (!parseShowInWeek(person?.showInWeek)) return false;
  const limit = bounds(person);
  if (!limit) return true;
  return (days || []).some((day) => traineeCovers(person, day?.iso));
}
