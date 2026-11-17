/** Vai trò Admin trên Prisma User.role (SoT auth Phase Nội). */
export const ROLE_ADMIN = 'Admin';

/**
 * Parse CSV env BOOTSTRAP_ADMIN_EMAILS → danh sách email lowercase.
 * @param {string | undefined} raw
 * @returns {string[]}
 */
export function parseBootstrapAdminEmails(raw = process.env.BOOTSTRAP_ADMIN_EMAILS) {
  return String(raw || '')
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Chính sách Q1=C: cho phép đăng nhập Google và có được gán/giữ Admin không.
 *
 * - Email ∈ allowlist → cho phép, grant Admin
 * - Chưa có Admin nào → first-user wins (kể cả ngoài allowlist) → grant Admin
 * - User đã là Admin → cho phép, giữ Admin
 * - Đã có Admin + ngoài allowlist + chưa Admin → từ chối
 *
 * @param {{ email: string, existingRole?: string | null, adminCount: number, allowlist?: string[] }} input
 * @returns {{ allowed: boolean, grantAdmin: boolean, reason?: string }}
 */
export function resolveGoogleAdminBootstrap({
  email,
  existingRole = '',
  adminCount,
  allowlist = parseBootstrapAdminEmails()
}) {
  const normalized = String(email || '').trim().toLowerCase();
  const isExistingAdmin = String(existingRole || '') === ROLE_ADMIN;
  const inAllowlist = allowlist.includes(normalized);
  const noAdminYet = Number(adminCount) <= 0;

  if (isExistingAdmin) {
    return { allowed: true, grantAdmin: true };
  }
  if (inAllowlist) {
    return { allowed: true, grantAdmin: true };
  }
  if (noAdminYet) {
    return { allowed: true, grantAdmin: true };
  }
  return {
    allowed: false,
    grantAdmin: false,
    reason: 'Email này không được phép đăng nhập Admin. Liên hệ quản trị khoa hoặc thêm vào BOOTSTRAP_ADMIN_EMAILS.'
  };
}
