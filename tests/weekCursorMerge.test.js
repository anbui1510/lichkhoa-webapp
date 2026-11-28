import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mergeWeekViewCursor } from '../src/logic/weekCursorMerge.js';

const baseStore = (sheet) => ({
  activeDeptId: 'dept1',
  sheetsByDept: {
    dept1: {
      activeSheetId: 'sh1',
      sheets: [sheet],
    },
  },
});

describe('mergeWeekViewCursor', () => {
  it('keeps local monthKey on remote pull', () => {
    const localSheet = {
      id: 'sh1',
      startDate: '2026-11-24',
      monthKey: '2026-11',
      grid: { A: { day0: { S: 'x' } } },
    };
    const remoteSheet = {
      id: 'sh1',
      startDate: '2026-10-26',
      monthKey: '2026-10',
      grid: {},
    };
    const local = baseStore(localSheet);
    const remote = baseStore(remoteSheet);
    const next = mergeWeekViewCursor(local, remote);
    const merged = next.sheetsByDept.dept1.sheets[0];
    assert.equal(merged.monthKey, '2026-11');
    assert.equal(merged.startDate, '2026-11-24');
  });

  it('keeps leave and study month keys', () => {
    const localSheet = {
      id: 'sh1',
      startDate: '2026-10-26',
      monthKey: '2026-10',
      leaveMonthKey: '2026-12',
      studyMonthKey: '2027-01',
    };
    const remoteSheet = {
      id: 'sh1',
      startDate: '2026-10-26',
      monthKey: '2026-10',
    };
    const next = mergeWeekViewCursor(
      baseStore(localSheet),
      baseStore(remoteSheet),
    );
    const merged = next.sheetsByDept.dept1.sheets[0];
    assert.equal(merged.leaveMonthKey, '2026-12');
    assert.equal(merged.studyMonthKey, '2027-01');
  });

  it('drops remote monthKey when local has no monthKey (hiện tại)', () => {
    const localSheet = {
      id: 'sh1',
      startDate: '2026-11-24',
    };
    const remoteSheet = {
      id: 'sh1',
      startDate: '2026-10-26',
      monthKey: '2026-10',
    };
    const next = mergeWeekViewCursor(
      baseStore(localSheet),
      baseStore(remoteSheet),
    );
    const merged = next.sheetsByDept.dept1.sheets[0];
    assert.equal(merged.monthKey, undefined);
    assert.equal(merged.startDate, '2026-11-24');
  });

  it('TC-F304-34: remote thiếu roomTable → giữ labels local (BS hỗ trợ)', () => {
    const localSheet = {
      id: 'sh1',
      startDate: '2026-11-23',
      roomTable: {
        labels: ['Tên bệnh phòng', 'BS chính', 'BS hỗ trợ'],
        matrix: [['P1'], ['A'], ['B']],
      },
    };
    const remoteSheet = {
      id: 'sh1',
      startDate: '2026-11-23',
      grid: {},
    };
    const next = mergeWeekViewCursor(baseStore(localSheet), baseStore(remoteSheet));
    const merged = next.sheetsByDept.dept1.sheets[0];
    assert.deepEqual(merged.roomTable.labels, ['Tên bệnh phòng', 'BS chính', 'BS hỗ trợ']);
  });
});
