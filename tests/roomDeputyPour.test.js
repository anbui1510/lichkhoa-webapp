import test from 'node:test';
import assert from 'node:assert/strict';
import { roomDutiesOf } from '../src/logic/roomDuty.js';
import { monthRoleUsesCathRow } from '../src/logic/cathSchedule.js';
import { generateWeeklySchedule } from '../src/logic/schedulerEngine.js';

test('TC-F211-12: Chính = primary, Hỗ trợ = deputies theo từng phòng', () => {
  const table = {
    labels: ['BS', 'Chính', 'Hỗ trợ'],
    matrix: [
      ['THỊNH', 'TRANG'],
      ['b6', 'cc'],
      ['cc', ''],
    ],
  };
  const duties = roomDutiesOf(table);
  const b6 = duties.find((d) => d.room === 'b6');
  const cc = duties.find((d) => d.room === 'cc');
  assert.equal(b6.primary, 'THỊNH');
  assert.deepEqual(b6.deputies, []);
  assert.equal(cc.primary, 'TRANG');
  assert.deepEqual(cc.deputies, ['THỊNH']);
});

test('TC-F211-13: Trang bị khóa BP → Thịnh nhận cc (hỗ trợ)', () => {
  const staffList = [
    { id: 'd1', shortName: 'TRANG' },
    { id: 'd2', shortName: 'THỊNH' },
  ];
  const taskList = [
    {
      id: 'pktc',
      code: 'PKTC',
      name: 'Phòng khám',
      category: 'KHAC',
      blocker: true,
      locks: ['bp'],
      fixedDays: [0],
      fixedSlots: [{ day: 0, session: 'S' }],
      owners: ['d1'],
      warn: true,
    },
    {
      id: 'bp',
      code: 'BP',
      name: 'Bệnh phòng',
      category: 'KHAC',
      locks: [],
      fixedDays: [0, 1, 2, 3, 4],
      fixedSlots: [
        { day: 0, session: 'S' },
        { day: 0, session: 'C' },
      ],
      warn: true,
    },
  ];
  const roomTable = {
    labels: ['BS', 'Chính', 'Hỗ trợ'],
    matrix: [
      ['THỊNH', 'TRANG'],
      ['b6', 'cc'],
      ['cc', ''],
    ],
  };
  const { grid, roomWarnings } = generateWeeklySchedule({
    startDate: '2026-11-30',
    staffList,
    taskList,
    roomTable,
    monthRoles: [],
    monthGrid: {},
  });
  const trangS = String(grid.TRANG?.[0]?.S || '');
  const thinhS = String(grid.THỊNH?.[0]?.S || '');
  assert.match(trangS, /PKTC/i);
  assert.match(thinhS, /\bcc\b/i);
  assert.doesNotMatch(trangS, /\bcc\b/i);
  assert.ok(!(roomWarnings || []).some((w) => /\bcc\b/i.test(w) && /không xếp/i.test(w)));
});

test('TC-F201-CATH-09: TT chính display both → đổ lên hàng BS', () => {
  const role = { key: 'tt_chinh', label: 'TT chính', taskId: 't_tt' };
  const tasks = [{ id: 't_tt', code: 'TT chính', category: 'THU_THUAT', scope: 'month', display: 'both' }];
  assert.equal(monthRoleUsesCathRow(role, [], [role], tasks), false);
});

test('TC-F201-CATH-10: TT chính display lower → không đổ hàng BS', () => {
  const role = { key: 'tt_chinh', label: 'TT chính', taskId: 't_tt' };
  const tasks = [{ id: 't_tt', code: 'TT chính', category: 'THU_THUAT', scope: 'month', display: 'lower' }];
  assert.equal(monthRoleUsesCathRow(role, [], [role], tasks), true);
});
