import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWeekStartIso } from '../src/logic/weekStartNormalize.js';

function dateStrFromIso(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const temp = new Date(y, m - 1, d);
  return `${temp.getDate()}/${temp.getMonth() + 1}`;
}

test('TC-F201-07: normalizeWeekStartIso — ISO hợp lệ', () => {
  assert.equal(normalizeWeekStartIso('2025-11-03'), '2025-11-03');
});

test('TC-F201-08: normalizeWeekStartIso — rỗng → ISO hợp lệ, dateStr không NaN', () => {
  const iso = normalizeWeekStartIso('');
  assert.match(iso, /^\d{4}-\d{2}-\d{2}$/);
  const label = dateStrFromIso(iso);
  assert.ok(!label.includes('NaN'), `label: ${label}`);
});

test('TC-F201-09: normalizeWeekStartIso — ISO datetime Sheet không về tuần hiện tại', () => {
  assert.equal(normalizeWeekStartIso('2026-11-29T17:00:00.000Z'), '2026-11-30');
  assert.equal(normalizeWeekStartIso('2026-11-22T17:00:00.000Z'), '2026-11-23');
});