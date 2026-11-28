import { CLOUD_META_KEY, readCloudMetaLite } from './pendingSheetEdits.js';

export { CLOUD_META_KEY };

/** Giữ chỉnh sửa NhanSu local đủ lâu để push Sheet kịp. */
export const STAFF_TTL_MS = 30 * 60_000;

export function isStaffFresh(now = Date.now()) {
  const at = Number(readCloudMetaLite().staffAt);
  return Number.isFinite(at) && at > 0 && now - at < STAFF_TTL_MS;
}
