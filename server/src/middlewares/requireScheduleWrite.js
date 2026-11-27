import { isFullAccessRole, ROLE_USER } from '../services/adminBootstrap.js';
import { getScheduleConfig } from '../services/scheduleConfigService.js';
import { isLeaveWindowOpen } from '../../../src/logic/editWindows.js';

/**
 * Admin/Mod luôn được ghi; User chỉ khi cửa sổ nghỉ còn mở (F-214).
 * @param {string} role
 * @param {{ leaveLockAt?: unknown } | null | undefined} config
 * @param {Date} [now]
 */
export function mayWriteSchedule(role, config, now = new Date()) {
  if (isFullAccessRole(role)) return true;
  if (String(role || '') === ROLE_USER) return isLeaveWindowOpen(config, now);
  return false;
}

/**
 * F-210 + F-214: Admin/Mod luôn ghi SoT; User chỉ khi cửa sổ nghỉ còn mở.
 */
export async function requireScheduleWrite(req, res, next) {
  if (isFullAccessRole(req.user?.role)) {
    return next();
  }

  if (String(req.user?.role || '') === ROLE_USER) {
    try {
      const config = await getScheduleConfig();
      if (mayWriteSchedule(req.user.role, config)) {
        return next();
      }
      return res.status(403).json({
        error: 'Đã khóa lịch nghỉ. Liên hệ Mod để chỉnh giúp.'
      });
    } catch (error) {
      return res.status(error.status || 500).json({
        error: error.message || 'Không kiểm tra được cửa sổ khóa nghỉ.'
      });
    }
  }

  return res.status(403).json({
    error: 'Chỉ Admin hoặc Mod được ghi lịch lên Google Sheet.'
  });
}
