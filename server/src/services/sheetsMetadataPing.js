/**
 * Ping metadata Spreadsheet (Q2=C): chỉ chạy khi đã cấu hình credentials.
 * Thiếu credentials → skip (không chặn lưu format OK).
 */

import { GoogleAuth } from 'google-auth-library';

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';

/**
 * @returns {boolean}
 */
export function hasSheetsCredentials() {
  const email = String(process.env.GOOGLE_SHEETS_CLIENT_EMAIL || '').trim();
  const key = String(process.env.GOOGLE_SHEETS_PRIVATE_KEY || '').trim();
  return Boolean(email && key);
}

function normalizePrivateKey(raw) {
  return String(raw || '')
    .replace(/^"|"$/g, '')
    .replace(/\\n/g, '\n');
}

/**
 * @param {string} spreadsheetId
 * @returns {Promise<{ skipped: true } | { ok: true, title: string } | { ok: false, error: string }>}
 */
export async function pingSpreadsheetMetadata(spreadsheetId) {
  if (!hasSheetsCredentials()) {
    return { skipped: true };
  }

  const clientEmail = String(process.env.GOOGLE_SHEETS_CLIENT_EMAIL || '').trim();
  const privateKey = normalizePrivateKey(process.env.GOOGLE_SHEETS_PRIVATE_KEY);

  try {
    const auth = new GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey
      },
      scopes: [SHEETS_SCOPE]
    });
    const client = await auth.getClient();
    const url =
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}` +
      '?fields=spreadsheetId,properties.title';
    const res = await client.request({ url, timeout: 10000 });
    const title = String(res?.data?.properties?.title || '').trim();
    return { ok: true, title };
  } catch (err) {
    const status = err?.response?.status || err?.code;
    const detail =
      err?.response?.data?.error?.message ||
      err?.message ||
      'Không đọc được Spreadsheet.';
    let message =
      'Không truy cập được Google Spreadsheet. Kiểm tra quyền chia sẻ với service account và ID Sheet.';
    if (status === 404) {
      message = 'Không tìm thấy Spreadsheet (sai ID hoặc Sheet đã bị xóa).';
    } else if (status === 403) {
      message =
        'Service account chưa có quyền đọc Spreadsheet. Hãy chia sẻ Sheet cho email service account (ít nhất quyền Viewer).';
    } else if (typeof detail === 'string' && detail.length < 180) {
      message = `Không đọc được Spreadsheet: ${detail}`;
    }
    return { ok: false, error: message };
  }
}
