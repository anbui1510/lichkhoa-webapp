/** F-214 — hạn khóa lưu local khi backend Sheet (không API Postgres). */

const KEY = 'LICHKHOA_LOCK_WINDOWS_V1';

function bucket() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') || {};
  } catch {
    return {};
  }
}

export function readLocalLockWindows(spreadsheetId) {
  const id = String(spreadsheetId || '').trim();
  if (!id) return { leaveLockAt: null, monthLockAt: null };
  const row = bucket()[id];
  if (!row || typeof row !== 'object') return { leaveLockAt: null, monthLockAt: null };
  return {
    leaveLockAt: row.leaveLockAt ?? null,
    monthLockAt: row.monthLockAt ?? null,
  };
}

export function writeLocalLockWindows(spreadsheetId, patch) {
  const id = String(spreadsheetId || '').trim();
  if (!id) return;
  const all = bucket();
  const prev = all[id] || {};
  const next = {
    ...prev,
    ...(Object.prototype.hasOwnProperty.call(patch || {}, 'leaveLockAt')
      ? { leaveLockAt: patch.leaveLockAt }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(patch || {}, 'monthLockAt')
      ? { monthLockAt: patch.monthLockAt }
      : {}),
  };
  all[id] = next;
  localStorage.setItem(KEY, JSON.stringify(all));
  return next;
}