import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatLockAtLabel,
  isLeaveWindowOpen,
  isMonthWindowOpen,
  parseLockAt
} from '../src/logic/editWindows.js';

test('TC-F214-01: không leaveLockAt → cửa sổ mở', () => {
  assert.equal(isLeaveWindowOpen(null), true);
  assert.equal(isLeaveWindowOpen({}), true);
  assert.equal(isLeaveWindowOpen({ leaveLockAt: null }), true);
  assert.equal(isLeaveWindowOpen({ leaveLockAt: '' }), true);
});

test('TC-F214-02: trước hạn → mở', () => {
  const now = new Date('2026-11-20T10:00:00.000Z');
  assert.equal(
    isLeaveWindowOpen({ leaveLockAt: '2026-11-25T17:00:00.000Z' }, now),
    true
  );
});

test('TC-F214-03: sau hoặc bằng hạn → đóng', () => {
  const lock = '2026-11-25T17:00:00.000Z';
  assert.equal(isLeaveWindowOpen({ leaveLockAt: lock }, new Date(lock)), false);
  assert.equal(
    isLeaveWindowOpen({ leaveLockAt: lock }, new Date('2026-11-26T00:00:00.000Z')),
    false
  );
});

test('parseLockAt / month mirror', () => {
  assert.equal(parseLockAt('not-a-date'), null);
  assert.equal(
    isMonthWindowOpen({ monthLockAt: '2026-12-01T00:00:00.000Z' }, new Date('2026-11-01')),
    true
  );
  assert.match(formatLockAtLabel('2026-11-25T17:00:00.000Z'), /\d/);
  assert.equal(formatLockAtLabel(null), 'Chưa đặt hạn');
});
