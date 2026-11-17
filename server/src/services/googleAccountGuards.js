/**
 * Chặn gắn googleId mới khi email đã liên kết Google khác (409).
 * @param {{ googleId?: string | null } | null | undefined} existing
 * @param {string} googleId
 */
export function assertNoGoogleIdConflict(existing, googleId) {
  if (existing?.googleId && existing.googleId !== googleId) {
    const err = new Error('Email này đã liên kết với tài khoản Google khác.');
    err.status = 409;
    throw err;
  }
}
