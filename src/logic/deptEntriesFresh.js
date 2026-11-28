/** Cloud meta — tránh import `dbStore` (kéo seed JSON) trong test/merge. */
export const CLOUD_META_KEY = 'LICHKHOA_CLOUD_META_V1';
export const DEPT_ENTRIES_TTL_MS = 120_000;

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