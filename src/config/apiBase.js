/**
 * Base URL gọi API tài khoản / lịch.
 * Dev: mặc định `/api` (Vite proxy → :4000).
 * Pages/prod: cần `VITE_API_BASE=https://…/api` — không thì POST `/api` trên Pages trả 405.
 */
function readVite(key) {
  try {
    return import.meta.env?.[key];
  } catch {
    return undefined;
  }
}

export function getApiBase() {
  const raw = String(readVite('VITE_API_BASE') || '/api').trim();
  return raw.replace(/\/+$/, '') || '/api';
}

/** Có API thật cho login mật khẩu? (dev proxy hoặc URL tuyệt đối đã build). */
export function isPasswordApiConfigured() {
  if (readVite('DEV')) return true;
  return /^https?:\/\//i.test(String(readVite('VITE_API_BASE') || '').trim());
}
