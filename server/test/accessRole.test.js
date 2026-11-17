import test from 'node:test';
import assert from 'node:assert/strict';
import { MEMBER_DEFAULT, needsStaffLink, resolveActor } from '../../src/logic/access.js';

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

test('TC-F105-04 resolveActor: role Mod → kind admin full', () => {
  const actor = resolveActor(
    { id: 'u3', email: 'mod@bv.vn', username: 'mod1', role: 'Mod' },
    []
  );
  assert.equal(actor.kind, 'admin');
  assert.equal(actor.access.tasks, 'edit');
});

test('TC-F105-05 resolveActor: role User → kind member + MEMBER_DEFAULT', () => {
  const actor = resolveActor(
    { id: 'u4', email: 'user@bv.vn', username: 'user1', role: 'User' },
    []
  );
  assert.equal(actor.kind, 'member');
  assert.deepEqual(actor.access, MEMBER_DEFAULT);
});

test('TC-F105-06 needsStaffLink: pending role rỗng → true', () => {
  assert.equal(
    needsStaffLink({ id: 'u5', email: 'pending@bv.vn', username: 'pending1', role: '' }),
    true
  );
});

test('TC-F105-07 needsStaffLink: Mod/User đã có role → false', () => {
  assert.equal(
    needsStaffLink({ id: 'u6', email: 'mod@bv.vn', username: 'mod2', role: 'Mod' }),
    false
  );
  assert.equal(
    needsStaffLink({ id: 'u7', email: 'user@bv.vn', username: 'user2', role: 'User' }),
    false
  );
});
