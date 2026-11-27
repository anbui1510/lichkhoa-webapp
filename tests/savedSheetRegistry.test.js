import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  listSavedSheets,
  rememberSavedSheet,
} from '../src/features/sheetSync/savedSheetRegistry.js';

describe('F-305 savedSheetRegistry (chế độ 0)', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      store: {},
      getItem(key) {
        return this.store[key] ?? null;
      },
      setItem(key, value) {
        this.store[key] = value;
      },
      removeItem(key) {
        delete this.store[key];
      },
    };
  });

  it('TC-F305-09: remember + list rounds trip', () => {
    rememberSavedSheet('1auPmK3BcgDbHJcVut5SzEMLjQ_VH9wi8', 'Khoa Tim mạch');
    const list = listSavedSheets();
    assert.equal(list.length, 1);
    assert.equal(list[0].spreadsheetId, '1auPmK3BcgDbHJcVut5SzEMLjQ_VH9wi8');
    assert.equal(list[0].label, 'Khoa Tim mạch');
  });

  it('TC-F305-09b: updates label', () => {
    const id = '1auPmK3BcgDbHJcVut5SzEMLjQ_XX';
    rememberSavedSheet(id, 'Khoa A');
    rememberSavedSheet(id, 'Khoa Tim mạch');
    const list = listSavedSheets();
    assert.equal(list[0].label, 'Khoa Tim mạch');
  });
});