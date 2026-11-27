/**
 * Phiên xem trước trên Cloudflare Pages (sheet backend, không API / không Google JWT).
 * Chỉ đủ vào app local; Sheet bridge vẫn đòi Google ID token thật.
 */
const KEY = 'LICHKHOA_SHEET_PREVIEW_SESSION';

/**
 * @returns {{ email: string, at: number } | null}
 */
export function getSheetPreviewSession() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const email = String(parsed?.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) return null;
    return { email, at: Number(parsed.at) || Date.now() };
  } catch {
    return null;
  }
}

export function setSheetPreviewSession(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) {
    clearSheetPreviewSession();
    return null;
  }
  const payload = { email: normalized, at: Date.now() };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* private mode */
  }
  return payload;
}

export function clearSheetPreviewSession() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* private mode */
  }
}

export function hasSheetPreviewSession() {
  return Boolean(getSheetPreviewSession()?.email);
}
