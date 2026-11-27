import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyTenantStore } from '../src/store/sheetBootstrapStore.js';
import { exportStoreToTabsForPush, storeReadyForSheetPush } from '../src/logic/sheetStore/pushSafety.js';
import { SHEET_TABS } from '../src/logic/sheetStore/constants.js';

describe('F-304 sheet push safety', () => {
  it('TC-F304-13: empty local store must not include NhanSu tab on push', () => {
    const store = createEmptyTenantStore({ slug: 'timmach', label: 'Tim mạch' });
    assert.equal(storeReadyForSheetPush(store), false);
    const tabs = exportStoreToTabsForPush(store);
    assert.equal(tabs[SHEET_TABS.NHAN_SU], undefined);
    assert.ok(tabs[SHEET_TABS.TASK]);
  });

  it('TC-F304-13b: store with staff includes NhanSu on push', () => {
    const store = createEmptyTenantStore({ slug: 'timmach', label: 'Tim mạch' });
    store.departments[0].staff.push({
      id: 'x1',
      name: 'Test',
      shortName: 'T',
      title: 'BS',
      dutyQuota: 0,
      buBalance: 0,
      phepBalance: 0,
      email: 't@hospital.vn',
    });
    assert.equal(storeReadyForSheetPush(store), true);
    const tabs = exportStoreToTabsForPush(store);
    assert.ok(tabs[SHEET_TABS.NHAN_SU]?.length > 1);
  });
});