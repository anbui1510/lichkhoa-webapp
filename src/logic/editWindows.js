/**
 * F-214 — cửa sổ khóa lịch nghỉ / tháng (hạn tuyệt đối ISO trên DeptScheduleConfig).
 */

/**
 * @param {unknown} value
 * @returns {Date | null}
 */
export function parseLockAt(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * @param {{ leaveLockAt?: unknown } | null | undefined} config
 * @param {Date} [now]
 */
export function isLeaveWindowOpen(config, now = new Date()) {
  const lock = parseLockAt(config?.leaveLockAt);
  if (!lock) return true;
  return now.getTime() < lock.getTime();
}

/**
 * @param {{ monthLockAt?: unknown } | null | undefined} config
 * @param {Date} [now]
 */
export function isMonthWindowOpen(config, now = new Date()) {
  const lock = parseLockAt(config?.monthLockAt);
  if (!lock) return true;
  return now.getTime() < lock.getTime();
}

/**
 * Format ISO → chuỗi hiển thị VN (Asia/Saigon wall nếu browser local; fallback ISO slice).
 * @param {unknown} value
 */
export function toDatetimeLocalValue(iso) {
  const d = parseLockAt(iso);
  if (!d) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocalValue(local) {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function formatLockAtLabel(value) {
  const d = parseLockAt(value);
  if (!d) return 'Chưa đặt hạn';
  try {
    return d.toLocaleString('vi-VN', {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return d.toISOString();
  }
}
