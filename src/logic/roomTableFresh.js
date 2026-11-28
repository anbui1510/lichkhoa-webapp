/** Cloud meta — tránh import `dbStore` trong test/merge. */
export const CLOUD_META_KEY = 'LICHKHOA_CLOUD_META_V1';
export const ROOM_TABLE_TTL_MS = 120_000;

export function readCloudMetaLite() {
  try {
    return JSON.parse(localStorage.getItem(CLOUD_META_KEY) || 'null') || {};
  } catch {
    return {};
  }
}

export function isRoomTableFresh(now = Date.now()) {
  const at = Number(readCloudMetaLite().roomTableAt);
  return Number.isFinite(at) && at > 0 && now - at < ROOM_TABLE_TTL_MS;
}