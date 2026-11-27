import { listTenantRegistry } from '../../config/tenant.js';

const ACTIVE_KHOA_SLUG_KEY = 'LICHKHOA_ACTIVE_KHOA_SLUG';

export function getKhoaRegistry() {
  return listTenantRegistry();
}

export function getActiveKhoaSlug() {
  try {
    return String(localStorage.getItem(ACTIVE_KHOA_SLUG_KEY) || '').trim().toLowerCase();
  } catch {
    return '';
  }
}

export function getActiveKhoaEntry() {
  const registry = getKhoaRegistry();
  if (!registry.length) return null;
  const slug = getActiveKhoaSlug();
  const found = slug ? registry.find((e) => e.slug === slug) : null;
  return found || registry[0];
}

export function setActiveKhoaSlug(slug) {
  const key = String(slug || '').trim().toLowerCase();
  if (!key) return;
  try {
    localStorage.setItem(ACTIVE_KHOA_SLUG_KEY, key);
  } catch {
    /* ignore */
  }
}

/** @returns {{ slug, label, spreadsheetId } | null} */
export function resolveKhoaEntry(slug) {
  const key = String(slug || '').trim().toLowerCase();
  return getKhoaRegistry().find((e) => e.slug === key) || null;
}