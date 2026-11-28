import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLOUD_META_KEY,
  EDIT_QUIET_MS,
  hasPendingSheetEdits,
  isEditQuietPeriod,
} from '../src/logic/pendingSheetEdits.js';

describe('F-304 pendingSheetEdits', () => {
  const prev = globalThis.localStorage;

  beforeEach(() => {
    const map = new Map();
    globalThis.localStorage = {
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => { map.set(k, String(v)); },
      removeItem: (k) => { map.delete(k); },
    };
  });

  afterEach(() => {
    globalThis.localStorage = prev;
  });

  it('TC-F304-35: staffAt mới → quiet + pending', () => {
    const now = Date.now();
    localStorage.setItem(CLOUD_META_KEY, JSON.stringify({ staffAt: now }));
    assert.equal(isEditQuietPeriod(now), true);
    assert.equal(hasPendingSheetEdits(now), true);
  });

  it('TC-F304-36: hết quiet nhưng còn TTL pending', () => {
    const now = Date.now();
    localStorage.setItem(CLOUD_META_KEY, JSON.stringify({
      staffAt: now - EDIT_QUIET_MS - 1_000,
    }));
    assert.equal(isEditQuietPeriod(now), false);
    assert.equal(hasPendingSheetEdits(now), true);
  });
});
