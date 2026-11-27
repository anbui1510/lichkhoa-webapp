import test from 'node:test';
import assert from 'node:assert/strict';
import { mayWriteSchedule } from '../src/middlewares/requireScheduleWrite.js';

test('TC-F214-10 User + cửa sổ mở → được ghi', () => {
  assert.equal(
    mayWriteSchedule('User', { leaveLockAt: '2099-01-01T00:00:00.000Z' }),
    true
  );
});

test('TC-F214-11 User + đã khóa → không ghi', () => {
  assert.equal(
    mayWriteSchedule('User', { leaveLockAt: '2000-01-01T00:00:00.000Z' }),
    false
  );
});

test('Admin luôn được ghi bất kể khóa', () => {
  assert.equal(
    mayWriteSchedule('Admin', { leaveLockAt: '2000-01-01T00:00:00.000Z' }),
    true
  );
  assert.equal(
    mayWriteSchedule('Mod', { leaveLockAt: '2000-01-01T00:00:00.000Z' }),
    true
  );
});

test('role rỗng / pending → không ghi', () => {
  assert.equal(mayWriteSchedule('', { leaveLockAt: null }), false);
});
