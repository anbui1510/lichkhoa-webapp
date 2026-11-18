/**
 * F-210 — Proxy đọc/ghi payload lịch trên Google Spreadsheet (SoT).
 * Tabs: `_smoothwork_data` (JSON) + `_smoothwork_meta` (revision, updatedAt, updatedBy).
 */

import { prisma } from '../config/db.js';
import { getSheetsAuthClient, hasSheetsCredentials } from './sheetsAuth.js';

export const DATA_TAB = '_smoothwork_data';
export const META_TAB = '_smoothwork_meta';
/** Giới hạn an toàn dưới 50_000 ký tự/ô Google Sheets. */
export const SHEETS_CELL_CHUNK_SIZE = 45000;
const SINGLETON_ID = 'default';
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

/**
 * LWW: luôn chấp nhận ghi mới; tăng revision; báo conflict nếu base lệch.
 * @param {number} currentRevision
 * @param {number} baseRevision
 * @returns {{ nextRevision: number, conflict: boolean }}
 */
export function resolveWriteRevision(currentRevision, baseRevision) {
  const current = Number.isFinite(Number(currentRevision)) ? Math.max(0, Math.trunc(Number(currentRevision))) : 0;
  const base = Number.isFinite(Number(baseRevision)) ? Math.max(0, Math.trunc(Number(baseRevision))) : 0;
  return {
    nextRevision: current + 1,
    conflict: base !== current
  };
}

/**
 * @param {unknown} values — rows từ values.get meta sheet
 * @returns {{ revision: number, updatedAt: string, updatedBy: string }}
 */
export function parseMetaValues(values) {
  const map = {};
  for (const row of values || []) {
    const key = String(row?.[0] || '').trim();
    if (!key) continue;
    map[key] = row?.[1] != null ? String(row[1]) : '';
  }
  const revisionRaw = Number(map.revision);
  const chunksRaw = Number(map.chunkCount);
  return {
    revision: Number.isFinite(revisionRaw) && revisionRaw >= 0 ? Math.trunc(revisionRaw) : 0,
    updatedAt: map.updatedAt || '',
    updatedBy: map.updatedBy || '',
    chunkCount:
      Number.isFinite(chunksRaw) && chunksRaw > 0 ? Math.trunc(chunksRaw) : 0
  };
}

/**
 * Ghép các ô cột A (mỗi ô ≤ ~45k) thành JSON payload.
 * Tương thích bản cũ: 1 ô A1 chứa toàn bộ JSON.
 * @param {unknown} values — rows từ values.get data sheet
 * @returns {object}
 */
export function parseDataValues(values) {
  const rows = Array.isArray(values) ? values : [];
  const parts = [];
  for (const row of rows) {
    const cell = row?.[0];
    if (cell == null || cell === '') continue;
    parts.push(typeof cell === 'string' ? cell : String(cell));
  }
  if (!parts.length) return {};
  const raw = parts.join('');
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch {
    /* fall through */
  }
  return {};
}

/**
 * @param {{ revision: number, updatedAt: string, updatedBy: string, chunkCount?: number }} meta
 * @returns {string[][]}
 */
export function serializeMetaRows(meta) {
  return [
    ['revision', String(meta.revision ?? 0)],
    ['updatedAt', String(meta.updatedAt || '')],
    ['updatedBy', String(meta.updatedBy || '')],
    ['chunkCount', String(meta.chunkCount ?? 1)]
  ];
}

/**
 * Chia JSON thành nhiều hàng cột A để tránh giới hạn 50k ký tự/ô.
 * @param {object} payload
 * @param {number} [chunkSize]
 * @returns {string[][]}
 */
export function serializeDataRows(payload, chunkSize = SHEETS_CELL_CHUNK_SIZE) {
  const json = JSON.stringify(payload && typeof payload === 'object' ? payload : {});
  const size = Math.max(1000, Math.trunc(Number(chunkSize) || SHEETS_CELL_CHUNK_SIZE));
  if (json.length <= size) return [[json]];
  const rows = [];
  for (let i = 0; i < json.length; i += size) {
    rows.push([json.slice(i, i + size)]);
  }
  return rows;
}

/**
 * @param {object} payload
 * @param {number} [chunkSize]
 * @returns {number}
 */
export function countDataChunks(payload, chunkSize = SHEETS_CELL_CHUNK_SIZE) {
  return serializeDataRows(payload, chunkSize).length;
}

async function getLinkedSpreadsheetId() {
  const row = await prisma.deptScheduleConfig.findUnique({ where: { id: SINGLETON_ID } });
  const id = String(row?.spreadsheetId || '').trim();
  if (!id) {
    const err = new Error(
      'Chưa liên kết Google Spreadsheet. Vào Cài đặt → Tùy chọn để gắn Sheet SoT trước khi đồng bộ lịch.'
    );
    err.status = 409;
    throw err;
  }
  return id;
}

function requireCredentials() {
  if (!hasSheetsCredentials()) {
    const err = new Error(
      'Chưa cấu hình Google Sheets trên máy chủ. Không thể đọc/ghi lịch SoT.'
    );
    err.status = 503;
    throw err;
  }
}

function sheetsError(err, fallback) {
  const status = err?.response?.status || err?.code;
  const detail =
    err?.response?.data?.error?.message || err?.message || fallback;
  let message = fallback;
  if (status === 404) {
    message = 'Không tìm thấy Spreadsheet (sai ID hoặc Sheet đã bị xóa).';
  } else if (status === 403) {
    message =
      'Service account chưa có quyền ghi Spreadsheet. Hãy chia sẻ Sheet cho email service account (ít nhất quyền Editor).';
  } else if (typeof detail === 'string' && detail.length < 180) {
    message = detail.includes('Chưa') || detail.includes('Không')
      ? detail
      : `Không truy cập được Spreadsheet: ${detail}`;
  }
  const out = new Error(message);
  out.status = status === 404 || status === 403 ? 422 : err?.status || 502;
  return out;
}

