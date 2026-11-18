/**
 * F-212 — tuần draft / published (Epic 3.6–3.8).
 * Existing sheets without status default to published (không ẩn lịch cũ với User).
 */

export const WEEK_STATUS_DRAFT = 'draft';
export const WEEK_STATUS_PUBLISHED = 'published';

export function normalizeWeekPublishStatus(value) {
  return value === WEEK_STATUS_DRAFT ? WEEK_STATUS_DRAFT : WEEK_STATUS_PUBLISHED;
}

/** Active week status on sheet (+ weeks[startDate] if present). */
export function weekPublishStatusOf(sheet) {
  if (!sheet) return WEEK_STATUS_PUBLISHED;
  const fromWeek = sheet.startDate && sheet.weeks?.[sheet.startDate]?.publishStatus;
  if (fromWeek) return normalizeWeekPublishStatus(fromWeek);
  if (sheet.publishStatus) return normalizeWeekPublishStatus(sheet.publishStatus);
  // Legacy sheets: treat as published so User không mất lịch hiện có.
  return WEEK_STATUS_PUBLISHED;
}

export function isWeekPublished(sheet) {
  return weekPublishStatusOf(sheet) === WEEK_STATUS_PUBLISHED;
}

/**
 * Mod/Admin (và seed local admin) xem được draft; User/member chỉ thấy published.
 */
export function canViewWeekDraft(user, actor) {
  const role = String(user?.role || '');
  if (role === 'Admin' || role === 'Mod') return true;
  if (actor?.kind === 'admin') return true;
  return false;
}

export function shouldMaskWeekForViewer(sheet, user, actor) {
  if (isWeekPublished(sheet)) return false;
  return !canViewWeekDraft(user, actor);
}

export function appendWeekAudit(sheet, entry) {
  const auditLog = Array.isArray(sheet?.auditLog) ? sheet.auditLog.slice() : [];
  auditLog.push({
    at: entry.at || new Date().toISOString(),
    by: entry.by || '',
    action: entry.action,
    weekStart: entry.weekStart || sheet?.startDate || '',
    note: entry.note || ''
  });
  return auditLog;
}

/**
 * Set publish status on active week + weeks[startDate] snapshot.
 */
export function withWeekPublishStatus(sheet, status, auditEntry) {
  const nextStatus = normalizeWeekPublishStatus(status);
  const weeks = { ...(sheet.weeks || {}) };
  if (sheet.startDate) {
    weeks[sheet.startDate] = {
      ...(weeks[sheet.startDate] || {}),
      publishStatus: nextStatus
    };
  }
  const next = {
    ...sheet,
    publishStatus: nextStatus,
    weeks
  };
  if (auditEntry) {
    next.auditLog = appendWeekAudit(sheet, {
      ...auditEntry,
      action: auditEntry.action || (nextStatus === WEEK_STATUS_PUBLISHED ? 'publish' : 'unpublish'),
      weekStart: sheet.startDate
    });
  }
  return next;
}
