import { isMonthLayoutFresh } from './monthLayoutFresh.js';

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

  const sheetId = localDept.activeSheetId;
  const localSheet = (localDept.sheets || []).find((sh) => sh.id === sheetId);
  if (!localSheet) return remoteStore;

  const remoteSheet = (remoteDept.sheets || []).find((sh) => sh.id === sheetId);
  const patch = patchBuilder(localSheet, remoteSheet);
  if (!patch || !Object.keys(patch).length) return remoteStore;

  const sheets = (remoteDept.sheets || []).map((sh) => {
    if (sh.id !== sheetId) return sh;
    return { ...sh, ...patch };
  });

  return {
    ...remoteStore,
    sheetsByDept: {
      ...remoteStore.sheetsByDept,
      [deptId]: {
        ...remoteDept,
        activeSheetId: localDept.activeSheetId,
        sheets,
      },
    },
  };
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
 * Giữ cursor lịch đang xem khi pull Sheet (F-304) ngay sau điều hướng cục bộ.
 */
export function mergeWeekViewCursor(localStore, remoteStore) {
  if (!localStore || !remoteStore) return remoteStore;
  const deptId = localStore.activeDeptId || remoteStore.activeDeptId;
  const localDept = localStore.sheetsByDept?.[deptId];
  const remoteDept = remoteStore.sheetsByDept?.[deptId];
  if (!localDept || !remoteDept) return remoteStore;

  const sheetId = localDept.activeSheetId;
  const localSheet = (localDept.sheets || []).find((sh) => sh.id === sheetId);
  if (!localSheet) return remoteStore;

  const hasWeek = Boolean(localSheet.startDate);
  const hasMonth = Boolean(localSheet.monthKey);
  const hasLeaveMonth = Boolean(localSheet.leaveMonthKey);
  const hasStudyMonth = Boolean(localSheet.studyMonthKey);
  if (!hasWeek && !hasMonth && !hasLeaveMonth && !hasStudyMonth) return remoteStore;

  return mergeActiveSheetFields(localStore, remoteStore, (localSheet, remoteSheet) => ({
    ...(hasWeek ? {
      startDate: localSheet.startDate,
      grid: localSheet.grid,
      warnings: localSheet.warnings,
      roomWarnings: localSheet.roomWarnings,
      buGrants: localSheet.buGrants,
      buPosted: localSheet.buPosted,
      leaveCuts: localSheet.leaveCuts,
      publishStatus: localSheet.publishStatus,
      weeks: { ...(remoteSheet?.weeks || {}), ...(localSheet.weeks || {}) },
    } : {}),
    ...(hasMonth ? { monthKey: localSheet.monthKey } : {}),
    ...(hasLeaveMonth ? { leaveMonthKey: localSheet.leaveMonthKey } : {}),
    ...(hasStudyMonth ? { studyMonthKey: localSheet.studyMonthKey } : {}),
  }));
}