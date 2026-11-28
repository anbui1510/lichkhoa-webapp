import test from 'node:test';
import assert from 'node:assert/strict';
import { reorderMonthRoles } from '../src/logic/monthSchedule.js';
import { mergeMonthLayoutOnPull } from '../src/logic/weekCursorMerge.js';

const metaStore = new Map();
globalThis.localStorage = {
  getItem: (k) => metaStore.get(k) ?? null,
  setItem: (k, v) => metaStore.set(k, String(v)),
  removeItem: (k) => metaStore.delete(k),
};

const baseStore = (sheet) => ({
  activeDeptId: 'dept1',
  sheetsByDept: {
    dept1: { activeSheetId: 'sh1', sheets: [sheet] },
  },
});

test('reorderMonthRoles moves item without dropping', () => {
  const roles = [
    { key: 'a', label: 'A' },
    { key: 'b', label: 'B' },
    { key: 'c', label: 'C' },
  ];
  const next = reorderMonthRoles(roles, 2, 0);
  assert.deepEqual(next.map((r) => r.key), ['c', 'a', 'b']);
});

test('mergeMonthLayoutOnPull keeps local monthRoles when layout fresh', async () => {
  metaStore.clear();
  const { CLOUD_META_KEY } = await import('../src/logic/monthLayoutFresh.js');
  metaStore.set(CLOUD_META_KEY, JSON.stringify({ monthLayoutAt: Date.now() }));
  const local = baseStore({
    id: 'sh1',
    monthKey: '2026-11',
    monthRoles: [{ key: 'tc', label: 'TC', taskId: 't1' }],
    monthGrid: {},
  });
  const remote = baseStore({
    id: 'sh1',
    monthKey: '2026-11',
    monthRoles: [],
    monthGrid: {},
  });
  const next = mergeMonthLayoutOnPull(local, remote);
  const merged = next.sheetsByDept.dept1.sheets[0];
  assert.equal(merged.monthRoles.length, 1);
  assert.equal(merged.monthRoles[0].key, 'tc');
});

test('TC-F304-37: mergeMonthLayoutOnPull giữ cathRoles/cathGrid vừa thêm (hàng task tuần)', async () => {
  metaStore.clear();
  const { CLOUD_META_KEY } = await import('../src/logic/monthLayoutFresh.js');
  metaStore.set(CLOUD_META_KEY, JSON.stringify({ monthLayoutAt: Date.now() }));
  const local = baseStore({
    id: 'sh1',
    cathRoles: [{ key: 'role_tt', label: 'TT', taskId: 't_tt', source: 'month', explicit: true }],
    cathGrid: { '2026-12-01|role_tt|S': 'AN' },
  });
  const remote = baseStore({
    id: 'sh1',
    cathRoles: [],
    cathGrid: {},
  });
  const next = mergeMonthLayoutOnPull(local, remote);
  const merged = next.sheetsByDept.dept1.sheets[0];
  assert.equal(merged.cathRoles.length, 1);
  assert.equal(merged.cathRoles[0].key, 'role_tt');
  assert.equal(merged.cathGrid['2026-12-01|role_tt|S'], 'AN');
});