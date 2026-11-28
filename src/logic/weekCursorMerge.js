import { isDeptEntriesFresh } from './deptEntriesFresh.js';
import { isMonthLayoutFresh } from './monthLayoutFresh.js';
import { isRoomTableFresh } from './roomTableFresh.js';

const MONTH_LAYOUT_FIELDS = [
  'monthRoles',
  'monthGrid',
  'monthColumnOrder',
  'monthColumnTitles',
  'monthMerges',
  'cathRoles',
];

function mergeActiveSheetFields(localStore, remoteStore, patchBuilder) {
  if (!localStore || !remoteStore) return remoteStore;
  const deptId = localStore.activeDeptId || remoteStore.activeDeptId;
  const localDept = localStore.sheetsByDept?.[deptId];
  const remoteDept = remoteStore.sheetsByDept?.[deptId];
  if (!localDept || !remoteDept) return remoteStore;

  const sheetId = localDept.activeSheetId || remoteDept.activeSheetId;
  const localSheet = (localDept.sheets || []).find((sh) => sh.id === sheetId);
  if (!localSheet) return remoteStore;

  const remoteSheet = (remoteDept.sheets || []).find((sh) => sh.id === sheetId);
  const patch = patchBuilder(localSheet, remoteSheet);
  if (!patch || !Object.keys(patch).length) return remoteStore;

  const sheets = (remoteDept.sheets || []).map((sh) => {
    if (sh.id !== sheetId) return sh;
    const merged = { ...sh, ...patch };
    ['monthKey', 'leaveMonthKey', 'studyMonthKey'].forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(patch, field) && patch[field] == null) {
        delete merged[field];
      }
    });
    return merged;
  });

  return {
    ...remoteStore,
    sheetsByDept: {
      ...remoteStore.sheetsByDept,
      [deptId]: {
        ...remoteDept,
        activeSheetId: localDept.activeSheetId || remoteDept.activeSheetId,
        sheets,
      },
    },
  };
}

/** Giữ lịch nghỉ/học cục bộ trước khi push Sheet kịp ghi (F-304). */
export function mergeDeptEntriesOnPull(localStore, remoteStore) {
  if (!isDeptEntriesFresh() || !localStore || !remoteStore) return remoteStore;
  const deptId = localStore.activeDeptId || remoteStore.activeDeptId;
  const localDept = localStore.departments?.find((dept) => dept.id === deptId);
  if (!localDept) return remoteStore;

  const departments = asArray(remoteStore.departments).map((dept) => {
    if (dept.id !== deptId) return dept;
    return {
      ...dept,
      leaveEntries: localDept.leaveEntries ?? dept.leaveEntries,
      studyEntries: localDept.studyEntries ?? dept.studyEntries,
    };
  });

  return { ...remoteStore, departments };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

/** Giữ layout lịch tháng cục bộ khi vừa thêm/xóa/sắp dòng (trước khi push Sheet kịp ghi). */
export function mergeMonthLayoutOnPull(localStore, remoteStore) {
  if (!isMonthLayoutFresh()) return remoteStore;
  return mergeActiveSheetFields(localStore, remoteStore, (localSheet) => {
    const patch = {};
    MONTH_LAYOUT_FIELDS.forEach((field) => {
      if (localSheet[field] !== undefined) patch[field] = localSheet[field];
    });
    return patch;
  });
}

/**
 * Giữ cursor lịch đang xem khi pull Sheet (F-304) — ưu tiên cục bộ cả phiên tab.
 */
export function mergeWeekViewCursor(localStore, remoteStore) {
  if (!localStore || !remoteStore) return remoteStore;

  return mergeActiveSheetFields(localStore, remoteStore, (localSheet, remoteSheet) => {
    const next = {
      startDate: localSheet.startDate ?? remoteSheet?.startDate,
      grid: localSheet.grid ?? remoteSheet?.grid,
      warnings: localSheet.warnings,
      roomWarnings: localSheet.roomWarnings,
      buGrants: localSheet.buGrants,
      buPosted: localSheet.buPosted,
      leaveCuts: localSheet.leaveCuts,
      publishStatus: localSheet.publishStatus,
      weeks: { ...(remoteSheet?.weeks || {}), ...(localSheet.weeks || {}) },
    };
    next.monthKey = localSheet.monthKey ?? null;
    next.leaveMonthKey = localSheet.leaveMonthKey ?? null;
    next.studyMonthKey = localSheet.studyMonthKey ?? null;
    if (isRoomTableFresh() && localSheet.roomTable) {
      next.roomTable = localSheet.roomTable;
    }
    return next;
  });
}