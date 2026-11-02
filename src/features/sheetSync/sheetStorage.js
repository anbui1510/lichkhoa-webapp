import { parseSpreadsheetId } from '../../logic/sheetStore/parseSpreadsheetId';

const SHEET_ID_KEY = 'LICHKHOA_SHEET_ID';
const SHEET_URL_KEY = 'LICHKHOA_SHEET_URL';

export function getSpreadsheetId() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('sheet');
    if (fromUrl) {
      const id = parseSpreadsheetId(fromUrl);
      if (id) {
        localStorage.setItem(SHEET_ID_KEY, id);
        return id;
      }
    }
    return localStorage.getItem(SHEET_ID_KEY) || '';
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
    return localStorage.getItem(SHEET_URL_KEY) || '';
  } catch {
    return '';
  }
}

export function clearSpreadsheetConnection() {
  localStorage.removeItem(SHEET_ID_KEY);
  localStorage.removeItem(SHEET_URL_KEY);
}
