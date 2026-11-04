import test from 'node:test';
import assert from 'node:assert/strict';
import { isSessionReady } from '../src/features/account/sessionAuth.js';

test('TC-F102-01: Sheet thiếu Google token → không sẵn sàng', () => {
  assert.equal(
    isSessionReady({
      backend: 'sheet',
      googleToken: '',
      user: { email: 'a@b.co' }
    }),
    false
  );
});

test('TC-F102-02: Sheet đủ Google token + email → sẵn sàng', () => {
  assert.equal(
    isSessionReady({
      backend: 'sheet',
      googleToken: 'eyJhbGciOiJSUzI1NiJ9.e30.x',
      user: { email: 'a@b.co' }
    }),
    true
  );
});

test('TC-F102-03: API offline local không token → không sẵn sàng', () => {
  assert.equal(
    isSessionReady({
      backend: 'api',
      token: '',
      user: { id: 'local', email: 'local@x' },
      offline: true
    }),
    false
  );
});

test('TC-F102-04: API JWT hợp lệ → sẵn sàng', () => {
  assert.equal(
    isSessionReady({
      backend: 'api',
      token: 'jwt-token',
      user: { id: 'u1', email: 'admin@lichkhoa.local' },
      offline: false
    }),
    true
  );
});
