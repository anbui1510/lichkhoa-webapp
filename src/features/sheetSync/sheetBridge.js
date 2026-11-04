import { getGoogleIdToken } from './googleIdToken';

const BRIDGE_URL = import.meta.env.VITE_SHEET_BRIDGE_URL || '';

async function postBridge(body) {
  if (!BRIDGE_URL) {
    const err = new Error('Chưa cấu hình VITE_SHEET_BRIDGE_URL.');
    err.status = 503;
    throw err;
  }
  const idToken = getGoogleIdToken();
  if (!idToken) {
    const err = new Error('Cần đăng nhập Google để đồng bộ Sheet.');
    err.status = 401;
    throw err;
  }
  let response;
  try {
    response = await fetch(BRIDGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...body, idToken }),
    });
  } catch (error) {
    const err = new Error('Không kết nối được Sheet bridge.');
    err.status = 0;
    err.cause = error;
    throw err;
  }
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text || 'Phản hồi không hợp lệ.' };
  }
  if (!response.ok || data?.error) {
    const err = new Error(data?.error || `Lỗi bridge (${response.status}).`);
    err.status = response.status;
    throw err;
  }
  return data;
}

export const sheetBridge = {
  async getProfile(spreadsheetId) {
    return postBridge({ action: 'getProfile', spreadsheetId });
  },
  async pull(spreadsheetId) {
    return postBridge({ action: 'pull', spreadsheetId });
  },
  async push(spreadsheetId, tabs) {
    return postBridge({ action: 'push', spreadsheetId, tabs });
  },
  async bootstrap(spreadsheetId, tabs) {
    return postBridge({ action: 'bootstrap', spreadsheetId, tabs });
  },
};
