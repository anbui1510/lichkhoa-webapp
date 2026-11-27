const KEY = 'LICHKHOA_GOOGLE_HINT_EMAIL';

export function setGoogleHintEmail(email) {
  const value = String(email || '').trim().toLowerCase();
  if (!value) return;
  try {
    sessionStorage.setItem(KEY, value);
  } catch {
    /* private mode */
  }
}

export function getGoogleHintEmail() {
  try {
    return sessionStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
}

export function clearGoogleHintEmail() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* private mode */
  }
}

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-gsi]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Không tải được đăng nhập Google.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.dataset.googleGsi = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Không tải được đăng nhập Google.'));
    document.head.appendChild(script);
  });
}

/** Gỡ gợi ý tài khoản cũ trên nút Google (không đăng xuất Gmail toàn trình duyệt). */
export async function revokeGoogleHintEmail(email) {
  const target = String(email || getGoogleHintEmail() || '').trim().toLowerCase();
  if (!target) return;
  try {
    await loadGoogleScript();
    await new Promise((resolve) => {
      try {
        window.google?.accounts?.id?.disableAutoSelect?.();
        window.google?.accounts?.id?.cancel?.();
        if (typeof window.google?.accounts?.id?.revoke === 'function') {
          window.google.accounts.id.revoke(target, () => resolve());
          return;
        }
      } catch {
        /* GIS optional */
      }
      resolve();
    });
    clearGoogleHintEmail();
  } catch {
  /* offline script */
  }
}