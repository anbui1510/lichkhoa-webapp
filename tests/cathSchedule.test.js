import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CATH_ADD_SLOT_KEY,
  cathRolesForWeekGrid,
  localCathRoles,
  normalizePersistedCathRoles,
  resolveCathRoles,
} from '../src/logic/cathSchedule.js';

test('TC-F201-CATH-01: không còn ép Rash/PM mặc định', () => {
  assert.deepEqual(resolveCathRoles([], []), []);
  const slot = cathRolesForWeekGrid([], []);
  assert.equal(slot.length, 1);
  assert.equal(slot[0].key, CATH_ADD_SLOT_KEY);
});

test('TC-F201-CATH-01b: luôn có hàng + cuối', () => {
  const rows = cathRolesForWeekGrid(
    [{ key: 'tc', label: 'TC', source: 'month', monthKey: 'tc', explicit: true }],
    []
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[1].key, CATH_ADD_SLOT_KEY);
});

test('TC-F201-CATH-02: localCathRoles chỉ giữ explicit', () => {
  assert.equal(localCathRoles([{ key: 'rash_pm', label: 'Rash/PM' }]).length, 0);
  assert.equal(localCathRoles([{ key: 'tt_chinh', label: 'TT chính', source: 'month', explicit: true }]).length, 1);
  assert.equal(localCathRoles([{ key: 'tt_chinh', label: 'TT chính', source: 'month' }]).length, 0);
  assert.equal(localCathRoles([{ key: 'tt_chinh', label: 'TT chính', source: 'local' }]).length, 0);
});

test('TC-F201-CATH-02b: normalizePersistedCathRoles dọn cathGrid', () => {
  const { cathRoles, cathGrid } = normalizePersistedCathRoles(
  [{ key: 'tt_phu', label: 'TT phụ', source: 'month' }],
  { '2026-11-24|tt_phu|S': 'AN', '2026-11-24|tc|S': 'X' }
  );
  assert.equal(cathRoles.length, 0);
  assert.equal(Object.keys(cathGrid).length, 0);
});

test('TC-F201-CATH-03: thêm dòng month đọc label từ monthRoles', () => {
  const roles = resolveCathRoles(
    [{ key: 'tc', label: 'TC', source: 'month', monthKey: 'tc', explicit: true }],
    [{ key: 'tc', label: 'Trực chính', taskId: 't1' }]
  );
  assert.equal(roles.length, 1);
  assert.equal(roles[0].source, 'month');
  assert.equal(roles[0].label, 'TC');
  assert.equal(roles[0].taskId, 't1');
});