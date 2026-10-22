const TOKEN_KEY = 'LICHKHOA_AUTH_TOKEN';
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  let data = null;
  const text = await response.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text || 'Phản hồi không hợp lệ.' };
  }

  if (!response.ok) {
    const error = new Error(data?.error || `Lỗi ${response.status}`);
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
