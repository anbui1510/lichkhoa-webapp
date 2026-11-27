import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { asArray, asGridDayRows } from '../src/logic/sheetStore/tableUtils.js';

describe('tableUtils asArray', () => {
  it('keeps arrays', () => {
    assert.deepEqual(asArray([1, 2]), [1, 2]);
  });

  it('converts object values to array', () => {
    assert.deepEqual(asArray({ a: 1, b: 2 }).sort(), [1, 2]);
  });

  it('asGridDayRows sorts numeric keys', () => {
    const days = asGridDayRows({ 2: { S: 'x' }, 0: { S: 'a' }, 1: { S: 'b' } });
    assert.equal(days.length, 3);
    assert.equal(days[0].S, 'a');
    assert.equal(days[2].S, 'x');
  });
});