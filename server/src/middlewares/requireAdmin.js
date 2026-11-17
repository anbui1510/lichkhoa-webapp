import { ROLE_ADMIN } from '../services/adminBootstrap.js';

/** Chỉ cho phép user `role=Admin` (SoT server). */
export function requireAdmin(req, res, next) {
  if (String(req.user?.role || '') !== ROLE_ADMIN) {
    return res.status(403).json({
      error: 'Chỉ Admin được phép thực hiện thao tác này.'
    });
  }
  return next();
}
