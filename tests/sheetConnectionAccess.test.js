import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canEditSheetConnection } from '../src/logic/access.js';

describe('F-304 sheet connection ACL', () => {
  it('TC-F304-16: admin và guest được đổi link Sheet', () => {
    assert.equal(canEditSheetConnection({ kind: 'admin' }), true);
    assert.equal(canEditSheetConnection({ kind: 'guest' }), true);
    assert.equal(canEditSheetConnection({ kind: 'member' }), false);
  });
});