import { SHEET_TABS } from './constants.js';
import { exportStoreToTabs } from './bundle.js';
import { asArray } from './tableUtils.js';

function countSheetDataRows(tabRows) {
  if (!tabRows?.length) return 0;
  return Math.max(0, tabRows.length - 1);
}

/**
 * F-304 — không ghi đè Sheet bằng tab chỉ có header / store trống nhân sự.
 * @param {object} store
 */
export function exportStoreToTabsForPush(store) {
  const tabs = exportStoreToTabs(store);
  const deptId = store?.activeDeptId || store?.departments?.[0]?.id;
  const dept = store?.departments?.find((d) => d.id === deptId) || store?.departments?.[0];
  const staffCount = asArray(dept?.staff).length;
  const taskCount = asArray(dept?.tasks).length;

  if (staffCount === 0 && countSheetDataRows(tabs[SHEET_TABS.NHAN_SU]) === 0) {
    delete tabs[SHEET_TABS.NHAN_SU];
  }
  if (taskCount === 0 && countSheetDataRows(tabs[SHEET_TABS.TASK]) === 0) {
    delete tabs[SHEET_TABS.TASK];
  }
  return tabs;
}

export function storeReadyForSheetPush(store) {
  const dept = store?.departments?.[0];
  return asArray(dept?.staff).length > 0;
}