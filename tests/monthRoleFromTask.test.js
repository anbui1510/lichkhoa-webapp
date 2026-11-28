import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { monthRoleFromTask } from '../src/logic/taskMatch.js';

describe('monthRoleFromTask', () => {
  it('maps TC to truc_chinh stable key', () => {
    const role = monthRoleFromTask({ id: 't1', code: 'TC', name: 'Trực Chính' });
    assert.equal(role.key, 'truc_chinh');
    assert.equal(role.taskId, 't1');
  });

  it('maps RO to ro', () => {
    const role = monthRoleFromTask({ id: 't2', code: 'RO', name: 'RO' });
    assert.equal(role.key, 'ro');
  });
});