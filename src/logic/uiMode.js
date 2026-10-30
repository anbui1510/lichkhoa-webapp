/** localStorage key to force mobile or desktop chrome. */
export const UI_MODE_STORAGE_KEY = 'lichkhoa_ui_mode';

/** Default breakpoint for phone / narrow tablets (px). */
export const MOBILE_BREAKPOINT_PX = 768;

/**
 * @param {{ width: number, forced?: string|null }} input
 * @returns {'mobile'|'desktop'}
 */
export function resolveUiMode({ width, forced } = {}) {
  const mode = String(forced || '').trim().toLowerCase();
  if (mode === 'mobile' || mode === 'desktop') return mode;
  const w = Number(width);
  if (!Number.isFinite(w)) return 'desktop';
  return w <= MOBILE_BREAKPOINT_PX ? 'mobile' : 'desktop';
}

export function readForcedUiMode(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  try {
    return storage?.getItem(UI_MODE_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function writeForcedUiMode(mode, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  try {
    if (!storage) return;
    if (mode === 'mobile' || mode === 'desktop') storage.setItem(UI_MODE_STORAGE_KEY, mode);
    else storage.removeItem(UI_MODE_STORAGE_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}
