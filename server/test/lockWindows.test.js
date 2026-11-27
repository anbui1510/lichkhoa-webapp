import test, { before, mock } from 'node:test';
import assert from 'node:assert/strict';

let prismaState;
let savedRows;

function resetState() {
  prismaState = { row: null };
  savedRows = [];
}

before(() => {
  resetState();

  mock.module('../src/config/db.js', {
    namedExports: {
      prisma: {
        deptScheduleConfig: {
          findUnique: async () => prismaState.row,
          upsert: async ({ create, update }) => {
            const next = {
              id: 'default',
              ...(prismaState.row || {}),
              ...(prismaState.row ? update : create),
              createdAt: prismaState.row?.createdAt || new Date(),
              updatedAt: new Date()
            };
            prismaState.row = next;
            savedRows.push(next);
            return next;
          }
        }
      }
    }
  });

  mock.module('../src/services/sheetsMetadataPing.js', {
    namedExports: {
      hasSheetsCredentials: () => false,
      pingSpreadsheetMetadata: async () => ({ skipped: true })
    }
  });
});

test('TC-F214-07 GET config có leaveLockAt/monthLockAt null', async () => {
  resetState();
  const { getScheduleConfig } = await import('../src/services/scheduleConfigService.js');
  const config = await getScheduleConfig();
  assert.equal(config.leaveLockAt, null);
  assert.equal(config.monthLockAt, null);
});

test('TC-F214-08 PUT lock-windows ISO hợp lệ → persist', async () => {
  resetState();
  const { saveLockWindows, getScheduleConfig } = await import(
    '../src/services/scheduleConfigService.js'
  );
  const iso = '2026-11-30T17:00:00.000Z';
  const saved = await saveLockWindows(
    { leaveLockAt: iso, monthLockAt: null },
    { userId: 'admin-1' }
  );
  assert.equal(saved.leaveLockAt, iso);
  assert.equal(saved.monthLockAt, null);
  assert.equal(savedRows.length, 1);

  const again = await getScheduleConfig();
  assert.equal(again.leaveLockAt, iso);
});

test('TC-F214-09 PUT lock-windows invalid → 400', async () => {
  resetState();
  const { saveLockWindows } = await import('../src/services/scheduleConfigService.js');
  await assert.rejects(
    () => saveLockWindows({ leaveLockAt: 'abc' }, { userId: 'admin-1' }),
    (err) => err.status === 400
  );
});
