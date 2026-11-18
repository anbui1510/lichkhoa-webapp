import test from 'node:test';
import assert from 'node:assert/strict';
import { requireModOrAdmin } from '../src/middlewares/requireModOrAdmin.js';

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

test('TC-F210-10 User ghi lịch → 403', () => {
  const req = { user: { id: 'u1', role: 'User' } };
  const res = mockRes();
  let nextCalled = false;
  requireModOrAdmin(req, res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.match(String(res.body?.error || ''), /Admin|Mod/i);
});

test('TC-F210-11 role rỗng → 403', () => {
  const req = { user: { id: 'u1', role: '' } };
  const res = mockRes();
  let nextCalled = false;
  requireModOrAdmin(req, res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});

test('TC-F210-12 Mod → next()', () => {
  const req = { user: { id: 'u1', role: 'Mod' } };
  const res = mockRes();
  let nextCalled = false;
  requireModOrAdmin(req, res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});

test('TC-F210-13 Admin → next()', () => {
  const req = { user: { id: 'u1', role: 'Admin' } };
  const res = mockRes();
  let nextCalled = false;
  requireModOrAdmin(req, res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
});
