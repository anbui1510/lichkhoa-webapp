import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  migrateToDoctorFirstRoomTable,
  roomDutiesOf,
  missingPrimaryWarnings,
  isPrimaryDeputyRoomTable,
  isDoctorFirstRoomTable,
  isDoctorAssignmentLabel,
  applyWeekStaffToDoctorRow,
  DEFAULT_ROOM_LABELS,
} from '../src/logic/roomDuty.js';
import {
  shouldMaskWeekForViewer,
  withWeekPublishStatus,
  weekPublishStatusOf,
  WEEK_STATUS_DRAFT,
  WEEK_STATUS_PUBLISHED
} from '../src/logic/weekPublish.js';
import { filterFalseScheduleWarnings } from '../src/logic/falseWarnings.js';

describe('F-211 roomDuty', () => {
  it('TC-F211-01 migrates legacy doctor columns to doctor-first', () => {
    const legacy = {
      labels: ['BS Phụ trách', 'Tên bệnh phòng'],
      matrix: [
        ['An', 'Bình'],
        ['P1', 'P2']
      ],
      colWidths: [120, 120],
      rowHeights: [32, 32]
    };
    const next = migrateToDoctorFirstRoomTable(legacy);
    assert.equal(isDoctorFirstRoomTable(next), true);
    assert.deepEqual(next.labels, DEFAULT_ROOM_LABELS);
    assert.deepEqual(next.matrix[0], ['An', 'Bình']);
    assert.deepEqual(next.matrix[1], ['P1', 'P2']);
    const duties = roomDutiesOf(next);
    assert.equal(duties.length, 2);
    assert.equal(duties[0].primary, 'An');
    assert.equal(duties[0].room, 'P1');
  });

  it('TC-F211-02 missing primary warning', () => {
    const table = {
      labels: ['BS', '', ''],
      matrix: [['', ''], ['P2', ''], ['', '']]
    };
    const warnings = missingPrimaryWarnings(table);
    assert.ok(warnings.some(line => line.includes('P2') && line.includes('BS chính')));
  });

  it('TC-F211-03 doctor-first: một BS hai phòng', () => {
    const table = {
      labels: ['BS', '', ''],
      matrix: [['An'], ['P1'], ['P2']]
    };
    const duties = roomDutiesOf(table);
    assert.equal(duties.length, 2);
    assert.equal(duties[0].primary, 'An');
    assert.equal(duties[0].room, 'P1');
    assert.equal(duties[1].room, 'P2');
  });

  it('TC-F211-04 migrate chính/phụ → doctor-first (bỏ Tên bệnh phòng)', () => {
    const table = {
      labels: ['Tên bệnh phòng', 'BS chính', 'BS hỗ trợ'],
      matrix: [['b6', ''], ['THỊNH', 'AN'], ['', '']],
      colWidths: [120, 120],
      rowHeights: [32, 32, 32],
    };
    assert.equal(isPrimaryDeputyRoomTable(table), true);
    const next = migrateToDoctorFirstRoomTable(table);
    assert.deepEqual(next.labels, ['BS', '', '']);
    assert.deepEqual(next.matrix[0], ['THỊNH', 'AN']);
    assert.deepEqual(next.matrix[1], ['b6', '']);
    assert.equal(isDoctorFirstRoomTable(next), true);
  });

  it('TC-F211-09 isDoctorAssignmentLabel nhận hàng BS', () => {
    assert.equal(isDoctorAssignmentLabel('BS'), true);
    assert.equal(isDoctorAssignmentLabel('BS chính'), true);
    assert.equal(isDoctorAssignmentLabel('BS Phụ trách'), true);
    assert.equal(isDoctorAssignmentLabel('Tên bệnh phòng'), false);
    assert.equal(isDoctorAssignmentLabel(''), false);
  });

  it('TC-F211-10 applyWeekStaffToDoctorRow đổ shortName lên hàng đầu', () => {
    const empty = {
      labels: ['Tên bệnh phòng', 'BS chính', 'BS hỗ trợ'],
      matrix: [['', '', ''], ['', '', ''], ['', '', '']],
      colWidths: [120, 120, 120],
      rowHeights: [32, 32, 32],
    };
    const next = applyWeekStaffToDoctorRow(empty, [
      { shortName: 'DUY' },
      { shortName: 'AN' },
      { shortName: 'HƯNG' },
    ]);
    assert.deepEqual(next.labels, ['BS', '', '']);
    assert.deepEqual(next.matrix[0], ['DUY', 'AN', 'HƯNG']);
    assert.deepEqual(next.matrix[1], ['', '', '']);
  });

  it('TC-F211-10b giữ tên phòng khi khớp BS', () => {
    const table = {
      labels: ['BS', '', ''],
      matrix: [['AN', 'DUY'], ['P1', ''], ['', '']],
      colWidths: [120, 120],
      rowHeights: [32, 32, 32],
    };
    const next = applyWeekStaffToDoctorRow(table, [
      { shortName: 'DUY' },
      { shortName: 'AN' },
      { shortName: 'HƯNG' },
    ]);
    assert.deepEqual(next.matrix[0], ['DUY', 'AN', 'HƯNG']);
    assert.equal(next.matrix[1][1], 'P1');
  });
});

describe('F-212 weekPublish', () => {
  it('TC-F212-01 legacy sheet defaults published', () => {
    assert.equal(weekPublishStatusOf({ startDate: '2026-09-14' }), WEEK_STATUS_PUBLISHED);
  });

  it('TC-F212-02 User masked on draft; Mod sees draft', () => {
    const draft = { startDate: '2026-09-14', publishStatus: WEEK_STATUS_DRAFT };
    assert.equal(shouldMaskWeekForViewer(draft, { role: 'User' }, { kind: 'member' }), true);
    assert.equal(shouldMaskWeekForViewer(draft, { role: 'Mod' }, { kind: 'admin' }), false);
  });

  it('TC-F212-03 publish / unpublish + audit', () => {
    let sheet = { startDate: '2026-09-14', publishStatus: WEEK_STATUS_DRAFT, weeks: {} };
    sheet = withWeekPublishStatus(sheet, WEEK_STATUS_PUBLISHED, { by: 'mod@x', action: 'publish' });
    assert.equal(sheet.publishStatus, WEEK_STATUS_PUBLISHED);
    assert.equal(sheet.weeks['2026-09-14'].publishStatus, WEEK_STATUS_PUBLISHED);
    assert.equal(sheet.auditLog.at(-1).action, 'publish');
    sheet = withWeekPublishStatus(sheet, WEEK_STATUS_DRAFT, { by: 'mod@x', action: 'unpublish' });
    assert.equal(sheet.publishStatus, WEEK_STATUS_DRAFT);
    assert.equal(sheet.auditLog.at(-1).action, 'unpublish');
  });
});

describe('F-211 false warnings', () => {
  it('TC-F211-04 drops no-owner warning when task already on grid', () => {
    const warnings = ['Task PK có ngày cố định nhưng chưa chọn Trách nhiệm.'];
    const filtered = filterFalseScheduleWarnings(warnings, {
      staffList: [{ shortName: 'An' }],
      grid: { An: { 0: { S: 'PK', C: '' } } },
      taskList: []
    });
    assert.equal(filtered.length, 0);
  });
});
