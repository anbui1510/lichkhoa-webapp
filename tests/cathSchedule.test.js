import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CATH_ADD_SLOT_KEY,
  cathRolesForWeekGrid,
  localCathRoles,
  resolveCathRoles,
} from '../src/logic/cathSchedule.js';

test('TC-F201-CATH-01: không còn ép Rash/PM mặc định', () => {
  assert.deepEqual(resolveCathRoles([], []), []);
  const slot = cathRolesForWeekGrid([], []);
  assert.equal(slot.length, 1);
  assert.equal(slot[0].key, CATH_ADD_SLOT_KEY);
});

test('TC-F201-CATH-02: localCathRoles bỏ rash_pm cũ', () => {
  const kept = localCathRoles([{ key: 'rash_pm', label: 'Rash/PM' }]);
  assert.equal(kept.length, 0);
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