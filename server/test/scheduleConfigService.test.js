import test, { before, mock } from 'node:test';
import assert from 'node:assert/strict';

// Wiring / matrix tests for F-103 schedule config (Story 1.2).

let prismaState;
let pingImpl;
let savedRows;

function resetState() {
  prismaState = { row: null };
  savedRows = [];
  pingImpl = async () => ({ skipped: true });
}

before(() => {
  resetState();

  mock.module('../src/config/db.js', {
    exports: {
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
    exports: {
      hasSheetsCredentials: () => false,
      pingSpreadsheetMetadata: async (id) => pingImpl(id)
    }
  });
});

const VALID_ID = '1auPmK3BcgDbHJcVut5SzEMLjQ_VH9wi8ZM6pS5LZ1Lc';

test('TC-F103-05 GET null unread → linked false', async () => {
  resetState();
  const { getScheduleConfig } = await import('../src/services/scheduleConfigService.js');
  const config = await getScheduleConfig();
  assert.equal(config.spreadsheetId, null);
  assert.equal(config.linked, false);
});

test('TC-F103-06 lưu format OK không credentials → persist', async () => {
  resetState();
  pingImpl = async () => ({ skipped: true });
  const { saveScheduleConfig, getScheduleConfig } = await import(
    '../src/services/scheduleConfigService.js'
  );
  const saved = await saveScheduleConfig(
    { spreadsheetIdOrUrl: `https://docs.google.com/spreadsheets/d/${VALID_ID}/edit` },
    { userId: 'admin-1' }
  );
  assert.equal(saved.linked, true);
  assert.equal(saved.spreadsheetId, VALID_ID);
  assert.equal(saved.verified, false);
  assert.equal(savedRows.length, 1);

  const again = await getScheduleConfig();
  assert.equal(again.spreadsheetId, VALID_ID);
});

test('TC-F103-07 ping fail → không lưu + 422', async () => {
  resetState();
  pingImpl = async () => ({
    ok: false,
    error: 'Service account chưa có quyền đọc Spreadsheet.'
  });
  const { saveScheduleConfig } = await import('../src/services/scheduleConfigService.js');
  await assert.rejects(
    () => saveScheduleConfig({ spreadsheetId: VALID_ID }, { userId: 'admin-1' }),
    (err) => err.status === 422 && /quyền/i.test(err.message)
  );
  assert.equal(savedRows.length, 0);
  assert.equal(prismaState.row, null);
});

test('TC-F103-08 format lỗi → 400 không lưu', async () => {
  resetState();
  const { saveScheduleConfig } = await import('../src/services/scheduleConfigService.js');
  await assert.rejects(
    () => saveScheduleConfig({ spreadsheetId: 'bad' }, { userId: 'admin-1' }),
    (err) => err.status === 400
  );
  assert.equal(savedRows.length, 0);
});

test('TC-F103-09 ping OK → verified + title', async () => {
  resetState();
  pingImpl = async () => ({ ok: true, title: 'Lịch khoa demo' });
  const { saveScheduleConfig } = await import('../src/services/scheduleConfigService.js');
  const saved = await saveScheduleConfig({ spreadsheetId: VALID_ID }, { userId: 'admin-1' });
  assert.equal(saved.verified, true);
  assert.equal(saved.title, 'Lịch khoa demo');
  assert.ok(saved.verifiedAt);
});
