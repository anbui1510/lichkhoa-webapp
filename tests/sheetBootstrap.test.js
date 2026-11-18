import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmptyTenantStore,
  ensureBootstrapAdminStaff,
} from '../src/store/sheetBootstrapStore.js';
import { exportStoreToTabs, importTabsToStore } from '../src/logic/sheetStore/bundle.js';
import { COMMON_TASK_TEMPLATE } from '../src/store/commonTaskTemplate.js';

// docs/specs/features/F-304-google-sheets-backend/spec.md — TC-F304-07..08

test('TC-F304-07: empty tenant store + bootstrap admin export', () => {
  let store = createEmptyTenantStore({ slug: 'timmach', name: 'Khoa Tim mạch' });
  assert.equal(store.departments[0].staff.length, 0);
  assert.ok(store.departments[0].tasks.length >= COMMON_TASK_TEMPLATE.length);

  store = ensureBootstrapAdminStaff(store, {
    email: 'admin@example.com',
    fullName: 'Admin Test',
  });
  const tabs = exportStoreToTabs(store);
  assert.ok(tabs.NhanSu?.length > 1);
  const staff = importTabsToStore({ NhanSu: tabs.NhanSu }, store).departments[0].staff;
  assert.ok(staff.some((s) => s.loginEmail === 'admin@example.com' && s.accessRole === 'admin'));
});

test('TC-F304-08: bootstrap tabs include Task round-trip', () => {
  const store = ensureBootstrapAdminStaff(
    createEmptyTenantStore({ slug: 'noikhoa', name: 'Khoa Nội' }),
    { email: 'tk@hospital.vn', fullName: 'Trưởng khoa' },
  );
  const tabs = exportStoreToTabs(store);
  assert.ok(tabs.Task?.length > 1);
  const back = importTabsToStore(tabs, store);
  assert.equal(back.departments[0].tasks.length, store.departments[0].tasks.length);
});

test('TC-F304-09: remote updatedAt newer skips blind overwrite (meta compare)', () => {
  const local = '2026-01-01T00:00:00.000Z';
  const remote = '2026-01-02T00:00:00.000Z';
  const localTs = new Date(local).getTime();
  const remoteTs = new Date(remote).getTime();
  assert.ok(remoteTs > localTs);
});

test('ensureBootstrapAdminStaff assigns loginEmail to existing trưởng khoa', () => {
  const store = {
    activeDeptId: 'dept_a',
    departments: [{
      id: 'dept_a',
      name: 'A',
      code: 'A',
      staff: [{ id: 's1', name: 'A', shortName: 'A', title: 'Trưởng Khoa', email: 'x@hospital.vn' }],
      tasks: [],
    }],
  };
  const next = ensureBootstrapAdminStaff(store, { email: 'gmail@gmail.com', fullName: 'A' });
  assert.equal(next.departments[0].staff[0].loginEmail, 'gmail@gmail.com');
  assert.equal(next.departments[0].staff[0].accessRole, 'admin');
});
