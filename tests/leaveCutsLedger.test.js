import test from 'node:test';
import assert from 'node:assert/strict';
import {
  leaveCutsFromWeekGrid,
  leaveCutsEqual,
  staffAfterLeaveCutsChange,
} from '../src/logic/leaveCutsLedger.js';

const staff = [
  { id: '1', shortName: 'TRANG', buBalance: 3, phepBalance: 8 },
  { id: '2', shortName: 'TÀI', buBalance: 1.5, phepBalance: 4 },
];

const tasks = [
  { id: 't_bu', code: 'BÙ', name: 'Bù' },
  { id: 't_p', code: 'P', name: 'Phép' },
];

test('TC-F201-BU-01: đếm BÙ / P theo buổi trên lưới tuần', () => {
  const grid = {
    TRANG: {
      1: { S: '', C: 'BÙ' },
      3: { S: 'P', C: '' },
    },
    TÀI: {
      0: { S: 'BÙ', C: 'BÙ' },
    },
  };
  const cuts = leaveCutsFromWeekGrid(grid, staff, tasks, ['S', 'C']);
  assert.equal(cuts.bu.TRANG, 0.5);
  assert.equal(cuts.phep.TRANG, 0.5);
  assert.equal(cuts.bu.TÀI, 1);
  assert.equal(cuts.phep.TÀI, undefined);
});

test('TC-F201-BU-02: staffAfterLeaveCutsChange hoàn cuts cũ rồi trừ cuts mới', () => {
  const prev = { bu: { TRANG: 1 }, phep: {} };
  const next = { bu: { TRANG: 0.5 }, phep: { TRANG: 0.5 } };
  const updated = staffAfterLeaveCutsChange(staff, prev, next);
  const trang = updated.find((p) => p.shortName === 'TRANG');
  assert.equal(trang.buBalance, 3.5);
  assert.equal(trang.phepBalance, 7.5);
});

test('TC-F201-BU-03: leaveCutsEqual so sánh bu và phep', () => {
  assert.equal(leaveCutsEqual({ bu: { A: 1 }, phep: {} }, { bu: { A: 1 }, phep: {} }), true);
  assert.equal(leaveCutsEqual({ bu: { A: 1 }, phep: {} }, { bu: { A: 0.5 }, phep: {} }), false);
});