import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { CLOUD_META_KEY } from '../src/logic/staffFresh.js';
import { mergeStaffOnPull } from '../src/logic/staffPullMerge.js';

describe('F-304 mergeStaffOnPull', () => {
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

  it('TC-F304-32: staffAt fresh → giữ staff local (showInWeek On)', () => {
    localStorage.setItem(CLOUD_META_KEY, JSON.stringify({ staffAt: Date.now() }));
    const local = {
      departments: [{
        id: 'd1',
        staff: [{ id: 'huy', shortName: 'HUY', showInWeek: true, studyFrom: '2026-11-01', studyTo: '2026-11-29' }],
      }],
    };
    const remote = {
      departments: [{
        id: 'd1',
        staff: [{ id: 'huy', shortName: 'HUY', showInWeek: false, studyFrom: '2026-10-31T17:00:00.000Z', studyTo: '2026-11-28T17:00:00.000Z' }],
      }],
    };
    const next = mergeStaffOnPull(local, remote);
    assert.equal(next.departments[0].staff[0].showInWeek, true);
    assert.equal(next.departments[0].staff[0].studyFrom, '2026-11-01');
  });

  it('TC-F304-33: không fresh → lấy staff remote', () => {
    localStorage.setItem(CLOUD_META_KEY, JSON.stringify({ staffAt: Date.now() - 40 * 60_000 }));
    const local = {
      departments: [{ id: 'd1', staff: [{ id: 'huy', showInWeek: true }] }],
    };
    const remote = {
      departments: [{ id: 'd1', staff: [{ id: 'huy', showInWeek: false }] }],
    };
    const next = mergeStaffOnPull(local, remote);
    assert.equal(next.departments[0].staff[0].showInWeek, false);
  });
});
