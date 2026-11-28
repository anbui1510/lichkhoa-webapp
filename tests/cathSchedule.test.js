import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CATH_ADD_SLOT_KEY,
  buildCathDisplayRows,
  cathMonthKeyForRole,
  cathRolesForWeekGrid,
  isCathOnlyRoleLabelOrKey,
  localCathRoles,
  monthRoleUsesCathRow,
  normalizePersistedCathRoles,
  resolveCathRoles,
  scrubCathTokensFromWeekGrid,
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

test('TC-F201-CATH-04: cathMonthKeyForRole khớp label khi key lệch', () => {
  assert.equal(
    cathMonthKeyForRole({ key: 'ttcc', label: 'TTCC chính' }, [{ key: 'ttcc_chinh', label: 'TTCC chính' }]),
    'ttcc_chinh',
  );
});

test('TC-F201-CATH-05: monthRoleUsesCathRow khi có hàng cath explicit', () => {
  assert.equal(
    monthRoleUsesCathRow(
      { key: 'tt_chinh', label: 'TT chính' },
      [{ key: 'tt_chinh', source: 'month', monthKey: 'tt_chinh', explicit: true }],
      [],
      [],
    ),
    true,
  );
  assert.equal(
    monthRoleUsesCathRow({ key: 'tt_phu', label: 'TT phụ' }, [], [], []),
    true,
    'tt_phu luôn pour xuống hàng task',
  );
  assert.equal(
    monthRoleUsesCathRow({ key: 'role_x', label: 'TT chính' }, [], [], []),
    true,
    'nhận diện theo label khi key lệch',
  );
  assert.equal(
    monthRoleUsesCathRow({ key: 'cot1', label: 'Cột 1 BV' }, [], [], []),
    false,
  );
  assert.equal(isCathOnlyRoleLabelOrKey('TT phụ'), true);
  assert.equal(isCathOnlyRoleLabelOrKey('TTCC phụ/Rask/PM'), true);
});

test('TC-F201-CATH-08: scrubCathTokensFromWeekGrid gỡ TT khỏi hàng BS khi display lower', () => {
  const staff = [{ shortName: 'THỊNH' }];
  const tasks = [
    { code: 'VG' },
    { code: 'H' },
    { id: 't1', code: 'TT chính', category: 'THU_THUAT', display: 'lower' },
    { id: 't2', code: 'TT phụ', category: 'THU_THUAT', display: 'lower' },
  ];
  const { grid, changed } = scrubCathTokensFromWeekGrid(
    {
      THỊNH: {
        2: { S: 'TT chính, TT phụ', C: 'VG, TT chính' },
        3: { S: 'H', C: '' },
      },
    },
    staff,
    tasks,
    [{ key: 'tt_chinh', label: 'TT chính', taskId: 't1' }, { key: 'tt_phu', label: 'TT phụ', taskId: 't2' }],
    [],
  );
  assert.equal(changed, true);
  assert.equal(grid.THỊNH[2].S, '');
  assert.equal(grid.THỊNH[2].C, 'VG');
  assert.equal(grid.THỊNH[3].S, 'H');
});

test('TC-F201-CATH-08b: scrub giữ TT khi display both', () => {
  const staff = [{ shortName: 'THỊNH' }];
  const tasks = [
    { code: 'VG' },
    { id: 't1', code: 'TT chính', category: 'THU_THUAT', display: 'both' },
  ];
  const { grid, changed } = scrubCathTokensFromWeekGrid(
    {
      THỊNH: {
        2: { S: 'TT chính', C: 'VG, TT chính' },
      },
    },
    staff,
    tasks,
    [{ key: 'tt_chinh', label: 'TT chính', taskId: 't1' }],
    [],
  );
  assert.equal(changed, false);
  assert.equal(grid.THỊNH[2].S, 'TT chính');
  assert.equal(grid.THỊNH[2].C, 'VG, TT chính');
});

test('TC-F201-CATH-06: buildCathDisplayRows đọc monthGrid theo monthKey đã khớp', () => {
  const rows = buildCathDisplayRows({
    roles: [{ key: 'r1', label: 'TTCC chính', source: 'month', monthKey: 'ttcc' }],
    days: [{ iso: '2026-11-27' }],
    sessions: ['S'],
    monthGrid: { '2026-11-27|ttcc_chinh|S': 'THỊNH' },
    cathGrid: {},
    monthRoles: [{ key: 'ttcc_chinh', label: 'TTCC chính' }],
  });
  assert.equal(rows[0][3], 'THỊNH');
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