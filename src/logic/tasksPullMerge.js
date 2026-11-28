import { asArray } from './sheetStore/tableUtils.js';
import { isTasksFresh } from './tasksFresh.js';

/**
 * Vừa sửa Quản lý Task — pull Sheet không ghi đè tasks local trước khi push kịp.
 */
export function mergeTasksOnPull(localStore, remoteStore) {
  if (!isTasksFresh() || !localStore?.departments || !remoteStore?.departments) {
    return remoteStore;
  }
  const localById = new Map(
    asArray(localStore.departments).map((dept) => [dept.id, dept]),
  );
  const departments = asArray(remoteStore.departments).map((dept) => {
    const localDept = localById.get(dept.id);
    if (!localDept || !asArray(localDept.tasks).length) return dept;
    return { ...dept, tasks: localDept.tasks };
  });
  return { ...remoteStore, departments };
}
