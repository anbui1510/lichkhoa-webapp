import { getGoogleIdToken } from './googleIdToken';

const BRIDGE_URL = import.meta.env.VITE_SHEET_BRIDGE_URL || '';

function normalizeBridgeError(message) {
  const msg = String(message || '').trim();
  if (/api key/i.test(msg)) {
    return (
      'Bridge Sheet: Apps Script cần liên kết đúng Google Cloud project (cùng OAuth client) ' +
      'và deploy lại Web App từ google-apps-script/Code.gs. Chi tiết: docs/DEPLOY-GOOGLE-SHEETS.md.'
    );
  }
  if (/^invalid value$/i.test(msg)) {
    return (
      'Token Google hết hạn hoặc ID Sheet sai. Thử: (1) Đăng xuất → đăng nhập lại Google; ' +
      '(2) Tài khoản → kiểm tra link Sheet (chỉ URL/ID Tim mạch); ' +
      '(3) Cloudflare VITE_GOOGLE_CLIENT_ID khớp OAuth Web trên Google Cloud.'
    );
  }
  if (/spreadsheetId không hợp lệ/i.test(msg)) return msg;
  if (/UrlFetchApp\.fetch|script\.external_request/i.test(msg)) {
    return (
      'Bridge chưa có quyền UrlFetchApp (xác thực Google token). Mở GET bridge trên trình duyệt chỉ kiểm tra sống — ' +
      'không thay bước này. IT (Gmail deploy): Apps Script → dán appsscript.json (scope script.external_request) → ' +
      'chọn hàm authorizeBridgeAllOnce → Chạy → Cho phép → Deploy → Manage → Edit → New version (Execute as: Me). ' +
      'Chi tiết: docs/SETUP-BRIDGE-IT-ONCE.md mục 5b.'
    );
  }
  return msg || 'Lỗi đồng bộ Sheet.';
}

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
    const err = new Error(
      'Không kết nối được Sheet bridge (mạng hoặc URL sai). Kiểm tra VITE_SHEET_BRIDGE_URL trên Cloudflare và mở lại sau vài giây.'
    );
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
    const err = new Error(normalizeBridgeError(data?.error) || `Lỗi bridge (${response.status}).`);
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
