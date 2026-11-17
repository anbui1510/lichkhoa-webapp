/** Vai trò trên Prisma User.role / RosterPerson.role (SoT auth Phase Nội). */
export const ROLE_ADMIN = 'Admin';
export const ROLE_MOD = 'Mod';
export const ROLE_USER = 'User';

export const ROSTER_ROLES = Object.freeze([ROLE_ADMIN, ROLE_MOD, ROLE_USER]);

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
 * Chính sách Google login + Admin bootstrap (F-102 + F-105).
 *
 * - Email ∈ allowlist → cho phép, grant Admin
 * - Chưa có Admin nào → first-user wins → grant Admin
 * - User đã là Admin → cho phép, giữ Admin
 * - Đã có Admin + ngoài allowlist + chưa Admin → cho phép pending (role ""), không grant Admin
 *   (F-105 supersedes F-102 BR-102-03 403)
 *
 * @param {{ email: string, existingRole?: string | null, adminCount: number, allowlist?: string[] }} input
 * @returns {{ allowed: boolean, grantAdmin: boolean, pending?: boolean, reason?: string }}
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
    allowed: true,
    grantAdmin: false,
    pending: true
  };
}

/** @param {string} role */
export function isRosterRole(role) {
  return ROSTER_ROLES.includes(String(role || ''));
}

/** Admin hoặc Mod → full quyền lịch (access.js). */
export function isFullAccessRole(role) {
  const r = String(role || '');
  return r === ROLE_ADMIN || r === ROLE_MOD;
}
