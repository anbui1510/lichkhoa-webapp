import { asArray } from './sheetStore/tableUtils.js';
import { isStaffFresh } from './staffFresh.js';

/**
 * Khi vừa sửa NhanSu trên app, pull Sheet không được ghi đè staff local
 * (studyFrom/studyTo/showInWeek, …) trước khi push kịp.
 */
export function mergeStaffOnPull(localStore, remoteStore) {
  if (!isStaffFresh() || !localStore?.departments || !remoteStore?.departments) {
    return remoteStore;
  }
  const localById = new Map(
    asArray(localStore.departments).map((dept) => [dept.id, dept]),
  );
  const departments = asArray(remoteStore.departments).map((dept) => {
    const localDept = localById.get(dept.id);
    if (!localDept || !asArray(localDept.staff).length) return dept;
    return { ...dept, staff: localDept.staff };
  });
  return { ...remoteStore, departments };
}
