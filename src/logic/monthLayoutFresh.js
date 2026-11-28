/** Cloud meta nhỏ — tránh import `dbStore` (kéo seed JSON) trong test/merge. */
export const CLOUD_META_KEY = 'LICHKHOA_CLOUD_META_V1';
/** Giữ cathRoles / monthRoles local đủ lâu để push Sheet kịp. */
export const MONTH_LAYOUT_TTL_MS = 30 * 60_000;

export function readCloudMetaLite() {
  try {
    return JSON.parse(localStorage.getItem(CLOUD_META_KEY) || 'null') || {};
  } catch {
    return {};
  }
}

export function writeCloudMetaLite(patch) {
  const prev = readCloudMetaLite();
  localStorage.setItem(CLOUD_META_KEY, JSON.stringify({ ...prev, ...patch }));
}

export function isMonthLayoutFresh(now = Date.now()) {
  const at = Number(readCloudMetaLite().monthLayoutAt);
  return Number.isFinite(at) && at > 0 && now - at < MONTH_LAYOUT_TTL_MS;
}