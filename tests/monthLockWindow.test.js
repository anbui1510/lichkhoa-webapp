import test from 'node:test';
import assert from 'node:assert/strict';
import { isMonthWindowOpen } from '../src/logic/monthLockWindow.js';

test('TC-F215-01: không monthOpenAt/monthLockAt → mở', () => {
  assert.equal(isMonthWindowOpen(null), true);
  assert.equal(isMonthWindowOpen({}), true);
});

test('TC-F215-02: chỉ monthLockAt — trước hạn mở', () => {
  const now = new Date('2026-11-20T10:00:00+07:00');
  assert.equal(
    isMonthWindowOpen({ monthLockAt: '2026-11-25T17:00:00+07:00' }, now),
    true
  );
});

test('TC-F215-03: monthOpenAt và monthLockAt — trong cửa sổ', () => {
  const open = '2026-11-01T08:00:00+07:00';
  const lock = '2026-11-05T17:00:00+07:00';
  const now = new Date('2026-11-03T12:00:00+07:00');
  assert.equal(isMonthWindowOpen({ monthOpenAt: open, monthLockAt: lock }, now), true);
});

test('TC-F215-04: trước mở khóa → đóng', () => {
  const open = '2026-11-05T08:00:00+07:00';
  const lock = '2026-11-10T17:00:00+07:00';
  const now = new Date('2026-11-01T12:00:00+07:00');
  assert.equal(isMonthWindowOpen({ monthOpenAt: open, monthLockAt: lock }, now), false);
});

test('TC-F215-05: sau khóa → đóng', () => {
  const open = '2026-11-01T08:00:00+07:00';
  const lock = '2026-11-05T17:00:00+07:00';
  const now = new Date('2026-11-06T08:00:00+07:00');
  assert.equal(isMonthWindowOpen({ monthOpenAt: open, monthLockAt: lock }, now), false);
});