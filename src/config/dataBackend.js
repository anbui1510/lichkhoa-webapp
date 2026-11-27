function viteEnv(key, fallback = '') {
  try {
    return import.meta.env?.[key] ?? fallback;
  } catch {
    return fallback;
  }
}

export function isSheetBackend() {
  const mode = String(viteEnv('VITE_DATA_BACKEND', 'sheet')).trim().toLowerCase();
  return mode === 'sheet';
}

export function isApiBackend() {
  return !isSheetBackend();
}
