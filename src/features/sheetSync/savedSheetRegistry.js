import { parseSpreadsheetId } from '../../logic/sheetStore/parseSpreadsheetId.js';

const STORAGE_KEY = 'LICHKHOA_SAVED_SHEETS';
const MAX_ENTRIES = 32;

function readRaw() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

function normalizeEntry(raw) {
  const spreadsheetId = parseSpreadsheetId(raw?.spreadsheetId || raw?.id || '');
  if (!spreadsheetId) return null;
  const label = String(raw?.label || '').trim();
  const lastUsedAt = Number(raw?.lastUsedAt) || 0;
  return { spreadsheetId, label, lastUsedAt };
}

/** Sổ đã từng dùng trên trình duyệt này (chế độ 0 — không VITE_TENANT_REGISTRY). */
export function listSavedSheets() {
  return readRaw()
    .map(normalizeEntry)
    .filter(Boolean)
    .sort((a, b) => b.lastUsedAt - a.lastUsedAt);
}

export function rememberSavedSheet(spreadsheetId, label) {
  const id = parseSpreadsheetId(spreadsheetId);
  if (!id) return;
  const name = String(label || '').trim();
  const now = Date.now();
  const existing = readRaw().map(normalizeEntry).filter(Boolean);
  const prev = existing.find((e) => e.spreadsheetId === id);
  const entry = {
    spreadsheetId: id,
    label: name || prev?.label || '',
    lastUsedAt: now,
  };
  const list = existing.filter((e) => e.spreadsheetId !== id);
  list.unshift(entry);
  writeRaw(list.slice(0, MAX_ENTRIES));
}

export function savedSheetShareUrl(spreadsheetId) {
  const id = parseSpreadsheetId(spreadsheetId);
  if (!id || typeof window === 'undefined') return '';
  const base = `${window.location.origin}${window.location.pathname || '/'}`;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}sheet=${encodeURIComponent(id)}`;
}