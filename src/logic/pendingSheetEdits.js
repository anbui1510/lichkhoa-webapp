/** Cloud meta — tránh import `dbStore` (circular / test). */
export const CLOUD_META_KEY = 'LICHKHOA_CLOUD_META_V1';
/** Trong cửa sổ này: bỏ pull định kỳ để push kịp ghi Sheet. */
export const EDIT_QUIET_MS = 8_000;

const MARK_KEYS = ['staffAt', 'roomTableAt', 'deptEntriesAt', 'monthLayoutAt', 'tasksAt'];

export function readCloudMetaLite() {
  try {
    return JSON.parse(localStorage.getItem(CLOUD_META_KEY) || 'null') || {};
  } catch {
    return {};
  }
}

function markAgeMs(meta, key, now) {
  const at = Number(meta?.[key]);
  if (!Number.isFinite(at) || at <= 0) return null;
  return now - at;
}

/** Vừa sửa NhanSu / roomTable / … — pull interval không chạy. */
export function isEditQuietPeriod(now = Date.now()) {
  const meta = readCloudMetaLite();
  return MARK_KEYS.some((key) => {
    const age = markAgeMs(meta, key, now);
    return age != null && age < EDIT_QUIET_MS;
  });
}

/** Còn mark trong TTL dài — push dù remote _meta mới hơn (tránh bỏ ghi local). */
export function hasPendingSheetEdits(now = Date.now(), ttlMs = 30 * 60_000) {
  const meta = readCloudMetaLite();
  return MARK_KEYS.some((key) => {
    const age = markAgeMs(meta, key, now);
    return age != null && age < ttlMs;
  });
}
