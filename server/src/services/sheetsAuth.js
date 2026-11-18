/**
 * Shared Google Sheets service-account auth (read/write).
 * Credentials: GOOGLE_SHEETS_CLIENT_EMAIL + GOOGLE_SHEETS_PRIVATE_KEY.
 */

import { GoogleAuth } from 'google-auth-library';

export const SHEETS_RW_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

/**
 * @returns {boolean}
 */
export function hasSheetsCredentials() {
  const email = String(process.env.GOOGLE_SHEETS_CLIENT_EMAIL || '').trim();
  const key = String(process.env.GOOGLE_SHEETS_PRIVATE_KEY || '').trim();
  return Boolean(email && key);
}

/**
 * @param {string | undefined} raw
 * @returns {string}
 */
export function normalizePrivateKey(raw) {
  return String(raw || '')
    .replace(/^"|"$/g, '')
    .replace(/\\n/g, '\n');
}

/**
 * @param {string[]} [scopes]
 * @returns {Promise<import('google-auth-library').AuthClient>}
 */
export async function getSheetsAuthClient(scopes = [SHEETS_RW_SCOPE]) {
  if (!hasSheetsCredentials()) {
    const err = new Error(
      'Chưa cấu hình Google Sheets (GOOGLE_SHEETS_CLIENT_EMAIL / GOOGLE_SHEETS_PRIVATE_KEY). Không thể đồng bộ lịch lên Sheet.'
    );
    err.status = 503;
    throw err;
  }
  const auth = new GoogleAuth({
    credentials: {
      client_email: String(process.env.GOOGLE_SHEETS_CLIENT_EMAIL || '').trim(),
      private_key: normalizePrivateKey(process.env.GOOGLE_SHEETS_PRIVATE_KEY)
    },
    scopes
  });
  return auth.getClient();
}
