import test, { before, after, mock } from 'node:test';
import assert from 'node:assert/strict';

// Chạy thật hasSheetsCredentials / pingSpreadsheetMetadata (không mock cả module từ service test).

let requestImpl;
let pingSpreadsheetMetadata;
let hasSheetsCredentials;

before(async () => {
  requestImpl = async () => ({ data: { properties: { title: 'Lịch Khoa' } } });

  mock.module('google-auth-library', {
    namedExports: {
      GoogleAuth: class {
        async getClient() {
          return {
            request: async (opts) => requestImpl(opts)
          };
        }
      }
    }
  });

  ({ pingSpreadsheetMetadata, hasSheetsCredentials } = await import(
    '../src/services/sheetsMetadataPing.js'
  ));
});

after(() => {
  delete process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  delete process.env.GOOGLE_SHEETS_PRIVATE_KEY;
});

test('TC-F103-15 thiếu credentials → skipped', async () => {
  delete process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  delete process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  assert.equal(hasSheetsCredentials(), false);
  const r = await pingSpreadsheetMetadata('1auPmK3BcgDbHJcVut5SzEMLjQ_VH9wi8ZM6pS5LZ1Lc');
  assert.deepEqual(r, { skipped: true });
});

test('TC-F103-16 có credentials + ping OK → title', async () => {
  process.env.GOOGLE_SHEETS_CLIENT_EMAIL = 'sa@test.iam.gserviceaccount.com';
  process.env.GOOGLE_SHEETS_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n';
  requestImpl = async () => ({ data: { properties: { title: 'Lịch Khoa' } } });
  assert.equal(hasSheetsCredentials(), true);
  const r = await pingSpreadsheetMetadata('1auPmK3BcgDbHJcVut5SzEMLjQ_VH9wi8ZM6pS5LZ1Lc');
  assert.equal(r.ok, true);
  assert.equal(r.title, 'Lịch Khoa');
});

test('TC-F103-17 ping 403 → lỗi tiếng Việt quyền', async () => {
  process.env.GOOGLE_SHEETS_CLIENT_EMAIL = 'sa@test.iam.gserviceaccount.com';
  process.env.GOOGLE_SHEETS_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n';
  requestImpl = async () => {
    const err = new Error('forbidden');
    err.response = { status: 403, data: { error: { message: 'forbidden' } } };
    throw err;
  };
  const r = await pingSpreadsheetMetadata('1auPmK3BcgDbHJcVut5SzEMLjQ_VH9wi8ZM6pS5LZ1Lc');
  assert.equal(r.ok, false);
  assert.match(r.error, /Service account|quyền/i);
});
