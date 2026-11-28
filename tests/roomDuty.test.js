import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  migrateRoomTableToPrimaryDeputy,
  roomDutiesOf,
  missingPrimaryWarnings,
  isPrimaryDeputyRoomTable,
  isDoctorAssignmentLabel,
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
  it('TC-F211-01 migrates legacy doctor columns to chính/phụ', () => {
    const legacy = {
      labels: ['BS Phụ trách', 'Tên bệnh phòng'],
      matrix: [
        ['An', 'Bình'],
        ['P1', 'P1']
      ],
      colWidths: [120, 120],
      rowHeights: [32, 32]
    };
    const next = migrateRoomTableToPrimaryDeputy(legacy);
    assert.equal(isPrimaryDeputyRoomTable(next), true);
    const duties = roomDutiesOf(next);
    assert.equal(duties.length, 1);
    assert.equal(duties[0].room, 'P1');
    assert.equal(duties[0].primary, 'An');
    assert.deepEqual(duties[0].deputies, ['Bình']);
  });

  it('TC-F211-02 missing primary warning', () => {
    const table = {
      labels: ['Tên bệnh phòng', 'BS chính', 'BS phụ 1'],
      matrix: [['P2', ''], ['', ''], ['Lan', '']]
    };
    const warnings = missingPrimaryWarnings(table);
    assert.ok(warnings.some(line => line.includes('P2') && line.includes('BS chính')));
  });

  it('TC-F211-03 duty order is primary then deputies (placeWards contract)', () => {
    const table = {
      labels: ['Tên bệnh phòng', 'BS chính', 'BS phụ 1', 'BS phụ 2'],
      matrix: [['P1'], ['An'], ['Bình'], ['Chi']]
    };
    const [duty] = roomDutiesOf(table);
    assert.equal(duty.primary, 'An');
    assert.deepEqual(duty.deputies, ['Bình', 'Chi']);
  });

  it('TC-F211-04 giữ nhãn BS hỗ trợ + ô đã điền (không reset về BS phụ 1)', () => {
    const table = {
      labels: ['Tên bệnh phòng', 'BS chính', 'BS hỗ trợ'],
      matrix: [['b6'], ['THỊNH'], ['P2']],
      colWidths: [120],
      rowHeights: [32, 32, 32],
    };
    const next = migrateRoomTableToPrimaryDeputy(table);
    assert.equal(next.labels[2], 'BS hỗ trợ');
    assert.equal(next.matrix[2][0], 'P2');
    const [duty] = roomDutiesOf(next);
    assert.deepEqual(duty.deputies, ['P2']);
  });

  it('TC-F211-09 isDoctorAssignmentLabel nhận hàng BS, bỏ Tên bệnh phòng', () => {
    assert.equal(isDoctorAssignmentLabel('BS chính'), true);
    assert.equal(isDoctorAssignmentLabel('BS phụ 1'), true);
    assert.equal(isDoctorAssignmentLabel('BS hỗ trợ'), true);
    assert.equal(isDoctorAssignmentLabel('BS Phụ trách'), true);
    assert.equal(isDoctorAssignmentLabel('Tên bệnh phòng'), false);
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
