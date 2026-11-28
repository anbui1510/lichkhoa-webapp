const SESSION_KEY = 'LICHKHOA_APP_LOGIN_SESSION';
export const DEFAULT_SESSION_MINUTES = 60;

export function startLoginSession(user) {
  if (!user?.email) return;
  const now = Date.now();
  const payload = {
    email: String(user.email).trim().toLowerCase(),
    userSnapshot: {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    },
    startedAt: now,
    lastActivityAt: now,
  };
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  } catch {
    /* private mode */
  }
}

export function touchLoginSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    data.lastActivityAt = Date.now();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function clearLoginSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function getLoginSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** `null` = vô thời hạn; số = phút không hoạt động trước khi thoát. */
export function resolveSessionTimeoutMinutes(settings) {
  const raw = settings?.sessionTimeoutMinutes;
  if (raw === null) return null;
  if (raw === undefined) return DEFAULT_SESSION_MINUTES;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(24 * 60, Math.max(1, Math.round(n)));
}

export function isLoginSessionActive(settings) {
  const session = getLoginSession();
  if (!session?.email) return false;
  const limitMin = resolveSessionTimeoutMinutes(settings);
  if (limitMin === null) return true;
  const last = Number(session.lastActivityAt || session.startedAt || 0);
  if (!last) return false;
  return Date.now() - last < limitMin * 60_000;
}

export function loginSessionUserSnapshot(settings) {
  if (!isLoginSessionActive(settings)) return null;
  return getLoginSession()?.userSnapshot || null;
}