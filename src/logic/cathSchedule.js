import { asArray } from './sheetStore/tableUtils.js';
import { splitTaskCodes } from './cellOrder.js';
import { readMonthCell } from './monthSchedule.js';
import { showsBelow } from './taskDisplay.js';
import { taskForRole } from './taskMatch.js';
import { showsOnWeek } from './taskDisplay.js';

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

/** Key từng inject mặc định dưới lưới tuần (trước picker +). */
export const LEGACY_AUTO_CATH_KEYS = new Set([
  CATH_HEAD_KEY,
  'tt_chinh', 'tt_phu', 'ttcc', 'ttcc_chinh', 'ttcc_phu',
  'tc', 'sn', 'ro', 'sa', 'truc_chinh', 'truc_kem', 'cot1',
]);

/** Dòng lịch tháng chỉ hiển thị ở hàng task dưới — không pour lên hàng bác sĩ (F-201). */
export const MONTH_CATH_ONLY_KEYS = new Set([
  CATH_HEAD_KEY,
  'tt_chinh', 'tt_phu', 'ttcc', 'ttcc_chinh', 'ttcc_phu',
]);

/** Chuẩn hóa key/label để khớp tt_chinh ↔ «TT chính», ttcc_phu ↔ «TTCC phụ/Rask/PM». */
export function cathOnlySignature(value) {
  return fold(value).replace(/[^a-z0-9]+/g, '');
}

const MONTH_CATH_ONLY_SIGS = new Set([
  'rashpm',
  'ttchinh',
  'ttphu',
  'ttcc',
  'ttccchinh',
  'ttccphu',
  'ttccpphuraskpm',
  'ttccphuraskpm',
]);

export function isCathOnlyRoleLabelOrKey(value) {
  const sig = cathOnlySignature(value);
  if (!sig) return false;
  if (MONTH_CATH_ONLY_SIGS.has(sig)) return true;
  if (sig.startsWith('ttcc')) return true;
  if (sig === 'ttchinh' || sig === 'ttphu') return true;
  // «TT chính», «TT phụ» (có khoảng trắng đã bỏ)
  if (sig.startsWith('ttchinh') || sig.startsWith('ttphu')) return true;
  return false;
}

/** Dòng lưu trên sheet — chỉ `explicit: true` (đã bấm + chọn task/dòng tháng). */
export function localCathRoles(saved) {
  return asArray(saved).filter((row) => {
    if (!row?.key || row.key === CATH_ADD_SLOT_KEY) return false;
    if (!row.explicit) return false;
    if (row.key === CATH_HEAD_KEY) return false;
    return true;
  });
}

/** Gỡ ô cathGrid của dòng đã bỏ. */
export function pruneCathGrid(cathGrid, cathRoles) {
  const keep = new Set(asArray(cathRoles).map((row) => row.key).filter(Boolean));
  const next = { ...(cathGrid || {}) };
  Object.keys(next).forEach((cellKey) => {
    const rowKey = String(cellKey).split('|')[1] || '';
    if (rowKey && !keep.has(rowKey)) delete next[cellKey];
  });
  return next;
}

