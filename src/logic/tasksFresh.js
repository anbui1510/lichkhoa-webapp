import { CLOUD_META_KEY, readCloudMetaLite } from './pendingSheetEdits.js';

export { CLOUD_META_KEY };

/** Giữ chỉnh sửa Task local đủ lâu để push Sheet kịp. */
export const TASKS_TTL_MS = 30 * 60_000;

export function isTasksFresh(now = Date.now()) {
  const at = Number(readCloudMetaLite().tasksAt);
  return Number.isFinite(at) && at > 0 && now - at < TASKS_TTL_MS;
}
