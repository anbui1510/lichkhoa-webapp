import { asArray } from './sheetStore/tableUtils.js';

/**
 * Sheet LichNghi đôi khi mất staffId/shortName — giữ tên từ bản local cùng id.
 * Đồng thời giữ entry local chưa kịp lên Sheet (có shortName).
 */
export function mergeLeavePreferIdentity(remote, local) {
  const remoteList = asArray(remote);
  const localList = asArray(local);
  if (!remoteList.length) return localList;
  const localById = new Map(localList.map((entry) => [entry.id, entry]));
  const out = remoteList.map((row) => {
    if (String(row.shortName || '').trim()) return row;
    const prev = localById.get(row.id);
    if (!prev || !String(prev.shortName || '').trim()) return row;
    return {
      ...row,
      shortName: prev.shortName,
      staffId: String(row.staffId || '').trim() || prev.staffId || '',
    };
  });
  const remoteIds = new Set(remoteList.map((row) => row.id));
  localList.forEach((entry) => {
    if (remoteIds.has(entry.id)) return;
    if (!String(entry.shortName || '').trim()) return;
    out.push(entry);
  });
  return out;
}
