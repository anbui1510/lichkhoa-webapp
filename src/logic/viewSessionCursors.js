import { mondayOf } from './monthSchedule.js';

const VIEW_TAB_KEY = 'LICHKHOA_VIEW_TAB';

/** F5 hoặc tab mới → mặc định tuần/tháng hiện tại. */
export function shouldResetViewOnLoad() {
  if (typeof window === 'undefined' || typeof performance === 'undefined') return false;
  const nav = performance.getEntriesByType('navigation')[0];
  if (nav?.type === 'reload') return true;
  if (!sessionStorage.getItem(VIEW_TAB_KEY)) return true;
  return false;
}

export function markViewSessionStarted() {
  try {
    sessionStorage.setItem(VIEW_TAB_KEY, String(Date.now()));
  } catch {
    /* private mode */
  }
}

export function resetActiveSheetView(store) {
  if (!store?.sheetsByDept) return store;
  const deptId = store.activeDeptId || store.departments?.[0]?.id;
  const dept = store.sheetsByDept[deptId];
  if (!dept?.sheets?.length) return store;
  const sheetId = dept.activeSheetId || dept.sheets[0]?.id;
  const weekStart = mondayOf(new Date());
  const sheets = dept.sheets.map((sh) => {
    if (sh.id !== sheetId) return sh;
    const next = { ...sh, startDate: weekStart };
    delete next.monthKey;
    delete next.leaveMonthKey;
    delete next.studyMonthKey;
    return next;
  });
  return {
    ...store,
    sheetsByDept: {
      ...store.sheetsByDept,
      [deptId]: { ...dept, sheets },
    },
  };
}