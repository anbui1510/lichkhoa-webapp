import test from 'node:test';
import assert from 'node:assert/strict';
import { rosterCreateSchema } from '../src/validators/rosterValidator.js';
import { toRosterDto } from '../src/services/rosterService.js';
import { isRosterRole, ROSTER_ROLES } from '../src/services/adminBootstrap.js';

test('TC-F104-01 roster roles accept Admin|Mod|User', () => {
  for (const role of ROSTER_ROLES) {
    const parsed = rosterCreateSchema.safeParse({ displayName: 'Tên', role });
    assert.equal(parsed.success, true, role);
    assert.equal(isRosterRole(role), true);
  }
});

test('TC-F104-02 roster role Guest reject', () => {
  const parsed = rosterCreateSchema.safeParse({ displayName: 'Tên', role: 'Guest' });
  assert.equal(parsed.success, false);
  assert.equal(isRosterRole('Guest'), false);
});

test('TC-F104-04 toRosterDto linked flag', () => {
  assert.equal(toRosterDto({ id: '1', displayName: 'A', role: 'User', linkedUserId: null }).linked, false);
  assert.equal(toRosterDto({ id: '1', displayName: 'A', role: 'User', linkedUserId: 'u1' }).linked, true);
});
