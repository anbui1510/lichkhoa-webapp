import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSpreadsheetId } from '../src/services/spreadsheetId.js';

// Maps to docs/specs/features/F-103-schedule-sheet-link/spec.md

const VALID_ID = '1auPmK3BcgDbHJcVut5SzEMLjQ_VH9wi8ZM6pS5LZ1Lc';

test('TC-F103-01 parse URL Spreadsheet → id', () => {
  const r = parseSpreadsheetId(
    `https://docs.google.com/spreadsheets/d/${VALID_ID}/edit#gid=0`
  );
  assert.equal(r.ok, true);
  assert.equal(r.spreadsheetId, VALID_ID);
});

test('TC-F103-02 parse raw id hợp lệ', () => {
  const r = parseSpreadsheetId(VALID_ID);
  assert.equal(r.ok, true);
  assert.equal(r.spreadsheetId, VALID_ID);
});

test('TC-F103-03 format lỗi → không ok + tiếng Việt', () => {
  const r = parseSpreadsheetId('not-a-sheet');
  assert.equal(r.ok, false);
  assert.match(r.error, /không hợp lệ/i);
});

test('TC-F103-04 chuỗi rỗng → lỗi', () => {
  const r = parseSpreadsheetId('   ');
  assert.equal(r.ok, false);
  assert.match(r.error, /Nhập ID/i);
});

test('TC-F103-12 URL /u/N/d/{id} hợp lệ', () => {
  const r = parseSpreadsheetId(
    `https://docs.google.com/spreadsheets/u/0/d/${VALID_ID}/edit`
  );
  assert.equal(r.ok, true);
  assert.equal(r.spreadsheetId, VALID_ID);
});

test('TC-F103-13 URL id quá ngắn → reject', () => {
  const r = parseSpreadsheetId('https://docs.google.com/spreadsheets/d/shortid/edit');
  assert.equal(r.ok, false);
});
