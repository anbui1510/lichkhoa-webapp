import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ROLE_ADMIN,
  parseBootstrapAdminEmails,
  resolveGoogleAdminBootstrap
} from '../src/services/adminBootstrap.js';
import { assertNoGoogleIdConflict } from '../src/services/googleAccountGuards.js';
import { verifyGoogleCredential } from '../src/services/googleAuth.js';

// Maps to docs/specs/features/F-102-auth-google-bootstrap/spec.md + Story 1.1 I/O matrix

test('TC-F102-01 parseBootstrapAdminEmails CSV', () => {
  assert.deepEqual(parseBootstrapAdminEmails(' a@b.co , C@D.co,, '), ['a@b.co', 'c@d.co']);
  assert.deepEqual(parseBootstrapAdminEmails(''), []);
});

test('TC-F102-02 first-user: chưa có Admin → cho phép + grant Admin (kể cả ngoài allowlist)', () => {
  const r = resolveGoogleAdminBootstrap({
    email: 'anyone@outside.example',
    existingRole: '',
    adminCount: 0,
    allowlist: ['only@allowed.example']
  });
  assert.equal(r.allowed, true);
  assert.equal(r.grantAdmin, true);
});

test('TC-F102-03 allowlist: email ∈ BOOTSTRAP_ADMIN_EMAILS → Admin', () => {
  const r = resolveGoogleAdminBootstrap({
    email: 'Boss@Allowed.Example',
    existingRole: '',
    adminCount: 2,
    allowlist: ['boss@allowed.example']
  });
  assert.equal(r.allowed, true);
  assert.equal(r.grantAdmin, true);
});

test('TC-F102-04 reject: đã có Admin + ngoài allowlist + chưa Admin → 403 policy', () => {
  const r = resolveGoogleAdminBootstrap({
    email: 'guest@outside.example',
    existingRole: '',
    adminCount: 1,
    allowlist: ['boss@allowed.example']
  });
  assert.equal(r.allowed, false);
  assert.equal(r.grantAdmin, false);
  assert.match(r.reason, /không được phép/i);
});

test('TC-F102-05 existing Admin đăng nhập lại → giữ Admin', () => {
  const r = resolveGoogleAdminBootstrap({
    email: 'old-admin@example.com',
    existingRole: ROLE_ADMIN,
    adminCount: 1,
    allowlist: []
  });
  assert.equal(r.allowed, true);
  assert.equal(r.grantAdmin, true);
});

test('TC-F102-09 credential Google invalid → 401 từ verify', async () => {
  const prev = process.env.GOOGLE_CLIENT_ID;
  process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
  try {
    await assert.rejects(
      () => verifyGoogleCredential('x'.repeat(40)),
      (err) => err.status === 401
    );
  } finally {
    process.env.GOOGLE_CLIENT_ID = prev;
  }
});

test('TC-F102-10 email đã gắn googleId khác → 409', () => {
  assert.throws(
    () => assertNoGoogleIdConflict({ googleId: 'gid-old' }, 'gid-new'),
    (err) => err.status === 409 && /Google khác/i.test(err.message)
  );
  assert.doesNotThrow(() => assertNoGoogleIdConflict({ googleId: 'gid-same' }, 'gid-same'));
  assert.doesNotThrow(() => assertNoGoogleIdConflict(null, 'gid-new'));
});
