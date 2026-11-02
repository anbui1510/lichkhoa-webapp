import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSpreadsheetId } from '../src/logic/sheetStore/parseSpreadsheetId.js';
import { exportNhanSuRows, importNhanSuRows } from '../src/logic/sheetStore/nhanSu.js';
import { exportTaskRows, importTaskRows } from '../src/logic/sheetStore/task.js';
import { exportWeekRows, importWeekRows } from '../src/logic/sheetStore/week.js';
import { exportStoreToTabs, importTabsToStore } from '../src/logic/sheetStore/bundle.js';

// docs/specs/features/F-304-google-sheets-backend/spec.md

test('TC-F304-01: parseSpreadsheetId from URL', () => {
  const id = parseSpreadsheetId('https://docs.google.com/spreadsheets/d/abc123XYZ/edit');
  assert.equal(id, 'abc123XYZ');
});

test('TC-F304-02: NhanSu round-trip', () => {
  const staff = [{
    id: 'doc_1',
    name: 'Test',
    shortName: 'T',
    title: 'BS',
    dutyQuota: 6,
    buBalance: 1,
    phepBalance: 2,
    email: 'a@b.co',
    loginEmail: 'a@b.co',
    position: 'BS',
    accessRole: 'member',
    access: { week: 'edit', month: 'view', leave: 'edit', study: 'view', calendar: 'view', dashboard: 'none', staff: 'none', tasks: 'none' },
  }];
  const rows = exportNhanSuRows(staff);
  const back = importNhanSuRows(rows);
  assert.equal(back.length, 1);
  assert.equal(back[0].id, 'doc_1');
  assert.equal(back[0].access.week, 'edit');
  assert.equal(back[0].loginEmail, 'a@b.co');
});

test('TC-F304-03: Task round-trip', () => {
  const tasks = [{
    id: 'task_1',
    code: 'TN',
    name: 'Trực ngày',
    category: 'THUONG_TRUC',
    session: 'SANG',
    scope: 'week',
    description: '',
    blocker: true,
    delta: 0,
    owners: [],
    ownerOrder: ['doc_1'],
    fixedDays: [],
    fixedSlots: [],
    locks: [],
  }];
  const rows = exportTaskRows(tasks);
  const back = importTaskRows(rows);
  assert.equal(back[0].code, 'TN');
  assert.equal(back[0].blocker, true);
});

test('TC-F304-04: week_cell round-trip', () => {
  const deptSheets = {
    activeSheetId: 'sh1',
    sheets: [{
      id: 'sh1',
      name: 'Sheet 1',
      startDate: '2026-09-14',
      grid: {
        doc_1: [
          { S: 'TN', R: '', C: '', T: '' },
          { S: '', R: '', C: '', T: '' },
          { S: '', R: '', C: '', T: '' },
          { S: '', R: '', C: '', T: '' },
          { S: '', R: '', C: '', T: '' },
          { S: '', R: '', C: '', T: '' },
          { S: '', R: '', C: '', T: '' },
        ],
      },
      weeks: {},
    }],
  };
  const rows = exportWeekRows(deptSheets);
  const imported = importWeekRows(rows);
  assert.equal(imported.sheets[0].grid.doc_1[0].S, 'TN');
});

test('TC-F304-05: bundle export/import meta + staff', () => {
  const store = {
    activeDeptId: 'dept_a',
    departments: [{
      id: 'dept_a',
      name: 'Tim',
      code: 'TIM',
      staff: [{ id: 's1', name: 'A', shortName: 'A', title: 'BS', dutyQuota: 1, buBalance: 0, phepBalance: 0, email: 'x@y.z' }],
      tasks: [],
      leaveEntries: [],
      studyEntries: [],
    }],
    sheetsByDept: {
      dept_a: { activeSheetId: 'sh1', sheets: [{ id: 'sh1', name: 'S1', startDate: '2026-09-14', grid: {}, weeks: {} }] },
    },
  };
  const tabs = exportStoreToTabs(store);
  assert.ok(tabs.NhanSu?.length > 1);
  const next = importTabsToStore(tabs, store);
  assert.equal(next.departments[0].name, 'Tim');
  assert.equal(next.departments[0].staff[0].id, 's1');
});
