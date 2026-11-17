import test from 'node:test';
import assert from 'node:assert/strict';
import { needsStaffLink, resolveActor } from '../../src/logic/access.js';

test('TC-F102-06 resolveActor: role Admin từ server → kind admin full', () => {
  const actor = resolveActor(
    { id: 'u1', email: 'admin.google@bv.vn', username: 'admingoogle', role: 'Admin' },
    []
  );
  assert.equal(actor.kind, 'admin');
  assert.equal(actor.access.week, 'edit');
});

test('TC-F102-07 needsStaffLink: Admin Google không bắt liên kết staff', () => {
  assert.equal(
    needsStaffLink({ id: 'u1', email: 'admin.google@bv.vn', username: 'someone', role: 'Admin' }),
    false
  );
});

test('TC-F102-08 resolveActor: user thường không Admin → guest khi chưa link', () => {
  const actor = resolveActor(
    { id: 'u2', email: 'member@bv.vn', username: 'member1', role: '' },
    []
  );
  assert.equal(actor.kind, 'guest');
});
