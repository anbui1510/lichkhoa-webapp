import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readLocalLockWindows,
  writeLocalLockWindows,
} from '../src/logic/localLockWindows.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

test('TC-F214-20: local lock round-trip per spreadsheet', () => {
  store.clear();
  const iso = '2026-12-01T10:00:00.000Z';
  writeLocalLockWindows('sheet-a', { leaveLockAt: iso });
  assert.equal(readLocalLockWindows('sheet-a').leaveLockAt, iso);
  writeLocalLockWindows('sheet-a', { leaveLockAt: null });
  assert.equal(readLocalLockWindows('sheet-a').leaveLockAt, null);
});