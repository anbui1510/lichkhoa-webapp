import test from 'node:test';
import assert from 'node:assert/strict';
import { LEAVE_HEADERS } from '../src/logic/sheetStore/constants.js';
import { exportLeaveRows, importLeaveRows } from '../src/logic/sheetStore/entries.js';

const staff = [{ id: 'doc_1', shortName: 'LOI', name: 'A' }];

test('TC-F304-21: leave export/import keeps shortName và from/to', () => {
  const entry = {
    id: 'leave_1',
    shortName: 'LOI',
    from: '2026-11-05',
    to: '2026-11-05',
    type: 'P',
    sessions: ['S'],
    session: 'S',
    note: 'nghỉ',
    createdAt: 1,
  };
  const rows = exportLeaveRows([entry], staff);
  const back = importLeaveRows(rows, staff);
  assert.equal(back.length, 1);
  assert.equal(back[0].shortName, 'LOI');
  assert.equal(back[0].from, '2026-11-05');
  assert.deepEqual(back[0].sessions, ['S']);
});

test('mergeDeptEntriesOnPull keeps local leave khi vừa sửa', async () => {
  const metaStore = new Map();
  globalThis.localStorage = {
    getItem: (k) => metaStore.get(k) ?? null,
    setItem: (k, v) => metaStore.set(k, String(v)),
    removeItem: (k) => metaStore.delete(k),
  };
  const { CLOUD_META_KEY } = await import('../src/logic/deptEntriesFresh.js');
  const { mergeDeptEntriesOnPull } = await import('../src/logic/weekCursorMerge.js');
  metaStore.set(CLOUD_META_KEY, JSON.stringify({ deptEntriesAt: Date.now() }));
  const leave = [{ id: 'leave_x', shortName: 'LOI', from: '2026-11-05', to: '2026-11-05', sessions: ['S'] }];
  const local = { activeDeptId: 'dept1', departments: [{ id: 'dept1', leaveEntries: leave, studyEntries: [] }] };
  const remote = { activeDeptId: 'dept1', departments: [{ id: 'dept1', leaveEntries: [], studyEntries: [] }] };
  const next = mergeDeptEntriesOnPull(local, remote);
  assert.equal(next.departments[0].leaveEntries.length, 1);
});

test('TC-F304-22: legacy LichNghi row (chỉ fromDate) vẫn hiện trên lịch', () => {
  const rows = [
    LEAVE_HEADERS,
    ['leave_2', 'doc_1', 'LOI', '2026-11-10', '2026-11-12', '', 'P', '{"sessions":["S","C"]}'],
  ];
  const back = importLeaveRows(rows, staff);
  assert.equal(back[0].shortName, 'LOI');
  assert.equal(back[0].from, '2026-11-10');
  assert.deepEqual(back[0].sessions, ['S', 'C']);
});