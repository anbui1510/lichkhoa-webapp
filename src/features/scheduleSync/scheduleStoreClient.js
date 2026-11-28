import { isSheetBackend } from '../../config/dataBackend';
import {
  exportStoreToTabs,
  exportStoreToTabsForPush,
  importTabsToStore,
  storeReadyForSheetPush,
} from '../../logic/sheetStore';
import { mergeStoreStaffLoginEmails } from '../../logic/sheetStore/staffIdentityMerge.js';
import { sheetBridge } from '../sheetSync/sheetBridge';
import { getSpreadsheetId } from '../sheetSync/sheetStorage';
import { getSheetBridgeUrl } from '../../config/sheetSyncEnv';
import { getCloudMeta, normalizeStore } from '../../store/dbStore';
import { hasPendingSheetEdits } from '../../logic/pendingSheetEdits.js';
import { scheduleApi } from './scheduleApi';

/** @returns {Promise<{ payload: object, updatedAt: string } | null>} */
export async function pullScheduleStore(baseStore = null) {
  if (isSheetBackend()) {
    const spreadsheetId = getSpreadsheetId();
    if (!spreadsheetId) return null;
    const remote = await sheetBridge.pull(spreadsheetId);
    const payload = normalizeStore(importTabsToStore(remote.tabs || {}, baseStore));
    return { payload, updatedAt: remote.updatedAt || new Date().toISOString() };
  }
  return scheduleApi.get();
}

export async function pushScheduleStore(store) {
  if (isSheetBackend()) {
    const spreadsheetId = getSpreadsheetId();
    if (!spreadsheetId) return null;
    const safe = normalizeStore(store);
    if (!storeReadyForSheetPush(safe)) return null;
    const tabs = exportStoreToTabsForPush(safe);
    if (!Object.keys(tabs).length) return null;
    const res = await sheetBridge.push(spreadsheetId, tabs);
    return {
      updatedAt: res.updatedAt || new Date().toISOString(),
      written: res.written,
      skipped: res.skipped,
    };
  }
  return scheduleApi.put(store);
}

export async function bootstrapScheduleStore(store) {
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) return null;
  const tabs = exportStoreToTabs(normalizeStore(store));
  const res = await sheetBridge.bootstrap(spreadsheetId, tabs);
  return { updatedAt: res.updatedAt || new Date().toISOString(), actor: res.actor };
}

/** @returns {Promise<{ outcome: 'pushed'|'skipped_remote_newer'|'skipped_bootstrap', updatedAt?: string }|null>} */
export async function pushScheduleStoreIfNotStale(store) {
  if (!isSheetBackend()) {
    const res = await scheduleApi.put(store);
    return { outcome: 'pushed', updatedAt: res?.updatedAt };
  }
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) return null;
  const profile = await sheetBridge.getProfile(spreadsheetId);
  if (profile?.bootstrapEligible) return { outcome: 'skipped_bootstrap' };
  const localMeta = getCloudMeta();
  const remoteTs = profile?.updatedAt ? new Date(profile.updatedAt).getTime() : 0;
  const localTs = localMeta.updatedAt ? new Date(localMeta.updatedAt).getTime() : 0;
  // Có mark sửa local (NhanSu / roomTable / …) → vẫn push, không bỏ vì _meta Sheet mới hơn.
  if (remoteTs && localTs && remoteTs > localTs && !hasPendingSheetEdits()) {
    return { outcome: 'skipped_remote_newer' };
  }
  // Sheet SoT cho loginEmail: kéo NhanSu hiện tại rồi gộp trước khi ghi
  // (tránh local trống đè email vừa điền tay trên Sheet — BR-304-19).
  let toPush = normalizeStore(store);
  let identityFromRemote = null;
  try {
    const remote = await pullScheduleStore(toPush);
    if (remote?.payload) {
      const merged = mergeStoreStaffLoginEmails(toPush, remote.payload);
      if (merged.changed) {
        toPush = merged.store;
        identityFromRemote = remote.payload;
      }
    }
  } catch {
    /* vẫn push local nếu pull phụ thất bại */
  }
  const res = await pushScheduleStore(toPush);
  if (!res?.updatedAt && res == null) {
    return { outcome: 'skipped_bootstrap' };
  }
  if (Array.isArray(res?.skipped) && res.skipped.includes('NhanSu') && toPush?.departments?.[0]?.staff?.length) {
    const err = new Error(
      'Không ghi được tab NhanSu (thiếu quyền staff trên bridge). Kiểm tra accessRole / access_staff.'
    );
    err.status = 403;
    throw err;
  }
  return {
    outcome: 'pushed',
    updatedAt: res?.updatedAt,
    written: res?.written,
    skipped: res?.skipped,
    // Không trả toàn bộ store — caller giữ cursor tuần hiện tại; chỉ gộp loginEmail.
    identityFromRemote,
  };
}

export async function fetchSheetProfile() {
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) return null;
  return sheetBridge.getProfile(spreadsheetId);
}

export async function canSyncScheduleStore() {
  if (isSheetBackend()) {
    return Boolean(getSpreadsheetId() && getSheetBridgeUrl());
  }
  return true;
}
