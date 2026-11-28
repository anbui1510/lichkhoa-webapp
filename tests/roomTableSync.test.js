import test from 'node:test';
import assert from 'node:assert/strict';

test('mergeWeekViewCursor keeps roomTable when fresh', async () => {
  const metaStore = new Map();
  globalThis.localStorage = {
    getItem: (k) => metaStore.get(k) ?? null,
    setItem: (k, v) => metaStore.set(k, String(v)),
    removeItem: (k) => metaStore.delete(k),
  };
  const { CLOUD_META_KEY } = await import('../src/logic/roomTableFresh.js');
  const { mergeWeekViewCursor } = await import('../src/logic/weekCursorMerge.js');
  metaStore.set(CLOUD_META_KEY, JSON.stringify({ roomTableAt: Date.now() }));
  const roomTable = { labels: ['Tên bệnh phòng', 'BS chính'], matrix: [['b1'], ['LOI']], colWidths: [120], rowHeights: [32, 32] };
  const local = {
    activeDeptId: 'dept1',
    sheetsByDept: {
      dept1: {
        activeSheetId: 'sh1',
        sheets: [{ id: 'sh1', startDate: '2026-09-14', grid: {}, weeks: {}, roomTable }],
      },
    },
  };
  const remote = {
    activeDeptId: 'dept1',
    sheetsByDept: {
      dept1: {
        activeSheetId: 'sh1',
        sheets: [{ id: 'sh1', startDate: '2026-09-14', grid: {}, weeks: {}, roomTable: { labels: ['x'], matrix: [[]], colWidths: [], rowHeights: [] } }],
      },
    },
  };
  const next = mergeWeekViewCursor(local, remote);
  assert.equal(next.sheetsByDept.dept1.sheets[0].roomTable.matrix[0][0], 'b1');
});