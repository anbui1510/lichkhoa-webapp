/** ?sheet= → localStorage (admin lưu) → env tenant mặc định. */
export function resolveSpreadsheetId({ queryId, storedId, tenantId }) {
  const q = String(queryId || '').trim();
  if (q) return q;
  const stored = String(storedId || '').trim();
  if (stored) return stored;
  return String(tenantId || '').trim();
}