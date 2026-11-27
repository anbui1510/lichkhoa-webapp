import { parseSpreadsheetId } from '../../logic/sheetStore/parseSpreadsheetId.js';

/** Giữ ?sheet= trên URL để ẩn danh / tab mới mở lại không mất sổ (F-304). */
export function syncSheetIdInUrl(spreadsheetId) {
  if (typeof window === 'undefined') return;
  const id = parseSpreadsheetId(spreadsheetId);
  if (!id) return;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get('sheet') === id) return;
    url.searchParams.set('sheet', id);
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(null, '', next);
  } catch {
    /* ignore */
  }
}