import test, { before, mock } from 'node:test';
import assert from 'node:assert/strict';

let prismaState;
let sheetState;
let requestImpl;

function resetState() {
  prismaState = { row: null };
  sheetState = {
    titles: new Set(),
    values: {}
  };
  requestImpl = async () => ({ data: {} });
}

before(() => {
  resetState();

  mock.module('../src/config/db.js', {
    exports: {
      prisma: {
        deptScheduleConfig: {
          findUnique: async () => prismaState.row
        }
      }
    }
  });

  mock.module('google-auth-library', {
    exports: {
      GoogleAuth: class {
        async getClient() {
          return {
            request: async (opts) => requestImpl(opts)
          };
        }
      }
    }
  });
});

const VALID_ID = '1auPmK3BcgDbHJcVut5SzEMLjQ_VH9wi8ZM6pS5LZ1Lc';

test('TC-F210-01 resolveWriteRevision khớp → không conflict, revision++', async () => {
  const { resolveWriteRevision } = await import('../src/services/scheduleDataService.js');
  assert.deepEqual(resolveWriteRevision(3, 3), { nextRevision: 4, conflict: false });
  assert.deepEqual(resolveWriteRevision(0, 0), { nextRevision: 1, conflict: false });
});

test('TC-F210-02 resolveWriteRevision lệch → conflict + LWW vẫn tăng', async () => {
  const { resolveWriteRevision } = await import('../src/services/scheduleDataService.js');
  assert.deepEqual(resolveWriteRevision(5, 2), { nextRevision: 6, conflict: true });
  assert.deepEqual(resolveWriteRevision(1, 0), { nextRevision: 2, conflict: true });
});

test('TC-F210-03 parseMetaValues rỗng → revision 0', async () => {
  const { parseMetaValues } = await import('../src/services/scheduleDataService.js');
  assert.deepEqual(parseMetaValues([]), { revision: 0, updatedAt: '', updatedBy: '' });
  assert.deepEqual(parseMetaValues(null), { revision: 0, updatedAt: '', updatedBy: '' });
});

test('TC-F210-04 parseMetaValues + parseDataValues', async () => {
  const { parseMetaValues, parseDataValues, serializeMetaRows, serializeDataRows } =
    await import('../src/services/scheduleDataService.js');
  const meta = parseMetaValues([
    ['revision', '7'],
    ['updatedAt', '2026-11-19T00:00:00.000Z'],
    ['updatedBy', 'u1']
  ]);
  assert.equal(meta.revision, 7);
  assert.equal(meta.updatedBy, 'u1');
  const payload = parseDataValues([['{"departments":[{"id":"d1"}],"activeDeptId":"d1"}']]);
  assert.equal(payload.activeDeptId, 'd1');
  assert.equal(parseDataValues([[]]).departments, undefined);
  assert.deepEqual(serializeMetaRows({ revision: 1, updatedAt: 't', updatedBy: 'u' })[0], [
    'revision',
    '1'
  ]);
  assert.match(serializeDataRows({ a: 1 })[0][0], /"a":1/);
});

test('TC-F210-05 GET chưa link spreadsheet → 409 tiếng Việt', async () => {
  resetState();
  delete process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  delete process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  prismaState.row = null;
  const { getScheduleData } = await import('../src/services/scheduleDataService.js');
  await assert.rejects(
    () => getScheduleData(),
    (err) => err.status === 409 && /liên kết|Spreadsheet|Cài đặt/i.test(err.message)
  );
});

test('TC-F210-06 GET sheet trống → payload {} revision 0', async () => {
  resetState();
  prismaState.row = { id: 'default', spreadsheetId: VALID_ID };
  process.env.GOOGLE_SHEETS_CLIENT_EMAIL = 'sa@test.iam.gserviceaccount.com';
  process.env.GOOGLE_SHEETS_PRIVATE_KEY =
    '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n';

  requestImpl = async (opts) => {
    const url = String(opts.url || '');
    if (url.includes(':batchUpdate')) {
      return { data: {} };
    }
    if (opts.method === 'PUT') {
      return { data: {} };
    }
    if (url.includes('fields=sheets.properties.title')) {
      return { data: { sheets: [] } };
    }
    if (url.includes('/values/')) {
      return { data: { values: [] } };
    }
    return { data: {} };
  };

  const { getScheduleData } = await import('../src/services/scheduleDataService.js');
  const data = await getScheduleData();
  assert.equal(data.revision, 0);
  assert.deepEqual(data.payload, {});
  assert.equal(data.source, 'sheet');
});

