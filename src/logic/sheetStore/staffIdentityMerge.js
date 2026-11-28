import { asArray } from './tableUtils.js';

/** Sentinel xuất Sheet khi gỡ liên kết có chủ đích (bridge không preserve). */
export const LOGIN_EMAIL_CLEAR = '-';

export function normalizeLoginEmail(value) {
  const raw = String(value || '').trim();
  if (!raw || raw === LOGIN_EMAIL_CLEAR) return '';
  return raw.toLowerCase();
}

export function isLoginEmailClearSentinel(value) {
  return String(value || '').trim() === LOGIN_EMAIL_CLEAR;
}

/**
 * Gộp loginEmail từ remote (Sheet) vào local trước push / khi LWW bỏ qua pull đầy đủ.
 * - Local có sentinel `-` → giữ (gỡ liên kết có chủ đích)
 * - Local có email → giữ local
 * - Local trống + remote có email → lấy remote (tránh push xóa email vừa sửa trên Sheet)
 */
export function mergeStaffLoginEmails(localStaff, remoteStaff) {
  const remoteById = new Map();
  asArray(remoteStaff).forEach((person) => {
    const id = String(person?.id || '').trim();
    if (id) remoteById.set(id, person);
  });

  let changed = false;
  const next = asArray(localStaff).map((person) => {
    const id = String(person?.id || '').trim();
    const localRaw = String(person?.loginEmail || '').trim();
    if (isLoginEmailClearSentinel(localRaw)) return person;
    if (normalizeLoginEmail(localRaw)) return person;

    const remote = remoteById.get(id);
    const remoteLogin = normalizeLoginEmail(remote?.loginEmail);
    if (!remoteLogin) return person;
    changed = true;
    return { ...person, loginEmail: remoteLogin };
  });

  return { staff: next, changed };
}

/** Áp merge loginEmail lên toàn bộ departments của local store. */
export function mergeStoreStaffLoginEmails(localStore, remoteStore) {
  if (!localStore?.departments || !remoteStore?.departments) {
    return { store: localStore, changed: false };
  }
  const remoteByDept = new Map(
    asArray(remoteStore.departments).map((dept) => [dept.id, dept]),
  );
  let changed = false;
  const departments = localStore.departments.map((dept) => {
    const remoteDept = remoteByDept.get(dept.id);
    if (!remoteDept) return dept;
    const merged = mergeStaffLoginEmails(dept.staff, remoteDept.staff);
    if (!merged.changed) return dept;
    changed = true;
    return { ...dept, staff: merged.staff };
  });
  if (!changed) return { store: localStore, changed: false };
  return { store: { ...localStore, departments }, changed: true };
}
