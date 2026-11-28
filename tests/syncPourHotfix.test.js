import test from 'node:test';
import assert from 'node:assert/strict';
import { weekCodeForMonthRole } from '../src/logic/taskMatch.js';
import { exportLeaveRows, importLeaveRows } from '../src/logic/sheetStore/entries.js';
import { exportWeekRows, importWeekRows } from '../src/logic/sheetStore/week.js';
import { mergeTasksOnPull } from '../src/logic/tasksPullMerge.js';
import { mergeLeavePreferIdentity } from '../src/logic/leavePullMerge.js';

test('TC-F201-06b: C1 encodeDuty + dutyRole vao_gac không cướp VG', () => {
  const taskList = [
    { id: 'c1', code: 'C1', dutyRole: 'vao_gac', encodeDuty: true, category: 'THUONG_TRUC' },
    { id: 'vg', code: 'VG', dutyRole: '', encodeDuty: false, category: 'THUONG_TRUC' },
    { id: 'tc', code: 'TC', name: 'Trực chính', scope: 'month', encodeDuty: true, category: 'THUONG_TRUC' },
  ];
  const role = { key: 'truc_chinh', label: 'TC' };
  assert.equal(weekCodeForMonthRole(role, 'C', taskList), 'VG');
  assert.notEqual(weekCodeForMonthRole(role, 'C', taskList), 'C1');
});

test('TC-F304-38: exportLeaveRows backfill shortName từ staffId', () => {
  const staff = [{ id: 'doc_1', shortName: 'HUY' }];
  const rows = exportLeaveRows(
    [{ id: 'leave_1', staffId: 'doc_1', shortName: '', from: '2026-12-01', to: '2026-12-01', type: 'P' }],
    staff,
  );
  const objs = importLeaveRows(rows, staff);
  assert.equal(objs[0].shortName, 'HUY');
  assert.equal(objs[0].staffId, 'doc_1');
});

test('TC-F304-39: cath_meta round-trip trên LichTuan', () => {
  const deptSheets = {
    activeSheetId: 'sh1',
    sheets: [{
      id: 'sh1',
      name: 'S1',
      startDate: '2026-11-30',
      grid: {},
      cathRoles: [{ key: 'tt', label: 'TT chính', taskId: 't1', source: 'month', explicit: true }],
      cathGrid: { '2026-12-01|tt|S': 'THỊNH' },
    }],
  };
  const rows = exportWeekRows(deptSheets);
  assert.ok(rows.some((row) => row[0] === 'cath_meta'));
  const imported = importWeekRows(rows);
  const sh = imported.sheets[0];
  assert.equal(sh.cathRoles.length, 1);
  assert.equal(sh.cathRoles[0].key, 'tt');
  assert.equal(sh.cathGrid['2026-12-01|tt|S'], 'THỊNH');
});

test('TC-F304-40: mergeTasksOnPull giữ tasks local khi tasksAt fresh', async () => {
  const metaStore = new Map();
  globalThis.localStorage = {
    getItem: (k) => metaStore.get(k) ?? null,
    setItem: (k, v) => metaStore.set(k, String(v)),
    removeItem: (k) => metaStore.delete(k),
  };
  const { CLOUD_META_KEY } = await import('../src/logic/pendingSheetEdits.js');
  metaStore.set(CLOUD_META_KEY, JSON.stringify({ tasksAt: Date.now() }));
  const local = {
    departments: [{ id: 'd1', tasks: [{ id: 't1', code: 'VG', encodeDuty: false }] }],
  };
  const remote = {
    departments: [{ id: 'd1', tasks: [{ id: 't1', code: 'VG', encodeDuty: true }] }],
  };
  const next = mergeTasksOnPull(local, remote);
  assert.equal(next.departments[0].tasks[0].encodeDuty, false);
});

test('TC-F304-41: mergeLeavePreferIdentity giữ shortName local khi Sheet trống tên', () => {
  const remote = [{ id: 'leave_1', staffId: '', shortName: '', from: '2026-11-10', to: '2026-11-10', type: 'P' }];
  const local = [{ id: 'leave_1', staffId: 'doc_1', shortName: 'HUY', from: '2026-11-10', to: '2026-11-10', type: 'P' }];
  const next = mergeLeavePreferIdentity(remote, local);
  assert.equal(next[0].shortName, 'HUY');
  assert.equal(next[0].staffId, 'doc_1');
});
