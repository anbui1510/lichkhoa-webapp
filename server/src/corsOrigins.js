/**
 * F-305 — CORS cho nhiều Cloudflare Pages (mỗi khoa một origin).
 * Env (ưu tiên):
 * - CLIENT_ORIGINS: danh sách origin, phân tách dấu phẩy hoặc xuống dòng
 * - CLIENT_ORIGIN_SUFFIX: host suffix, vd. -lichkhoa-webapp.pages.dev → https://{slug}...
 * - CLIENT_ORIGIN: một origin (legacy)
 */
const LOCAL_DEV = new Set(['http://localhost:5173', 'http://127.0.0.1:5173']);

function splitOrigins(raw) {
  return String(raw || '')
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function buildCorsAllowlist(env = process.env) {
  const exact = new Set(LOCAL_DEV);
  splitOrigins(env.CLIENT_ORIGINS).forEach((o) => exact.add(o));

  const single = String(env.CLIENT_ORIGIN || '').trim();
  if (single) exact.add(single);

  const suffix = String(env.CLIENT_ORIGIN_SUFFIX || '').trim().toLowerCase();
  const suffixes = suffix ? [suffix.startsWith('.') ? suffix : `.${suffix.replace(/^\./, '')}`] : [];

  return { exact, suffixes };
}

export function isOriginAllowed(origin, allowlist = buildCorsAllowlist()) {
  const o = String(origin || '').trim();
  if (!o) return false;
  if (allowlist.exact.has(o)) return true;

  try {
    const url = new URL(o);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    const host = url.host.toLowerCase();
    for (const suf of allowlist.suffixes) {
      const withDot = suf.startsWith('.') ? suf : `.${suf.replace(/^\./, '')}`;
      const withDash = withDot.startsWith('.-') ? withDot.slice(1) : withDot;
      if (host.endsWith(withDash)) return true;
      if (withDash.startsWith('-') && host === withDash.slice(1)) return true;
    }
  } catch {
    return false;
  }
  return false;
}

/** @returns {(origin: string, callback: (err: Error | null, allow?: boolean) => void) => void} */
export function createCorsOriginValidator(env = process.env) {
  const allowlist = buildCorsAllowlist(env);
  return (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    callback(null, isOriginAllowed(origin, allowlist));
  };
}
