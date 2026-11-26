import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canMutateLeaveEntry,
  resolveActorLeaveKeys
} from '../src/logic/leaveOwnership.js';

const staffList = [
  { id: 's1', name: 'Nguyễn Văn A', shortName: 'A', loginEmail: 'a@bv.vn' },
  { id: 's2', name: 'Trần B', shortName: 'B', loginEmail: 'b@bv.vn' }
];

test('TC-F214-04: ownership match shortName qua loginEmail', () => {
  const user = { id: 'u1', email: 'a@bv.vn', role: 'User' };
  const keys = resolveActorLeaveKeys(user, staffList, []);
  assert.equal(keys.has('A'), true);
  assert.equal(
    canMutateLeaveEntry({ kind: 'member' }, { shortName: 'A' }, keys),
    true
  );
});

test('TC-F214-05: ownership lệch → false', () => {
  const user = { id: 'u1', email: 'a@bv.vn', role: 'User' };
  const keys = resolveActorLeaveKeys(user, staffList, []);
  assert.equal(
    canMutateLeaveEntry({ kind: 'member' }, { shortName: 'B' }, keys),
    false
  );
});

test('TC-F214-06: Admin bỏ qua ownership', () => {
  assert.equal(
    canMutateLeaveEntry({ kind: 'admin' }, { shortName: 'B' }, new Set()),
    true
  );
});

test('roster displayName map sang shortName', () => {
  const user = { id: 'u9', email: 'x@bv.vn', role: 'User' };
  const keys = resolveActorLeaveKeys(user, staffList, [
    { id: 'r1', displayName: 'Nguyễn Văn A', linkedUserId: 'u9' }
  ]);
  assert.equal(keys.has('A'), true);
});
