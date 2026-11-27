import { isSheetBackend } from './dataBackend';
import { getSpreadsheetId } from '../features/sheetSync/sheetStorage';

export function getSheetBridgeUrl() {
  return String(import.meta.env.VITE_SHEET_BRIDGE_URL || '').trim();
}

/**
 * Vì sao F-304 chưa pull/push được (Pages hay preview).
 * @param {{ googleSignedIn?: boolean, previewSession?: boolean }} ctx
 */
export function sheetSyncBlockers(ctx = {}) {
  if (!isSheetBackend()) return [];
  const blockers = [];
  if (!getSheetBridgeUrl()) {
    blockers.push('Chưa cấu hình VITE_SHEET_BRIDGE_URL (Apps Script Web App) trên Cloudflare Pages.');
  }
  if (!getSpreadsheetId()) {
    blockers.push('Chưa chọn ID/link Google Sheet trong Tài khoản → Tùy chọn.');
  }
  if (ctx.previewSession) {
    blockers.push(
      'Đang dùng «Vào xem trước» — cần đăng nhập Google (email khớp NhanSu) để gọi bridge.'
    );
  } else if (ctx.googleSignedIn === false) {
    blockers.push('Chưa có phiên Google — đăng xuất và đăng nhập lại bằng Google.');
  }
  return blockers;
}

export function canRunSheetBridge(ctx = {}) {
  return isSheetBackend() && sheetSyncBlockers(ctx).length === 0;
}