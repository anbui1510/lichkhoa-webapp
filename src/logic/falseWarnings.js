/**
 * F-211 / Epic 3.4 — giảm cảnh báo giả (OQ-1 subset sprint).
 * Chỉ lọc các pattern đã chốt; không tắt cảnh báo thật khi phòng trống.
 */

/**
 * @param {string[]} warnings
 * @param {{ grid?: object, staffList?: object[], taskList?: object[], days?: object[], sessions?: string[] }} ctx
 */
export function filterFalseScheduleWarnings(warnings, ctx = {}) {
  const list = Array.isArray(warnings) ? warnings : [];
  if (!list.length) return list;

  // Drop "chưa chọn Trách nhiệm" when the task code already sits on the grid for open slots.
  return list.filter((message) => {
    const m = String(message || '').match(/^Task (.+) có ngày cố định nhưng chưa chọn Trách nhiệm\.$/);
    if (!m) return true;
    const code = m[1];
    const { grid, staffList, taskList } = ctx;
    if (!grid || !staffList?.length) return true;
    const placed = (staffList || []).some(person => {
      const row = grid[person.shortName] || {};
      return Object.values(row).some((day) => {
        if (!day || typeof day !== 'object') return false;
        return ['S', 'R', 'C', 'T'].some(session => {
          const cell = String(day[session] || '');
          return cell.split(/[,;/|\s]+/).some(part => part.trim() === code);
        });
      });
    });
    // If already placed somewhere, the "no owner" line is noise.
    return !placed;
  });
}
