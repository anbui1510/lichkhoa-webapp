import { parseSpreadsheetId } from '../../logic/sheetStore/parseSpreadsheetId.js';
import { resolveSpreadsheetId } from '../../logic/sheetStore/resolveSpreadsheetId.js';
import { tenantSpreadsheetId } from '../../config/tenant';

const SHEET_ID_KEY = 'LICHKHOA_SHEET_ID';
const SHEET_URL_KEY = 'LICHKHOA_SHEET_URL';

export { resolveSpreadsheetId } from '../../logic/sheetStore/resolveSpreadsheetId.js';

export function getSpreadsheetId() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('sheet');
    const parsedQuery = fromUrl ? parseSpreadsheetId(fromUrl) : null;
    if (parsedQuery) {
      localStorage.setItem(SHEET_ID_KEY, parsedQuery);
      return parsedQuery;
    }
    const stored = localStorage.getItem(SHEET_ID_KEY) || '';
    return resolveSpreadsheetId({
      storedId: stored,
      tenantId: tenantSpreadsheetId(),
    });
  } catch {
    return '';
  }
}

export function setSpreadsheetConnection(input) {
  const id = parseSpreadsheetId(input);
  if (!id) throw new Error('Link Google Sheet không hợp lệ.');
  localStorage.setItem(SHEET_ID_KEY, id);
  localStorage.setItem(SHEET_URL_KEY, String(input).trim());
  return id;
}

export function getSpreadsheetUrl() {
  try {
    const stored = localStorage.getItem(SHEET_URL_KEY) || '';
    if (stored) return stored;
    const id = getSpreadsheetId();
    if (id) return `https://docs.google.com/spreadsheets/d/${id}/edit`;
    return '';
  } catch {
    return '';
  }
}

export function clearSpreadsheetConnection() {
  localStorage.removeItem(SHEET_ID_KEY);
  localStorage.removeItem(SHEET_URL_KEY);
}

/** F-305: ghi localStorage từ tenant env nếu chưa có (tuỳ chọn gọi lúc boot). */
export function ensureSpreadsheetFromTenant() {
  if (typeof window === 'undefined') return '';
  const fromQuery = new URLSearchParams(window.location.search).get('sheet');
  if (fromQuery) return getSpreadsheetId();
  const tenantId = tenantSpreadsheetId();
  if (!tenantId) return getSpreadsheetId();
  const current = localStorage.getItem(SHEET_ID_KEY);
  if (!current) {
    localStorage.setItem(SHEET_ID_KEY, tenantId);
    localStorage.setItem(
      SHEET_URL_KEY,
      `https://docs.google.com/spreadsheets/d/${tenantId}/edit`
    );
  }
  return getSpreadsheetId();
}

export function tenantHasDefaultSpreadsheet() {
  return Boolean(tenantSpreadsheetId());
}
