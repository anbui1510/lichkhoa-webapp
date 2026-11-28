/**
 * F-102: phiên hợp lệ để vào app (khác offline local profile).
 * @param {{
 *   backend?: 'sheet' | 'api',
 *   token?: string,
 *   googleToken?: string,
 *   sheetPreview?: boolean,
 *   user?: { id?: string, email?: string } | null,
 *   offline?: boolean,
 *   appSessionActive?: boolean
 * }} opts
 */
export function isSessionReady(opts = {}) {
  const backend = opts.backend === 'sheet' ? 'sheet' : 'api';
  const user = opts.user || null;
  const email = String(user?.email || '').trim();

  if (backend === 'sheet') {
    if (!email) return false;
    if (opts.appSessionActive) return true;
    // Google JWT thật, hoặc phiên xem trước Pages (không đồng bộ Sheet).
    return Boolean(String(opts.googleToken || '').trim() || opts.sheetPreview);
  }

  return Boolean(
    String(opts.token || '').trim()
    && user?.id
    && opts.offline !== true
  );
}

const NOTICE_KEY = 'LICHKHOA_SESSION_NOTICE';

export function getSessionNotice() {
  try {
    return sessionStorage.getItem(NOTICE_KEY) || '';
  } catch {
    return '';
  }
}

export function setSessionNotice(value) {
  try {
    if (value) sessionStorage.setItem(NOTICE_KEY, String(value));
    else sessionStorage.removeItem(NOTICE_KEY);
  } catch {
    /* private mode */
  }
}

export function clearSessionNotice() {
  setSessionNotice('');
}
