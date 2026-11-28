import test from 'node:test';
import assert from 'node:assert/strict';
import { resetActiveSheetView } from '../src/logic/viewSessionCursors.js';
import { currentMonthKey } from '../src/logic/monthSchedule.js';

const store = {
  activeDeptId: 'dept1',
  sheetsByDept: {
    dept1: {
      activeSheetId: 'sh1',
      sheets: [{
        id: 'sh1',
        startDate: '2020-01-01',
        monthKey: '2020-01',
        leaveMonthKey: '2020-02',
        studyMonthKey: '2020-03',
      }],
    },
  },
};

test('resetActiveSheetView clears month cursors and sets current week', () => {
  const next = resetActiveSheetView(store);
  const sh = next.sheetsByDept.dept1.sheets[0];
  assert.equal(sh.monthKey, undefined);
  assert.equal(sh.leaveMonthKey, undefined);
  assert.equal(sh.studyMonthKey, undefined);
  assert.match(sh.startDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(sh.startDate <= `${currentMonthKey()}-31`);
});