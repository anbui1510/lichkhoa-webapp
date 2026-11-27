import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseSpreadsheetId } from '../src/logic/sheetStore/parseSpreadsheetId.js';

describe('F-306 hospital catalog', () => {
  it('TC-F306-02: parse catalog env id', () => {
    const id = parseSpreadsheetId('https://docs.google.com/spreadsheets/d/1abcDEFghiJKLmnopQRSTuvwx/edit');
    assert.equal(id, '1abcDEFghiJKLmnopQRSTuvwx');
  });
});