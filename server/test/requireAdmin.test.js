import test from 'node:test';
import assert from 'node:assert/strict';
import { requireAdmin } from '../src/middlewares/requireAdmin.js';

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
  return res;
}

test('TC-F103-10 non-Admin PUT gate → 403', () => {
  const req = { user: { id: 'u1', role: '' } };
  const res = mockRes();
  let nextCalled = false;
  requireAdmin(req, res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.match(String(res.body?.error || ''), /Admin/i);
});

test('TC-F103-11 Admin → next()', () => {
  const req = { user: { id: 'u1', role: 'Admin' } };
  const res = mockRes();
  let nextCalled = false;
  requireAdmin(req, res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});
