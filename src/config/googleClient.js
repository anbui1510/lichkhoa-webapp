import { isSheetBackend } from './dataBackend.js';

/** OAuth Web Client ID cho Google Identity Services (trình duyệt). */
export function getGoogleClientIdFromEnv() {
  try {
    return String(import.meta.env?.VITE_GOOGLE_CLIENT_ID || '').trim();
  } catch {
    return '';
  }
}

/**
 * F-304 Pages: Client ID từ build env — không cần GET /api/auth/google/config (Render).
 * API backend vẫn có thể lấy clientId từ server khi thiếu env.
 */
export async function resolveGoogleClientId(fetchFromApi) {
  const fromEnv = getGoogleClientIdFromEnv();
  if (fromEnv) return fromEnv;
  if (isSheetBackend()) return '';
  try {
    const config = await fetchFromApi();
    return String(config?.clientId || '').trim();
  } catch {
    return '';
  }
}