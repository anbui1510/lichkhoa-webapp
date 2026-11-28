import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSessionAlertRow,
  isWeekAlertDisplayLine,
  noteTextWithoutAlertLines,
} from '../src/logic/warningResolve.js';

test('TC-F213-NOTE-01: isWeekAlertDisplayLine nhận dạng cảnh báo tự động', () => {
  assert.equal(isWeekAlertDisplayLine('Thiếu VG'), true);
  assert.equal(isWeekAlertDisplayLine('Gặp bệnh nhân nặng'), false);
});

test('TC-F213-NOTE-02: noteTextWithoutAlertLines giữ ghi chú tay', () => {
  const out = noteTextWithoutAlertLines('Họp khoa\nThiếu RT\nNghỉ chiều');
  assert.equal(out, 'Họp khoa\nNghỉ chiều');
});

test('TC-F213-NOTE-03: buildSessionAlertRow không ghi vào cột Ghi chú', () => {
  const days = [
    { dayName: 'T3', dateStr: '24/11', iso: '2026-11-24' },
    { dayName: 'T4', dateStr: '25/11', iso: '2026-11-25' },
    { dayName: 'T5', dateStr: '26/11', iso: '2026-11-26' },
    { dayName: 'T6', dateStr: '27/11', iso: '2026-11-27' },
    { dayName: 'T7', dateStr: '28/11', iso: '2026-11-28' },
    { dayName: 'CN', dateStr: '29/11', iso: '2026-11-29' },
    { dayName: 'T2', dateStr: '30/11', iso: '2026-11-30' },
  ];
  const sessions = ['S', 'C'];
  const noteCol = 3 + 7 * sessions.length;
  const weekWidth = noteCol + 1;
  const row = buildSessionAlertRow(
    ['Task TN có ngày cố định nhưng chưa chọn Trách nhiệm.'],
    { days, sessions, weekWidth, noteCol, grid: {}, staffList: [], taskList: [] }
  );
  assert.equal(row[noteCol], '');
});

test('TC-F213-NOTE-04: buildSessionAlertRow vẫn ghi vào ô buổi', () => {
  const days = [
    { dayName: 'T3', dateStr: '24/11', iso: '2026-11-24' },
    { dayName: 'T4', dateStr: '25/11', iso: '2026-11-25' },
    { dayName: 'T5', dateStr: '26/11', iso: '2026-11-26' },
    { dayName: 'T6', dateStr: '27/11', iso: '2026-11-27' },
    { dayName: 'T7', dateStr: '28/11', iso: '2026-11-28' },
    { dayName: 'CN', dateStr: '29/11', iso: '2026-11-29' },
    { dayName: 'T2', dateStr: '30/11', iso: '2026-11-30' },
  ];
  const sessions = ['S', 'C'];
  const noteCol = 3 + 7 * sessions.length;
  const weekWidth = noteCol + 1;
  const message = 'Không xếp được VG T3 24/11 Sáng: người phụ trách đang bị khóa hoặc đang nghỉ.';
  const row = buildSessionAlertRow(
    [message],
    { days, sessions, weekWidth, noteCol, grid: {}, staffList: [], taskList: [] }
  );
  const col = 3 + 0 * sessions.length;
  assert.match(row[col], /Thiếu VG/);
  assert.equal(row[noteCol], '');
});