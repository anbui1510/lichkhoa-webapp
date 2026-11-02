import { isSheetBackend } from '../../config/dataBackend';
import { exportStoreToTabs, importTabsToStore } from '../../logic/sheetStore';
import { sheetBridge } from '../sheetSync/sheetBridge';
import { getSpreadsheetId } from '../sheetSync/sheetStorage';
import { scheduleApi } from './scheduleApi';

/** @returns {Promise<{ payload: object, updatedAt: string } | null>} */
export async function pullScheduleStore(baseStore = null) {
  if (isSheetBackend()) {
    const spreadsheetId = getSpreadsheetId();
    if (!spreadsheetId) return null;
    const remote = await sheetBridge.pull(spreadsheetId);
    const payload = importTabsToStore(remote.tabs || {}, baseStore);
    return { payload, updatedAt: remote.updatedAt || new Date().toISOString() };
  }
  return scheduleApi.get();
}

export async function pushScheduleStore(store) {
  if (isSheetBackend()) {
    const spreadsheetId = getSpreadsheetId();
    if (!spreadsheetId) return null;
    const tabs = exportStoreToTabs(store);
    const res = await sheetBridge.push(spreadsheetId, tabs);
    return { updatedAt: res.updatedAt || new Date().toISOString() };
  }
  return scheduleApi.put(store);
}

export async function canSyncScheduleStore() {
  if (isSheetBackend()) {
    return Boolean(getSpreadsheetId() && import.meta.env.VITE_SHEET_BRIDGE_URL);
  }
  return true;
}
