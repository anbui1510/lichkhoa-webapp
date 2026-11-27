/**
 * Giữ tuần đang xem khi pull Sheet (F-304) ngay sau điều hướng tuần cục bộ.
 */
export function mergeWeekViewCursor(localStore, remoteStore) {
  if (!localStore || !remoteStore) return remoteStore;
  const deptId = localStore.activeDeptId || remoteStore.activeDeptId;
  const localDept = localStore.sheetsByDept?.[deptId];
  const remoteDept = remoteStore.sheetsByDept?.[deptId];
  if (!localDept || !remoteDept) return remoteStore;

  const sheetId = localDept.activeSheetId;
  const localSheet = (localDept.sheets || []).find((sh) => sh.id === sheetId);
  if (!localSheet?.startDate) return remoteStore;

  const sheets = (remoteDept.sheets || []).map((sh) => {
    if (sh.id !== sheetId) return sh;
    return {
      ...sh,
      startDate: localSheet.startDate,
      grid: localSheet.grid,
      warnings: localSheet.warnings,
      roomWarnings: localSheet.roomWarnings,
      buGrants: localSheet.buGrants,
      buPosted: localSheet.buPosted,
      leaveCuts: localSheet.leaveCuts,
      publishStatus: localSheet.publishStatus,
      weeks: { ...(sh.weeks || {}), ...(localSheet.weeks || {}) },
    };
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