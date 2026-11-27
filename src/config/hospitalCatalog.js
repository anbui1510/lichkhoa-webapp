import { parseSpreadsheetId } from '../logic/sheetStore/parseSpreadsheetId.js';

function env(key) {
  try {
    return import.meta.env?.[key];
  } catch {
    return undefined;
  }
}

/** F-306 — một ID catalog trên Cloudflare (tab KhoaCatalog). */
export function hospitalCatalogSpreadsheetId() {
  const raw = String(
    env('VITE_HOSPITAL_CATALOG_SHEET_ID')
    || env('VITE_HOSPITAL_CATALOG_URL')
    || ''
  ).trim();
  return parseSpreadsheetId(raw) || '';
}

export function hospitalCatalogEnabled() {
  return Boolean(hospitalCatalogSpreadsheetId());
}