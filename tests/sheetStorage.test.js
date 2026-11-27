import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSpreadsheetId } from '../src/logic/sheetStore/resolveSpreadsheetId.js';

describe('F-304 sheetStorage', () => {
  it('TC-F304-15: localStorage ưu tiên hơn tenant env', () => {
    assert.equal(
      resolveSpreadsheetId({
        storedId: 'tieuhoaSheetId111111111111111',
        tenantId: 'timmachSheetId222222222222222',
      }),
      'tieuhoaSheetId111111111111111'
    );
  });

  it('TC-F304-15b: tenant khi chưa lưu local', () => {
    assert.equal(
      resolveSpreadsheetId({ storedId: '', tenantId: 'defaultFromEnv' }),
      'defaultFromEnv'
    );
  });
});