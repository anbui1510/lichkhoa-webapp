import { prisma } from '../config/db.js';
import { parseSpreadsheetId } from './spreadsheetId.js';
import { pingSpreadsheetMetadata } from './sheetsMetadataPing.js';
import { hasSheetsCredentials } from './sheetsAuth.js';
import { parseLockAt } from '../../../src/logic/editWindows.js';

const SINGLETON_ID = 'default';

function lockAtToIso(value) {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  const d = parseLockAt(value);
  return d ? d.toISOString() : null;
}

/**
 * Parse body field: undefined = không đổi (caller quyết); null/'' = clear; ISO = Date.
 * @param {unknown} raw
 * @param {string} label
 * @returns {Date | null}
 */
export function parseLockAtInput(raw, label = 'Thời điểm khóa') {
  if (raw == null || raw === '') return null;
  const d = parseLockAt(raw);
  if (!d) {
    const err = new Error(`${label} không hợp lệ. Dùng định dạng ISO (ví dụ 2026-11-30T17:00:00.000Z).`);
    err.status = 400;
    throw err;
  }
  return d;
}

/**
 * @param {import('@prisma/client').DeptScheduleConfig | null} row
 */
export function toConfigPayload(row) {
  const sheetsCredentialsConfigured = hasSheetsCredentials();
  const leaveLockAt = lockAtToIso(row?.leaveLockAt);
  const monthLockAt = lockAtToIso(row?.monthLockAt);
  if (!row?.spreadsheetId) {
    return {
      spreadsheetId: null,
      linked: false,
      verified: false,
      title: '',
      verifiedAt: null,
      updatedAt: row?.updatedAt ? row.updatedAt.toISOString() : null,
      leaveLockAt,
      monthLockAt,
      sheetsCredentialsConfigured,
      syncReady: false
    };
  }
  return {
    spreadsheetId: row.spreadsheetId,
    linked: true,
    verified: Boolean(row.verifiedAt),
    title: row.title || '',
    verifiedAt: row.verifiedAt ? row.verifiedAt.toISOString() : null,
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
    leaveLockAt,
    monthLockAt,
    sheetsCredentialsConfigured,
    syncReady: sheetsCredentialsConfigured
  };
}

export async function getScheduleConfig() {
  const row = await prisma.deptScheduleConfig.findUnique({ where: { id: SINGLETON_ID } });
  return toConfigPayload(row);
}

/**
 * Lưu liên kết Spreadsheet (Admin). Format bắt buộc; ping nếu có credentials.
 * @param {{ spreadsheetId?: string, spreadsheetIdOrUrl?: string }} body
 * @param {{ userId: string }} actor
 */
export async function saveScheduleConfig(body, { userId }) {
  // Dùng || để chuỗi rỗng spreadsheetIdOrUrl không che spreadsheetId.
  const raw = String(body?.spreadsheetIdOrUrl || body?.spreadsheetId || '').trim();
  const parsed = parseSpreadsheetId(raw);
  if (!parsed.ok) {
    const err = new Error(parsed.error);
    err.status = 400;
    throw err;
  }

  const ping = await pingSpreadsheetMetadata(parsed.spreadsheetId);
  if (ping.skipped !== true && ping.ok === false) {
    const err = new Error(ping.error);
    err.status = 422;
    throw err;
  }

  const existing = await prisma.deptScheduleConfig.findUnique({ where: { id: SINGLETON_ID } });
  const verified = ping.skipped !== true && ping.ok === true;
  // Khi skip ping: giữ title/verifiedAt nếu cùng spreadsheetId; không xóa verification cũ.
  let title = '';
  let verifiedAt = null;
  if (verified) {
    title = ping.title || '';
    verifiedAt = new Date();
  } else if (existing?.spreadsheetId === parsed.spreadsheetId) {
    title = existing.title || '';
    verifiedAt = existing.verifiedAt || null;
  }

  const row = await prisma.deptScheduleConfig.upsert({
    where: { id: SINGLETON_ID },
    create: {
      id: SINGLETON_ID,
      spreadsheetId: parsed.spreadsheetId,
      title,
      verifiedAt,
      leaveLockAt: existing?.leaveLockAt ?? null,
      monthLockAt: existing?.monthLockAt ?? null,
      updatedById: userId
    },
    update: {
      spreadsheetId: parsed.spreadsheetId,
      title,
      verifiedAt,
      updatedById: userId
    }
  });

  return toConfigPayload(row);
}

/**
 * F-214 — Admin lưu hạn khóa nghỉ / tháng.
 * @param {{ leaveLockAt?: unknown, monthLockAt?: unknown }} body
 * @param {{ userId: string }} actor
 */
export async function saveLockWindows(body, { userId }) {
  const hasLeave = Object.prototype.hasOwnProperty.call(body || {}, 'leaveLockAt');
  const hasMonth = Object.prototype.hasOwnProperty.call(body || {}, 'monthLockAt');
  if (!hasLeave && !hasMonth) {
    const err = new Error('Cần ít nhất một trong leaveLockAt hoặc monthLockAt.');
    err.status = 400;
    throw err;
  }

  const existing = await prisma.deptScheduleConfig.findUnique({ where: { id: SINGLETON_ID } });
  const leaveLockAt = hasLeave
    ? parseLockAtInput(body.leaveLockAt, 'Hạn khóa lịch nghỉ')
    : existing?.leaveLockAt ?? null;
  const monthLockAt = hasMonth
    ? parseLockAtInput(body.monthLockAt, 'Hạn khóa lịch tháng')
    : existing?.monthLockAt ?? null;

  const row = await prisma.deptScheduleConfig.upsert({
    where: { id: SINGLETON_ID },
    create: {
      id: SINGLETON_ID,
      spreadsheetId: existing?.spreadsheetId || '',
      title: existing?.title || '',
      verifiedAt: existing?.verifiedAt || null,
      leaveLockAt,
      monthLockAt,
      updatedById: userId
    },
    update: {
      leaveLockAt,
      monthLockAt,
      updatedById: userId
    }
  });

  return toConfigPayload(row);
}
