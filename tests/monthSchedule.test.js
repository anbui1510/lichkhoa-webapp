import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMonthTable,
  ensureMonthRolesFromGrid,
  inferMonthRolesFromGrid,
  resolveMonthRoles,
  MONTH_ROLES,
} from '../src/logic/monthSchedule.js';

describe('resolveMonthRoles', () => {
  it('accepts object-shaped roles from corrupt JSON', () => {
    const roles = resolveMonthRoles({ 0: { key: 'sn', label: 'SN' } });
    assert.equal(roles.length, 1);
    assert.equal(roles[0].key, 'sn');
  });

  it('falls back to defaults when roles missing (legacy local)', () => {
    const roles = resolveMonthRoles(null);
    assert.equal(roles.length, MONTH_ROLES.length);
  });

  it('keeps empty list for new dept bootstrap', () => {
    assert.deepEqual(resolveMonthRoles([]), []);
  });
});

describe('inferMonthRolesFromGrid', () => {
  it('rebuilds role rows from session cell keys', () => {
    const grid = {
      '2026-11-03|sn|S': 'A',
      '2026-11-03|truc_chinh|C': 'B',
    };
    const roles = inferMonthRolesFromGrid(grid);
    assert.equal(roles.length, 2);
    assert.deepEqual(roles.map((r) => r.key), ['truc_chinh', 'sn']);
  });

  it('ensureMonthRolesFromGrid keeps explicit roles', () => {
    const saved = [{ key: 'tc', label: 'TC' }];
    assert.deepEqual(ensureMonthRolesFromGrid(saved, { '2026-11-01|sn|S': 'x' }), saved);
  });

  it('ensureMonthRolesFromGrid fills when list empty and grid has data', () => {
    const roles = ensureMonthRolesFromGrid([], { '2026-11-01|ro|S': '1' });
    assert.equal(roles.length, 1);
    assert.equal(roles[0].key, 'ro');
  });
});

describe('buildMonthTable weekhead', () => {
  it('shows dd/mm on week head; adjacent-month days stay labeled (styled as outside)', () => {
    const { rows, meta, columns } = buildMonthTable('2026-11', {}, null, null, {}, ['S', 'C']);
    const headIndex = meta.findIndex((item) => item.type === 'weekhead');
    assert.ok(headIndex >= 0);
    const row = rows[headIndex];
    const labels = columns
      .map((column, index) => (column.kind === 'day' && column.lead ? row[index] : ''))
      .filter(Boolean);
    assert.ok(labels.length >= 7);
    assert.ok(labels.includes('01/11'));
    assert.ok(labels.some((label) => String(label).endsWith('/10')));
  });
});