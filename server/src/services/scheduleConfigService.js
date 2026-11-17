import { prisma } from '../config/db.js';
import { parseSpreadsheetId } from './spreadsheetId.js';
import { pingSpreadsheetMetadata } from './sheetsMetadataPing.js';

const SINGLETON_ID = 'default';

/**
 * @param {import('@prisma/client').DeptScheduleConfig | null} row
 */
export function toConfigPayload(row) {
  if (!row?.spreadsheetId) {
    return {
      spreadsheetId: null,
      linked: false,
      verified: false,
      title: '',
      verifiedAt: null,
      updatedAt: null
    };
  }
  return {
    spreadsheetId: row.spreadsheetId,
    linked: true,
    verified: Boolean(row.verifiedAt),
    title: row.title || '',
    verifiedAt: row.verifiedAt ? row.verifiedAt.toISOString() : null,
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null
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
