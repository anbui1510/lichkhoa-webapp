import { getApiBase, isPasswordApiConfigured } from '../../../config/apiBase';

const TOKEN_KEY = 'LICHKHOA_AUTH_TOKEN';
const API_BASE = getApiBase();

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function apiDownMessage(status) {
  if (status === 405 || (!isPasswordApiConfigured() && (status === 404 || status === 405))) {
    return (
      'Preview Cloudflare Pages không chạy API Express. ' +
      'Đặt VITE_API_BASE=https://YOUR-API.onrender.com/api rồi rebuild, ' +
      'hoặc chạy local: npm run api:setup && npm run dev:api. ' +
      'Tài khoản seed admin@lichkhoa.local / admin123 chỉ dùng khi API đã seed.'
    );
  }
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
  googleConfig: () => request('/auth/google/config'),
  google: (credential) => request('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }),
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
  getNotifications: () => request('/settings/notifications'),
  getScheduleConfig: () => request('/schedule/config'),
  updateScheduleConfig: (body) =>
    request('/schedule/config', { method: 'PUT', body: JSON.stringify(body) }),
  updateLockWindows: (body) =>
    request('/schedule/lock-windows', { method: 'PUT', body: JSON.stringify(body) }),
  listRoster: () => request('/roster'),
  createRoster: (body) => request('/roster', { method: 'POST', body: JSON.stringify(body) }),
  updateRoster: (id, body) =>
    request(`/roster/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteRoster: (id) =>
    request(`/roster/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  linkRoster: (id) =>
    request(`/roster/${encodeURIComponent(id)}/link`, { method: 'POST', body: '{}' }),
  unlinkRoster: (id) =>
    request(`/roster/${encodeURIComponent(id)}/unlink`, { method: 'POST', body: '{}' })
};

/** Offline / API down: lưu profile & settings trên localStorage. */
const LOCAL_PROFILE_KEY = 'LICHKHOA_LOCAL_PROFILE';
const LOCAL_SETTINGS_KEY = 'LICHKHOA_LOCAL_SETTINGS';
/** One-shot: reset stale darkMode so app defaults to full white chrome. */
const THEME_LIGHT_DEFAULT_KEY = 'LICHKHOA_THEME_LIGHT_DEFAULT_V1';

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
    migrateThemeLightDefault();
    return JSON.parse(localStorage.getItem(LOCAL_SETTINGS_KEY) || 'null');
  } catch {
    return null;
  }
}

export function saveLocalSettings(settings) {
  localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
}

/** Prefer full-white light theme; clear old darkMode once per browser. */
export function migrateThemeLightDefault() {
  if (typeof localStorage === 'undefined') return;
  if (localStorage.getItem(THEME_LIGHT_DEFAULT_KEY) === '1') return;
  localStorage.setItem(THEME_LIGHT_DEFAULT_KEY, '1');
  try {
    const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
    const current = raw ? JSON.parse(raw) : {};
    const next = { ...(current && typeof current === 'object' ? current : {}), darkMode: false };
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(next));
  } catch {
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify({ darkMode: false, language: 'vi' }));
  }
  document.documentElement.classList.remove('dark');
  document.body?.classList.add('light-theme');
  document.body?.classList.remove('dark-theme');
}
