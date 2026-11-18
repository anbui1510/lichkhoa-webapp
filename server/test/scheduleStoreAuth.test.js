import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

// docs/specs/features/F-303-schedule-cloud-sync/spec.md — TC-F303-02

test('TC-F303-02: GET /api/schedule-store không token → 401', async () => {
  const app = createApp();
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}/api/schedule-store`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.ok(body.error);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
