const KEY = 'LICHKHOA_GOOGLE_ID_TOKEN';

function decodeJwtPayload(token) {
  try {
    const part = String(token || '').split('.')[1];
    if (!part) return null;
  const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function setGoogleIdToken(token) {
  try {
    if (token) sessionStorage.setItem(KEY, token);
    else sessionStorage.removeItem(KEY);
  } catch {
    /* private mode */
  }
}

/** Trả về JWT GIS; xóa token nếu hết hạn (~1h) để tránh bridge báo «Invalid Value». */
export function getGoogleIdToken() {
  try {
    const token = sessionStorage.getItem(KEY) || '';
    if (!token) return '';
    const payload = decodeJwtPayload(token);
    if (payload?.exp && payload.exp * 1000 < Date.now() - 30_000) {
      sessionStorage.removeItem(KEY);
      return '';
    }
    return token;
  } catch {
    return '';
  }
}
