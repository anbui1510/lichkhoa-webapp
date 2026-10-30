import test from 'node:test';
import assert from 'node:assert/strict';
import { loginSchema } from '../src/validators/profileValidator.js';

// Maps to docs/specs/features/F-101-auth-login/spec.md

test('TC-F101-01: invalid email fails', () => {
  const r = loginSchema.safeParse({ email: 'x', password: 'secret' });
  assert.equal(r.success, false);
});

test('TC-F101-02: empty password fails', () => {
  const r = loginSchema.safeParse({ email: 'a@b.co', password: '' });
  assert.equal(r.success, false);
});

test('TC-F101-03: valid shape passes schema', () => {
  const r = loginSchema.safeParse({ email: 'a@b.co', password: 'x' });
  assert.equal(r.success, true);
});
