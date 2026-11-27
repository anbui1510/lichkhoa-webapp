import test from 'node:test';
import assert from 'node:assert/strict';

// sessionStorage stub for Node
const store = new Map();
globalThis.sessionStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => {
    store.set(k, String(v));
  },
  removeItem: (k) => {
    store.delete(k);
  }
};

test('preview session round-trip', async () => {
  store.clear();
  const {
    setSheetPreviewSession,
    getSheetPreviewSession,
    clearSheetPreviewSession,
    hasSheetPreviewSession
  } = await import('../src/features/account/previewSession.js');

  assert.equal(hasSheetPreviewSession(), false);
  assert.equal(setSheetPreviewSession('not-email'), null);
  assert.ok(setSheetPreviewSession('Ban@Benhvien.VN'));
  assert.equal(getSheetPreviewSession()?.email, 'ban@benhvien.vn');
  assert.equal(hasSheetPreviewSession(), true);
  clearSheetPreviewSession();
  assert.equal(hasSheetPreviewSession(), false);
});
