/**
 * Parse & validate Google Spreadsheet ID hoặc URL công khai.
 * Chỉ kiểm tra format — không gọi Sheets API.
 */

const SPREADSHEET_URL_RE = /\/spreadsheets\/(?:u\/\d+\/)?d\/([a-zA-Z0-9-_]+)/i;
const SPREADSHEET_ID_RE = /^[a-zA-Z0-9-_]{20,80}$/;

/**
 * @param {unknown} input
 * @returns {{ ok: true, spreadsheetId: string } | { ok: false, error: string }}
 */
export function parseSpreadsheetId(input) {
  const raw = String(input ?? '').trim();
  if (!raw) {
    return { ok: false, error: 'Nhập ID hoặc đường dẫn Google Spreadsheet.' };
  }

  const fromUrl = raw.match(SPREADSHEET_URL_RE);
  if (fromUrl?.[1]) {
    if (!SPREADSHEET_ID_RE.test(fromUrl[1])) {
      return {
        ok: false,
        error:
          'ID trong đường dẫn Spreadsheet không hợp lệ (cần chữ-số dài ≥ 20 ký tự).'
      };
    }
    return { ok: true, spreadsheetId: fromUrl[1] };
  }

  if (SPREADSHEET_ID_RE.test(raw)) {
    return { ok: true, spreadsheetId: raw };
  }

  return {
    ok: false,
    error:
      'ID hoặc đường dẫn Spreadsheet không hợp lệ. Dùng dạng https://docs.google.com/spreadsheets/d/… hoặc ID chữ-số dài ≥ 20 ký tự.'
  };
}
