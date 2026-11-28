import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearLoginSession,
  DEFAULT_SESSION_MINUTES,
  isLoginSessionActive,
  resolveSessionTimeoutMinutes,
  startLoginSession,
} from '../src/features/account/loginSession.js';

const store = new Map();
globalThis.sessionStorage = {
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

test('TC-F102-10: resolveSessionTimeoutMinutes — mặc định 60, null = vô thời hạn', () => {
  assert.equal(resolveSessionTimeoutMinutes({}), DEFAULT_SESSION_MINUTES);
  assert.equal(resolveSessionTimeoutMinutes({ sessionTimeoutMinutes: null }), null);
  assert.equal(resolveSessionTimeoutMinutes({ sessionTimeoutMinutes: 30 }), 30);
});

test('TC-F102-11: phiên app còn hạn khi chưa idle (không phụ thuộc Google JWT)', () => {
  clearLoginSession();
  const settings = { sessionTimeoutMinutes: 60 };
  startLoginSession({ email: 'a@b.co', id: 'u1', username: 'a', fullName: 'A', role: 'User' });
  assert.equal(isLoginSessionActive(settings), true);
});

test('TC-F102-12: phiên app hết hạn sau idle', () => {
  clearLoginSession();
  const settings = { sessionTimeoutMinutes: 1 };
  startLoginSession({ email: 'a@b.co', id: 'u1', username: 'a', fullName: 'A', role: 'User' });
  const raw = sessionStorage.getItem('LICHKHOA_APP_LOGIN_SESSION');
  const data = JSON.parse(raw);
  data.lastActivityAt = Date.now() - 2 * 60_000;
  sessionStorage.setItem('LICHKHOA_APP_LOGIN_SESSION', JSON.stringify(data));
  assert.equal(isLoginSessionActive(settings), false);
});

test('TC-F102-13: vô thời hạn — không hết phiên vì idle', () => {
  clearLoginSession();
  const settings = { sessionTimeoutMinutes: null };
  startLoginSession({ email: 'a@b.co', id: 'u1', username: 'a', fullName: 'A', role: 'User' });
  const raw = sessionStorage.getItem('LICHKHOA_APP_LOGIN_SESSION');
  const data = JSON.parse(raw);
  data.lastActivityAt = Date.now() - 365 * 24 * 60 * 60_000;
  sessionStorage.setItem('LICHKHOA_APP_LOGIN_SESSION', JSON.stringify(data));
  assert.equal(isLoginSessionActive(settings), true);
});