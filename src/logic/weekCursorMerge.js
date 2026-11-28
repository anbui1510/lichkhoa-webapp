/**
 * Giữ cursor lịch đang xem khi pull Sheet (F-304) — ưu tiên cục bộ cả phiên tab.
 */
export function mergeWeekViewCursor(localStore, remoteStore) {
  if (!localStore || !remoteStore) return remoteStore;
  const deptId = localStore.activeDeptId || remoteStore.activeDeptId;
  const localDept = localStore.sheetsByDept?.[deptId];
  const remoteDept = remoteStore.sheetsByDept?.[deptId];
  if (!localDept || !remoteDept) return remoteStore;

  const sheetId = localDept.activeSheetId || remoteDept.activeSheetId;
  const localSheet = (localDept.sheets || []).find((sh) => sh.id === sheetId);
  if (!localSheet) return remoteStore;

  const sheets = (remoteDept.sheets || []).map((sh) => {
    if (sh.id !== sheetId) return sh;
    const next = {
      ...sh,
      startDate: localSheet.startDate ?? sh.startDate,
      grid: localSheet.grid ?? sh.grid,
      warnings: localSheet.warnings,
      roomWarnings: localSheet.roomWarnings,
      buGrants: localSheet.buGrants,
      buPosted: localSheet.buPosted,
      leaveCuts: localSheet.leaveCuts,
      publishStatus: localSheet.publishStatus,
      weeks: { ...(sh.weeks || {}), ...(localSheet.weeks || {}) },
    };
    if (localSheet.monthKey) next.monthKey = localSheet.monthKey;
    else delete next.monthKey;
    if (localSheet.leaveMonthKey) next.leaveMonthKey = localSheet.leaveMonthKey;
    else delete next.leaveMonthKey;
    if (localSheet.studyMonthKey) next.studyMonthKey = localSheet.studyMonthKey;
    else delete next.studyMonthKey;
    return next;
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