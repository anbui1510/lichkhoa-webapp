const KEY = 'LICHKHOA_GOOGLE_ID_TOKEN';

export function setGoogleIdToken(token) {
  try {
    if (token) sessionStorage.setItem(KEY, token);
    else sessionStorage.removeItem(KEY);
  } catch {
    /* private mode */
  }
}

export function getGoogleIdToken() {
  try {
    return sessionStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
}
