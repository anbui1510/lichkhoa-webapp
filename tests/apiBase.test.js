import test from 'node:test';
import assert from 'node:assert/strict';

// Node không có import.meta.env của Vite — kiểm tra contract helper bằng stub nhẹ.

test('getApiBase / isPasswordApiConfigured contract (module loads)', async () => {
  // Trong Viteless node test, import.meta.env thường undefined → fallback /api.
  const mod = await import('../src/config/apiBase.js');
  assert.equal(typeof mod.getApiBase(), 'string');
  assert.equal(typeof mod.isPasswordApiConfigured(), 'boolean');
  assert.ok(mod.getApiBase().length > 0);
});
