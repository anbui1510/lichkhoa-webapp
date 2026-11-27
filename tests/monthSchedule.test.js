import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveMonthRoles, MONTH_ROLES } from '../src/logic/monthSchedule.js';

describe('resolveMonthRoles', () => {
  it('accepts object-shaped roles from corrupt JSON', () => {
    const roles = resolveMonthRoles({ 0: { key: 'sn', label: 'SN' } });
    assert.equal(roles.length, 1);
    assert.equal(roles[0].key, 'sn');
  });

  it('falls back to defaults when empty', () => {
    const roles = resolveMonthRoles(null);
    assert.equal(roles.length, MONTH_ROLES.length);
  });
});