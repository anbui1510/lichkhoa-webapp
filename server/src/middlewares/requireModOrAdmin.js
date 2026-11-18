import { isFullAccessRole } from '../services/adminBootstrap.js';

/** Chỉ Admin hoặc Mod được ghi lịch Sheet SoT (F-210). */
export function requireModOrAdmin(req, res, next) {
  if (!isFullAccessRole(req.user?.role)) {
    return res.status(403).json({
      error: 'Chỉ Admin hoặc Mod được ghi lịch lên Google Sheet.'
    });
  }
  return next();
}
