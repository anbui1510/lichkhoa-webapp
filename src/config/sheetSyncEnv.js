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
  if (!getSpreadsheetId()) {
    blockers.push('Chưa lưu link Google Sheet: Tài khoản → Tùy chọn → Sổ lịch Google Sheet.');
  }
  if (!getSheetBridgeUrl()) {
    blockers.push(
      'Hệ thống chưa cấu hình đồng bộ (IT: Apps Script bridge trên Cloudflare). Bạn vẫn lưu được ID sổ trên trình duyệt.'
    );
  }
  if (ctx.previewSession) {
    blockers.push(
      'Bạn đang ở «Vào xem trước» — không đồng bộ Sheet. Đăng xuất và đăng nhập Google (email khớp tab NhanSu).'
    );
  } else if (ctx.googleSignedIn === false) {
    blockers.push('Cần đăng nhập Google để kéo dữ liệu từ Sheet (email khớp tab NhanSu).');
  }
  return blockers;
}

export function canRunSheetBridge(ctx = {}) {
  return isSheetBackend() && sheetSyncBlockers(ctx).length === 0;
}