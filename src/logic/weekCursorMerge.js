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

  const sheets = (remoteDept.sheets || []).map((sh) => {
    if (sh.id !== sheetId) return sh;
    return {
      ...sh,
      ...(hasWeek ? {
        startDate: localSheet.startDate,
        grid: localSheet.grid,
        warnings: localSheet.warnings,
        roomWarnings: localSheet.roomWarnings,
        buGrants: localSheet.buGrants,
        buPosted: localSheet.buPosted,
        leaveCuts: localSheet.leaveCuts,
        publishStatus: localSheet.publishStatus,
        weeks: { ...(sh.weeks || {}), ...(localSheet.weeks || {}) },
      } : {}),
      ...(hasMonth ? { monthKey: localSheet.monthKey } : {}),
      ...(hasLeaveMonth ? { leaveMonthKey: localSheet.leaveMonthKey } : {}),
      ...(hasStudyMonth ? { studyMonthKey: localSheet.studyMonthKey } : {}),
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