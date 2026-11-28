export function taskOptionLabel(task) {
  return `${task.code} — ${task.name}`;
}

export function matchTask(raw, tasks = []) {
  const text = compactLabel(raw);
  if (!text) return null;
  return tasks.find(task => {
    const code = compactLabel(task.code);
    const name = compactLabel(task.name);
    return text === code || text === name || text === `${code} - ${name}`;
  }) || null;
}

export function roleShortLabel(role, tasks = []) {
  const task = taskForRole(role, tasks);
  if (task?.code) return String(task.code);
  const label = String(role?.label || '').trim();
  const code = label.split(/\s*[—–−-]\s+/)[0];
  if (code && code !== label && !/\s/.test(code)) return code;
  return label;
}

function compactLabel(value) {
  return String(value || '').trim().toLowerCase().replace(/\s*[—–−-]\s*/g, ' - ');
}

function foldDuty(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Dòng lịch tháng trực chính — khớp task TC + encodeDuty kể cả label «Trực Chính». */
function taskForMonthDutyRole(role, tasks = []) {
  const key = foldDuty(role?.key);
  if (key !== 'truc_chinh' && key !== 'tc') return null;
  return (tasks || []).find((task) => {
    if (!task?.encodeDuty) return false;
    const code = foldDuty(task.code);
    const name = foldDuty(task.name);
    return code === 'tc' || name.includes('truc chinh');
  }) || null;
}

import { MONTH_ROLES } from './monthSchedule.js';

const TASK_CODE_MONTH_KEY = {
  tc: 'truc_chinh',
  c1: 'cot1',
  cot1: 'cot1',
  sn: 'sn',
  ro: 'ro',
  sa: 'sa',
};

/** Khóa dòng lịch tháng ổn định khi gắn từ task khoa (pour tuần đọc đúng role). */
export function monthRoleFromTask(task) {
  if (!task?.code) return null;
  const code = String(task.code).trim().toLowerCase();
  const fromCode = TASK_CODE_MONTH_KEY[code];
  const preset = MONTH_ROLES.find((item) => item.key === fromCode)
    || MONTH_ROLES.find((item) => item.key === code);
  const dutyKey = String(task.dutyRole || '').trim();
  const fromDuty = MONTH_ROLES.some((item) => item.key === dutyKey) ? dutyKey : null;
  const key = preset?.key || fromDuty || `role_${task.id}`;
  const label = preset?.label || String(task.code).trim();
  return { key, label, taskId: task.id };
}

export function monthRoleFromPreset(preset, tasks = []) {
  if (!preset?.key) return null;
  const base = MONTH_ROLES.find((item) => item.key === preset.key) || preset;
  const task = taskForRole({ ...base, taskId: null }, tasks);
  return {
    key: base.key,
    label: base.label,
    taskId: task?.id || null,
  };
}

export function taskForRole(role, tasks = []) {
  if (!role) return null;
  if (role.taskId) {
    const linked = tasks.find(task => task.id === role.taskId);
    if (linked) return linked;
  }
  const dutyTask = taskForMonthDutyRole(role, tasks);
  if (dutyTask) return dutyTask;
  const direct = matchTask(role.label, tasks);
  if (direct) return direct;
  const code = String(role.label || '').split(/\s*[—–−-]\s+/)[0];
  if (code && code !== String(role.label || '').trim()) return matchTask(code, tasks);
  return null;
}

function dutyHolders(taskList, role) {
  return (taskList || []).filter((task) => task?.dutyRole === role);
}

function foldCode(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function taskByCode(taskList, code) {
  const needle = foldCode(code);
  return (taskList || []).find((task) => foldCode(task?.code) === needle) || null;
}

/** Task viết ra lịch tuần cho holder vai trò trực — không bao giờ lấy task đang encodeDuty (vd. C1). */
function namedDutyHolder(taskList, role) {
  const holders = dutyHolders(taskList, role).filter((task) => !task.encodeDuty);
  if (holders[0]) return holders[0];
  // Fallback ký hiệu chuẩn khi C1/TC chiếm nhầm dutyRole.
  if (role === 'vao_gac') return taskByCode(taskList, 'VG');
  if (role === 'ra_truc') return taskByCode(taskList, 'RT');
  if (role === 'truc_ngay') return taskByCode(taskList, 'TN');
  return null;
}

export function roleEncodesDuty(role, taskList) {
  const task = taskForRole(role, taskList);
  if (task) return !!task.encodeDuty;
  const label = foldDuty(role?.label);
  return label === 'tc' || label === 'truc chinh' || label.includes('truc chinh');
}

/** Mã ô lịch tuần khi đổ từ dòng lịch tháng (F-201 BR-201-02). */
export function weekCodeForMonthRole(role, session, taskList) {
  const task = taskForRole(role, taskList);
  if (roleEncodesDuty(role, taskList)) {
    if (session === 'C' || session === 'T') {
      return namedDutyHolder(taskList, 'vao_gac')?.code || task?.code || roleShortLabel(role, taskList);
    }
    const morning = namedDutyHolder(taskList, 'truc_ngay')?.code;
    if (morning && (session === 'S' || session === 'R')) return morning;
  }
  if (task?.code) return task.code;
  return roleShortLabel(role, taskList);
}
