import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSheetDateIso } from '../src/logic/sheetDate.js';
import { normalizeWeekStartIso } from '../src/logic/weekStartNormalize.js';
import { traineeOnWeek, traineeCovers } from '../src/logic/traineePeriod.js';

describe('sheetDate / weekStart / trainee period', () => {
  it('TC-F304-30: ISO UTC từ Sheet → YYYY-MM-DD Asia/Bangkok', () => {
    // 01/11/2026 00:00 Bangkok = 31/10 17:00Z
    assert.equal(normalizeSheetDateIso('2026-10-31T17:00:00.000Z'), '2026-11-01');
    assert.equal(normalizeSheetDateIso('2026-11-28T17:00:00.000Z'), '2026-11-29');
  });

  it('TC-F304-31: YYYY-MM-DD giữ nguyên', () => {
    assert.equal(normalizeSheetDateIso('2026-11-01'), '2026-11-01');
    assert.equal(normalizeSheetDateIso('2026-11-29'), '2026-11-29');
  });

  it('TC-F201-09: startDate ISO datetime không nhảy về tuần hiện tại', () => {
    // Thứ Hai 2026-11-30 00:00 Bangkok = 2026-11-29T17:00:00.000Z
    assert.equal(normalizeWeekStartIso('2026-11-29T17:00:00.000Z'), '2026-11-30');
    assert.equal(normalizeWeekStartIso('2026-11-23'), '2026-11-23');
  });

  it('TC-F217-05: studyTo ISO → ẩn tuần sau 29/11', () => {
    const person = {
      title: 'Hỗ trợ',
      position: 'Hỗ trợ',
      studyFrom: '2026-10-31T17:00:00.000Z',
      studyTo: '2026-11-28T17:00:00.000Z',
      showInWeek: true,
    };
    assert.equal(traineeCovers(person, '2026-11-29'), true);
    assert.equal(traineeCovers(person, '2026-11-30'), false);
    const weekAfter = ['2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04', '2026-12-05', '2026-12-06']
      .map((iso) => ({ iso }));
    assert.equal(traineeOnWeek(person, weekAfter), false);
    const weekIn = ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29']
      .map((iso) => ({ iso }));
    assert.equal(traineeOnWeek(person, weekIn), true);
  });

  it('TC-F217-06: showInWeek off → ẩn dù trong khoảng', () => {
    const person = {
      position: 'Hỗ trợ',
      studyFrom: '2026-11-01',
      studyTo: '2026-11-29',
      showInWeek: 'off',
    };
    const weekIn = ['2026-11-23', '2026-11-24'].map((iso) => ({ iso }));
    assert.equal(traineeOnWeek(person, weekIn), false);
  });
});
