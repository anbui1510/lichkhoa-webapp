const TOKEN_KEY = 'LICHKHOA_AUTH_TOKEN';
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function apiDownMessage(status) {
  if (status === 404 || status === 502 || status === 503 || status === 504) {
    return 'API chưa chạy hoặc không tìm thấy. Mở thêm terminal: npm run api:setup (lần đầu) rồi npm run dev:api';
  }
  return `Lỗi máy chủ (${status}).`;
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers
    });
  } catch {
    const error = new Error(
      'Không kết nối được API (localhost:4000). Chạy: npm run dev:api'
    );
    error.status = 0;
    throw error;
  }

  let data = null;
  const text = await response.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: apiDownMessage(response.status) };
  }

  if (!response.ok) {
    const message = (data && typeof data.error === 'string' && data.error.length < 200)
      ? data.error
      : apiDownMessage(response.status);
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export const accountApi = {
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),
  getProfile: () => request('/profile'),
  updateProfile: (body) => request('/profile', { method: 'PUT', body: JSON.stringify(body) }),
  uploadAvatar: (file) => {
    const form = new FormData();
    form.append('avatar', file);
    return request('/profile/avatar', { method: 'POST', body: form });
  },
  getSettings: () => request('/settings'),
  updateSettings: (body) => request('/settings', { method: 'PUT', body: JSON.stringify(body) }),
  updatePassword: (body) => request('/settings/password', { method: 'PUT', body: JSON.stringify(body) }),
  updateSecurity: (body) => request('/settings/security', { method: 'PUT', body: JSON.stringify(body) }),
  getNotifications: () => request('/settings/notifications')
};

/** Offline / API down: lưu profile & settings trên localStorage. */
const LOCAL_PROFILE_KEY = 'LICHKHOA_LOCAL_PROFILE';
const LOCAL_SETTINGS_KEY = 'LICHKHOA_LOCAL_SETTINGS';

export function loadLocalProfile() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_PROFILE_KEY) || 'null');
  } catch {
    return null;
  }
}

export function saveLocalProfile(profile) {
  localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
}

export function loadLocalSettings() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_SETTINGS_KEY) || 'null');
  } catch {
    return null;
  }
}

export function saveLocalSettings(settings) {
  localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
}
