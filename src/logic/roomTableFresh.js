import { CLOUD_META_KEY, readCloudMetaLite } from './pendingSheetEdits.js';

export { CLOUD_META_KEY };

/** Giữ chỉnh sửa local đủ lâu để push Sheet kịp (trước đây 2 phút → pull ghi đè / mất khi F5). */
export const ROOM_TABLE_TTL_MS = 30 * 60_000;

export function isRoomTableFresh(now = Date.now()) {
  const at = Number(readCloudMetaLite().roomTableAt);
  return Number.isFinite(at) && at > 0 && now - at < ROOM_TABLE_TTL_MS;
}
