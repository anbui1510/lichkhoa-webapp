import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { listTenantRegistry } from '../src/config/tenant.js';

describe('F-305 khoa registry', () => {
  it('TC-F305-08: listTenantRegistry without env', () => {
    const list = listTenantRegistry();
    assert.ok(Array.isArray(list));
  });
});