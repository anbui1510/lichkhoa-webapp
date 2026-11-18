import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduleStorePutSchema } from '../src/validators/scheduleStoreValidator.js';

// docs/specs/features/F-303-schedule-cloud-sync/spec.md

test('TC-F303-01: PUT thiếu departments fails', () => {
  const r = scheduleStorePutSchema.safeParse({ payload: {} });
  assert.equal(r.success, false);
});

test('TC-F303-04: payload có departments pass', () => {
  const r = scheduleStorePutSchema.safeParse({
    payload: { departments: [], activeDeptId: 'x', sheetsByDept: {} },
  });
  assert.equal(r.success, true);
});