/**
 * @param {import('google-auth-library').AuthClient} client
 * @param {string} spreadsheetId
 */
async function listSheetTitles(client, spreadsheetId) {
  const url =
    `${SHEETS_API}/${encodeURIComponent(spreadsheetId)}` +
    '?fields=sheets.properties.title';
  const res = await client.request({ url, timeout: 15000 });
  const sheets = res?.data?.sheets || [];
  return new Set(
    sheets.map((s) => String(s?.properties?.title || '')).filter(Boolean)
  );
}

/**
 * @param {import('google-auth-library').AuthClient} client
 * @param {string} spreadsheetId
 * @param {string[]} titles
 */
async function ensureTabs(client, spreadsheetId, titles) {
  const existing = await listSheetTitles(client, spreadsheetId);
  const missing = titles.filter((t) => !existing.has(t));
  if (!missing.length) return;
  await client.request({
    url: `${SHEETS_API}/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
    method: 'POST',
    data: {
      requests: missing.map((title) => ({
        addSheet: { properties: { title } }
      }))
    },
    timeout: 15000
  });
}

/**
 * @param {import('google-auth-library').AuthClient} client
 * @param {string} spreadsheetId
 * @param {string} rangeA1
 */
async function valuesGet(client, spreadsheetId, rangeA1) {
  const url =
    `${SHEETS_API}/${encodeURIComponent(spreadsheetId)}/values/` +
    `${encodeURIComponent(rangeA1)}`;
  const res = await client.request({ url, timeout: 15000 });
  return res?.data?.values || [];
}

/**
 * @param {import('google-auth-library').AuthClient} client
 * @param {string} spreadsheetId
 * @param {string} rangeA1
 * @param {string[][]} values
 */
async function valuesUpdate(client, spreadsheetId, rangeA1, values) {
  const url =
    `${SHEETS_API}/${encodeURIComponent(spreadsheetId)}/values/` +
    `${encodeURIComponent(rangeA1)}` +
    '?valueInputOption=RAW';
  await client.request({
    url,
    method: 'PUT',
    data: { range: rangeA1, majorDimension: 'ROWS', values },
    timeout: 20000
  });
}

/**
 * Đọc payload + revision từ Sheet SoT.
 * @returns {Promise<{ payload: object, revision: number, source: 'sheet', updatedAt: string, updatedBy: string }>}
 */
export async function getScheduleData() {
  const spreadsheetId = await getLinkedSpreadsheetId();
  requireCredentials();

  try {
    const client = await getSheetsAuthClient();
    await ensureTabs(client, spreadsheetId, [DATA_TAB, META_TAB]);

    const metaValues = await valuesGet(client, spreadsheetId, `${META_TAB}!A1:B10`);
    const meta = parseMetaValues(metaValues);
    // Đọc đủ hàng chunk (cột A); tối thiểu A1:A500 hoặc theo chunkCount meta.
    const rowEnd = Math.max(500, (meta.chunkCount || 1) + 10);
    const dataValues = await valuesGet(
      client,
      spreadsheetId,
      `${DATA_TAB}!A1:A${rowEnd}`
    );
    const payload = parseDataValues(dataValues);

    return {
      payload,
      revision: meta.revision,
      source: 'sheet',
      updatedAt: meta.updatedAt,
      updatedBy: meta.updatedBy,
      chunkCount: meta.chunkCount || (dataValues?.length ? 1 : 0)
    };
  } catch (err) {
    if (err?.status) throw err;
    throw sheetsError(err, 'Không đọc được lịch từ Google Sheet.');
  }
}

/**
 * Ghi payload với LWW + baseRevision.
 * @param {{ payload: object, baseRevision: number }} body
 * @param {{ userId: string }} actor
 */
export async function putScheduleData(body, { userId }) {
  const spreadsheetId = await getLinkedSpreadsheetId();
  requireCredentials();

  const payload =
    body?.payload && typeof body.payload === 'object' && !Array.isArray(body.payload)
      ? body.payload
      : {};
  const baseRevision = Number(body?.baseRevision);

  try {
    const client = await getSheetsAuthClient();
    await ensureTabs(client, spreadsheetId, [DATA_TAB, META_TAB]);

    const metaValues = await valuesGet(client, spreadsheetId, `${META_TAB}!A1:B10`);
    const current = parseMetaValues(metaValues);
    const { nextRevision, conflict } = resolveWriteRevision(current.revision, baseRevision);
    const updatedAt = new Date().toISOString();
    const updatedBy = String(userId || '');

    const dataRows = serializeDataRows(payload);
    const chunkCount = dataRows.length;
    // Xóa vùng cũ rộng hơn số chunk mới để không lẫn mảnh JSON cũ.
    const clearTo = Math.max(chunkCount + 20, 100);
    await valuesUpdate(
      client,
      spreadsheetId,
      `${DATA_TAB}!A1:A${clearTo}`,
      Array.from({ length: clearTo }, (_, i) => [dataRows[i]?.[0] ?? ''])
    );
    await valuesUpdate(
      client,
      spreadsheetId,
      `${META_TAB}!A1:B4`,
      serializeMetaRows({ revision: nextRevision, updatedAt, updatedBy, chunkCount })
    );

    return {
      payload,
      revision: nextRevision,
      conflict,
      source: 'sheet',
      updatedAt,
      updatedBy,
      chunkCount
    };
  } catch (err) {
    if (err?.status) throw err;
    throw sheetsError(err, 'Không ghi được lịch lên Google Sheet.');
  }
}