test('TC-F210-07 PUT LWW conflict flag khi baseRevision lệch', async () => {
  resetState();
  prismaState.row = { id: 'default', spreadsheetId: VALID_ID };
  process.env.GOOGLE_SHEETS_CLIENT_EMAIL = 'sa@test.iam.gserviceaccount.com';
  process.env.GOOGLE_SHEETS_PRIVATE_KEY =
    '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n';

  const writes = [];
  requestImpl = async (opts) => {
    const url = String(opts.url || '');
    if (url.includes('fields=sheets.properties.title')) {
      return {
        data: {
          sheets: [
            { properties: { title: '_smoothwork_data' } },
            { properties: { title: '_smoothwork_meta' } }
          ]
        }
      };
    }
    if (url.includes('_smoothwork_meta') && (!opts.method || opts.method === 'GET')) {
      return {
        data: {
          values: [
            ['revision', '4'],
            ['updatedAt', 'old'],
            ['updatedBy', 'prev']
          ]
        }
      };
    }
    if (opts.method === 'PUT') {
      writes.push({ url, values: opts.data?.values });
      return { data: {} };
    }
    return { data: { values: [] } };
  };

  const { putScheduleData } = await import('../src/services/scheduleDataService.js');
  const result = await putScheduleData(
    { payload: { departments: [], activeDeptId: 'x' }, baseRevision: 1 },
    { userId: 'admin-1' }
  );
  assert.equal(result.conflict, true);
  assert.equal(result.revision, 5);
  assert.equal(result.payload.activeDeptId, 'x');
  assert.ok(writes.length >= 2);
});

test('TC-F210-08 PUT khớp revision → conflict false', async () => {
  resetState();
  prismaState.row = { id: 'default', spreadsheetId: VALID_ID };
  process.env.GOOGLE_SHEETS_CLIENT_EMAIL = 'sa@test.iam.gserviceaccount.com';
  process.env.GOOGLE_SHEETS_PRIVATE_KEY =
    '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n';

  requestImpl = async (opts) => {
    const url = String(opts.url || '');
    if (url.includes('fields=sheets.properties.title')) {
      return {
        data: {
          sheets: [
            { properties: { title: '_smoothwork_data' } },
            { properties: { title: '_smoothwork_meta' } }
          ]
        }
      };
    }
    if (url.includes('_smoothwork_meta') && (!opts.method || opts.method === 'GET')) {
      return { data: { values: [['revision', '2']] } };
    }
    if (opts.method === 'PUT') return { data: {} };
    return { data: { values: [] } };
  };

  const { putScheduleData } = await import('../src/services/scheduleDataService.js');
  const result = await putScheduleData(
    { payload: { departments: [{ id: 'd' }] }, baseRevision: 2 },
    { userId: 'mod-1' }
  );
  assert.equal(result.conflict, false);
  assert.equal(result.revision, 3);
});

test('TC-F210-09 PUT chưa link → 409', async () => {
  resetState();
  prismaState.row = { id: 'default', spreadsheetId: '' };
  process.env.GOOGLE_SHEETS_CLIENT_EMAIL = 'sa@test.iam.gserviceaccount.com';
  process.env.GOOGLE_SHEETS_PRIVATE_KEY =
    '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n';
  const { putScheduleData } = await import('../src/services/scheduleDataService.js');
  await assert.rejects(
    () => putScheduleData({ payload: {}, baseRevision: 0 }, { userId: 'a' }),
    (err) => err.status === 409
  );
});
