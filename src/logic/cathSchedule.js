import { asArray } from './sheetStore/tableUtils.js';
import { splitTaskCodes } from './cellOrder.js';
import { readMonthCell } from './monthSchedule.js';
import { showsBelow } from './taskDisplay.js';
import { taskForRole } from './taskMatch.js';

/** Hàng ảo chỉ để hiện nút + khi chưa có dòng task dưới lưới tuần. */
export const CATH_ADD_SLOT_KEY = '__cath_add__';

/** @deprecated Giữ để nhận dạng dữ liệu cũ (Rash/PM). */
export const CATH_HEAD_KEY = 'rash_pm';

function fold(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Dòng lưu trên sheet — chỉ giữ dòng user chọn (+) hoặc gắn lịch tháng. */
export function localCathRoles(saved) {
  return asArray(saved).filter((row) => {
    if (!row?.key || row.key === CATH_ADD_SLOT_KEY) return false;
    if (row.key === CATH_HEAD_KEY && !row.explicit) return false;
    if (row.source === 'month' || row.monthKey) return true;
    if (row.explicit) return true;
    return false;
  });
}

function linkMonthRole(entry, monthRoles) {
  const monthKey = String(entry.monthKey || entry.key || '').trim();
  const monthRole = asArray(monthRoles).find((role) => role.key === monthKey)
    || asArray(monthRoles).find((role) => fold(role.label) === fold(entry.label));
  const taskId = entry.taskId || monthRole?.taskId || null;
  const label = String(entry.label || monthRole?.label || monthKey || 'Task').trim() || 'Task';
  return {
    key: entry.key || monthKey,
    source: 'month',
    monthKey: monthKey || entry.key,
    label,
    taskId,
  };
}

/**
 * Các dòng task dưới lưới tuần — chỉ những dòng user đã chọn (+), đọc ô từ lịch tháng.
 */
export function resolveCathRoles(saved, monthRoles) {
  return localCathRoles(saved).map((entry) => {
    if (entry.source === 'month' || entry.monthKey) {
      return linkMonthRole(entry, monthRoles);
    }
    return {
      key: entry.key,
      source: entry.source || 'local',
      label: String(entry.label || 'Task').trim() || 'Task',
      taskId: entry.taskId || null,
    };
  });
}

/** Các dòng task + hàng ảo nút + ở cuối. */
export function cathRolesForWeekGrid(saved, monthRoles) {
  const roles = resolveCathRoles(saved, monthRoles);
  return [...roles, { key: CATH_ADD_SLOT_KEY, label: '', source: 'slot' }];
}

export function cathCellKey(iso, rowKey, session) {
  return `${iso}|${rowKey}|${session}`;
}

export function readCathCell(cathGrid, iso, rowKey, session) {
  return cathGrid?.[cathCellKey(iso, rowKey, session)] ?? '';
}

export function buildCathDisplayRows({ roles, days, sessions, monthGrid, cathGrid }) {
  const grid = cathGrid || {};
  return asArray(roles).map((role) => {
    if (role.key === CATH_ADD_SLOT_KEY) {
      const row = ['', '', ''];
      asArray(days).forEach(() => {
        asArray(sessions).forEach(() => row.push(''));
      });
      row.push('');
      return row;
    }
    const row = [role.label, '', ''];
    asArray(days).forEach((day) => {
      asArray(sessions).forEach((session) => {
        const key = cathCellKey(day.iso, role.key, session);
        const text = Object.prototype.hasOwnProperty.call(grid, key)
          ? grid[key]
          : (role.source === 'month'
            ? readMonthCell(monthGrid, day.iso, role.monthKey || role.key, session)
            : readCathCell(grid, day.iso, role.key, session));
        row.push(text || '');
      });
    });
    row.push('');
    return row;
  });
}

function taskForLabel(label, taskList) {
  const needle = fold(label);
  if (!needle || needle === 'task moi') return null;
  const list = taskList || [];
  return list.find(task => fold(task.code) === needle)
    || list.find(task => fold(task.name) === needle)
    || null;
}

function holdsCode(value, code, taskList) {
  const needle = fold(code);
  return splitTaskCodes(value, taskList).some(item => fold(item) === needle);
}

/**
 * Dòng local (tự gõ) hiện tên BS từ lưới tuần; dòng month lấy từ lịch tháng.
 */
export function pourCathNames({ roles, grid, staffList, taskList, days, sessions, cathGrid, assignments }) {
  const next = { ...(cathGrid || {}) };
  asArray(roles).filter(role => role && role.source !== 'month').forEach((role) => {
    const task = taskForRole(role, taskList) || taskForLabel(role.label, taskList);
    if (!task?.code || !showsBelow(task)) return;
    asArray(days).forEach((day, dayIndex) => {
      asArray(sessions).forEach((session) => {
        const assigned = assignments?.[`${task.id}|${dayIndex}|${session}`];
        const holder = assigned
          ? (staffList || []).find(person => person.shortName === assigned)
          : (staffList || []).find(person => (
            holdsCode(grid?.[person.shortName]?.[dayIndex]?.[session], task.code, taskList)
          ));
        if (!holder) return;
        next[cathCellKey(day.iso, role.key, session)] = holder.shortName;
      });
    });
  });
  return next;
}