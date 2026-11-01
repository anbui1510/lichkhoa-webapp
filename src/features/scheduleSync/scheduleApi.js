import { getToken } from '../account/services/accountApi';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (error) {
    const err = new Error('Không kết nối được API lịch.');
    err.status = 0;
    err.cause = error;
    throw err;
  }

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const err = new Error(data?.error || `Lỗi máy chủ (${response.status}).`);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const scheduleApi = {
  /** @returns {Promise<{ payload: object, updatedAt: string } | null>} */
  async get() {
    if (!getToken()) return null;
    try {
      return await request('/schedule-store');
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  },
  async put(payload) {
    if (!getToken()) return null;
    return request('/schedule-store', {
      method: 'PUT',
      body: JSON.stringify({ payload }),
    });
  },
};
