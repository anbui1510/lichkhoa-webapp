import { sheetBridge } from './sheetBridge';
import { hospitalCatalogSpreadsheetId } from '../../config/hospitalCatalog';

const PAGE_LIMIT = 40;

/**
 * Quét toàn bộ catalog (nhiều trang) — chỉ khoa user có trong NhanSu.
 * @returns {Promise<Array<{ slug: string, label: string, spreadsheetId: string, actorKind?: string }>>}
 */
export async function discoverAllAccessibleKhoas() {
  const catalogSpreadsheetId = hospitalCatalogSpreadsheetId();
  if (!catalogSpreadsheetId) return [];

  const merged = [];
  let offset = 0;
  let guard = 0;
  while (guard < 200) {
    guard += 1;
    const page = await sheetBridge.discoverKhoas({
      catalogSpreadsheetId,
      offset,
      limit: PAGE_LIMIT,
    });
    const batch = Array.isArray(page?.khoas) ? page.khoas : [];
    batch.forEach((k) => {
      if (!merged.some((m) => m.spreadsheetId === k.spreadsheetId)) merged.push(k);
    });
    if (page?.nextOffset == null || page.nextOffset === '') break;
    offset = Number(page.nextOffset) || offset + PAGE_LIMIT;
  }
  return merged;
}