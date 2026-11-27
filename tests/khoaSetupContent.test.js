import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  KHOA_SETUP_ADMIN_STEPS,
  khoaSetupExample,
  suggestedSheetMeta,
} from '../src/features/sheetSync/khoaSetupContent.js';

describe('F-304 khoa setup guide', () => {
  it('TC-F304-14: admin checklist has meta step', () => {
    assert.equal(KHOA_SETUP_ADMIN_STEPS.length, 8);
    assert.ok(KHOA_SETUP_ADMIN_STEPS.some((s) => s.id === 'meta'));
  });

  it('TC-F304-14b: example Tiêu hóa sheet name', () => {
    const ex = khoaSetupExample('Khoa Tiêu hóa');
    assert.match(ex.sheetFileName, /Tieu/i);
    assert.match(ex.deptIdHint, /dept_/);
  });

  it('TC-F304-14c: suggested _meta for Tiêu hóa', () => {
    const rows = suggestedSheetMeta('Khoa Tiêu hóa');
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    assert.equal(byKey.activeDeptId, 'dept_tieuhoa');
    assert.equal(byKey.deptName, 'Khoa Tiêu hóa');
  });
});