/** Cloud meta — tránh import `dbStore` (kéo seed JSON) trong test/merge. */
export const CLOUD_META_KEY = 'LICHKHOA_CLOUD_META_V1';
/** Đồng bộ staff/room — 30 phút đủ để push Sheet chậm không bị pull đè. */
export const DEPT_ENTRIES_TTL_MS = 30 * 60_000;

export function readCloudMetaLite() {
  try {
    return JSON.parse(localStorage.getItem(CLOUD_META_KEY) || 'null') || {};
  } catch {
    return {};
  }
}

export function isDeptEntriesFresh(now = Date.now()) {
  const at = Number(readCloudMetaLite().deptEntriesAt);
  return Number.isFinite(at) && at > 0 && now - at < DEPT_ENTRIES_TTL_MS;
}