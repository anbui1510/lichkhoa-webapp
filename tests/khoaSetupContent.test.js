import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  KHOA_SETUP_ADMIN_STEPS,
  khoaSetupExample,
} from '../src/features/sheetSync/khoaSetupContent.js';

describe('F-304 khoa setup guide', () => {
  it('TC-F304-14: admin checklist has 7 steps', () => {
    assert.equal(KHOA_SETUP_ADMIN_STEPS.length, 7);
  });

  it('TC-F304-14b: example Tiêu hóa sheet name', () => {
    const ex = khoaSetupExample('Khoa Tiêu hóa');
    assert.match(ex.sheetFileName, /Tieu/i);
    assert.match(ex.deptIdHint, /dept_/);
  });
});