/** Migrate dữ liệu cũ (Rash/PM, TT… tự sinh) → chỉ dòng explicit. */
export function normalizePersistedCathRoles(saved, cathGrid) {
  const cathRoles = localCathRoles(saved);
  return {
    cathRoles,
    cathGrid: pruneCathGrid(cathGrid, cathRoles),
  };
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

/** Khớp monthKey dòng tuần với khóa ô lịch tháng (kể cả đổi key nhưng giữ label). */
export function cathMonthKeyForRole(role, monthRoles = []) {
  const monthKey = String(role?.monthKey || role?.key || '').trim();
  if (!monthKey) return monthKey;
  const list = asArray(monthRoles);
  if (list.some((item) => item.key === monthKey)) return monthKey;
  const label = fold(role?.label);
  const byLabel = list.find((item) => fold(item.label) === label);
  return byLabel?.key || monthKey;
}

/**
 * true = bỏ pour lên hàng BS (chỉ hàng task dưới).
 * TT/TTCC: nếu task bật Hiển thị «Lịch Tuần» (display week/both) thì vẫn đổ lên ô BS.
 */
export function monthRoleUsesCathRow(role, cathRoles, monthRoles, taskList) {
  const task = taskForRole(role, taskList);
  if (task && showsOnWeek(task)) return false;

  const key = cathMonthKeyForRole(role, monthRoles);
  if (!key) return false;
  if (MONTH_CATH_ONLY_KEYS.has(fold(key))) return true;
  if (isCathOnlyRoleLabelOrKey(key) || isCathOnlyRoleLabelOrKey(role?.label)) return true;
  if (asArray(cathRoles).some((row) => {
    const rowKey = cathMonthKeyForRole(row, monthRoles);
    if (rowKey === key) return true;
    return isCathOnlyRoleLabelOrKey(row?.label) && isCathOnlyRoleLabelOrKey(role?.label)
      && cathOnlySignature(row.label) === cathOnlySignature(role.label);
  })) return true;
  return !!(task && !showsOnWeek(task));
}

/** Token ô tuần là nhãn TT/TTCC (không phải mã task khoa như H, VG). */
export function isCathOnlyWeekToken(token, monthRoles = [], cathRoles = []) {
  if (isCathOnlyRoleLabelOrKey(token)) return true;
  const sig = cathOnlySignature(token);
  if (!sig) return false;
  const labels = [
    ...asArray(monthRoles).map((role) => role.label || role.key),
    ...asArray(cathRoles).map((role) => role.label || role.monthKey || role.key),
  ];
  return labels.some((label) => {
    if (!isCathOnlyRoleLabelOrKey(label) && !MONTH_CATH_ONLY_KEYS.has(fold(label))) return false;
    return cathOnlySignature(label) === sig;
  });
}

function escapeReg(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Gỡ cụm «TT chính/phụ/TTCC…» khỏi ô (kể cả khi splitTaskCodes chỉ còn token «TT»). */
export function scrubCathPhrasesFromCell(raw, monthRoles = [], cathRoles = []) {
  let text = String(raw || '');
  if (!text.trim()) return text;
  const phrases = new Set([
    'TT chính',
    'TT phụ',
    'TTCC chính',
    'TTCC phụ',
    'TTCC phụ/Rask/PM',
    'Rash/PM',
  ]);
  asArray(monthRoles).forEach((role) => {
    if (isCathOnlyRoleLabelOrKey(role.label) || isCathOnlyRoleLabelOrKey(role.key)) {
      if (role.label) phrases.add(String(role.label).trim());
    }
  });
  asArray(cathRoles).forEach((role) => {
    if (isCathOnlyRoleLabelOrKey(role.label) || isCathOnlyRoleLabelOrKey(role.key) || isCathOnlyRoleLabelOrKey(role.monthKey)) {
      if (role.label) phrases.add(String(role.label).trim());
    }
  });
  [...phrases]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .forEach((phrase) => {
      text = text.replace(new RegExp(escapeReg(phrase), 'gi'), ' ');
    });
  text = text
    .replace(/\bTTCC\b/gi, ' ')
    .replace(/[,;|/]+/g, ',')
    .replace(/\s+,/g, ',')
    .replace(/,\s*/g, ', ')
    .replace(/^[,\s]+|[,\s]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return text;
}

function keepCathTokenOnWeek(token, monthRoles, taskList) {
  const sig = cathOnlySignature(token);
  if (!sig) return false;
  const role = asArray(monthRoles).find((item) => (
    cathOnlySignature(item.label) === sig || cathOnlySignature(item.key) === sig
  )) || { key: token, label: token };
  const task = taskForRole(role, taskList) || asArray(taskList).find((item) => (
    cathOnlySignature(item.code) === sig
  ));
  return !!(task && showsOnWeek(task));
}

/** Phrases to strip — bỏ qua label task đang bật Hiển thị Lịch Tuần. */
function scrubableCathPhrases(monthRoles, cathRoles, taskList) {
  const phrases = new Set([
    'TT chính',
    'TT phụ',
    'TTCC chính',
    'TTCC phụ',
    'TTCC phụ/Rask/PM',
    'Rash/PM',
  ]);
  asArray(monthRoles).forEach((role) => {
    if (isCathOnlyRoleLabelOrKey(role.label) || isCathOnlyRoleLabelOrKey(role.key)) {
      if (role.label) phrases.add(String(role.label).trim());
    }
  });
  asArray(cathRoles).forEach((role) => {
    if (isCathOnlyRoleLabelOrKey(role.label) || isCathOnlyRoleLabelOrKey(role.key) || isCathOnlyRoleLabelOrKey(role.monthKey)) {
      if (role.label) phrases.add(String(role.label).trim());
    }
  });
  return [...phrases].filter((phrase) => !keepCathTokenOnWeek(phrase, monthRoles, taskList));
}

/** Gỡ nhãn TT/TTCC trên hàng BS — trừ khi task bật Hiển thị Lịch Tuần. */
export function scrubCathTokensFromWeekGrid(grid, staffList, taskList, monthRoles, cathRoles) {
  let changed = false;
  const next = { ...(grid || {}) };
  const dropPhrases = scrubableCathPhrases(monthRoles, cathRoles, taskList)
    .sort((a, b) => b.length - a.length);
  asArray(staffList).forEach((person) => {
    const name = person.shortName;
    const row = next[name];
    if (!row) return;
    const copy = { ...row };
    let rowChanged = false;
    for (let day = 0; day < 7; day += 1) {
      const cell = copy[day];
      if (!cell || typeof cell !== 'object') continue;
      const cellCopy = { ...cell };
      let cellChanged = false;
      ['S', 'R', 'C', 'T'].forEach((session) => {
        const raw = cellCopy[session];
        if (!String(raw || '').trim()) return;
        let text = String(raw);
        dropPhrases.forEach((phrase) => {
          text = text.replace(new RegExp(escapeReg(phrase), 'gi'), ' ');
        });
        text = text
          .replace(/\bTTCC\b/gi, (match) => (keepCathTokenOnWeek(match, monthRoles, taskList) ? match : ' '))
          .replace(/[,;|/]+/g, ',')
          .replace(/\s+,/g, ',')
          .replace(/,\s*/g, ', ')
          .replace(/^[,\s]+|[,\s]+$/g, '')
          .replace(/\s{2,}/g, ' ')
          .trim();
        const kept = splitTaskCodes(text, taskList).filter((token) => (
          !isCathOnlyWeekToken(token, monthRoles, cathRoles)
          || keepCathTokenOnWeek(token, monthRoles, taskList)
        ));
        const nextVal = kept.join(', ');
        if (nextVal === String(raw || '').trim()) return;
        cellCopy[session] = nextVal;
        cellChanged = true;
      });
      if (cellChanged) {
        copy[day] = cellCopy;
        rowChanged = true;
      }
    }
    if (rowChanged) {
      next[name] = copy;
      changed = true;
    }
  });
  return { grid: changed ? next : grid, changed };
}

export function buildCathDisplayRows({ roles, days, sessions, monthGrid, cathGrid, monthRoles }) {
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
    const monthKey = role.source === 'month' ? cathMonthKeyForRole(role, monthRoles) : '';
    const row = [role.label, '', ''];
    asArray(days).forEach((day) => {
      asArray(sessions).forEach((session) => {
        const key = cathCellKey(day.iso, role.key, session);
        const text = Object.prototype.hasOwnProperty.call(grid, key)
          ? grid[key]
          : (role.source === 'month'
            ? readMonthCell(monthGrid, day.iso, monthKey, session)
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