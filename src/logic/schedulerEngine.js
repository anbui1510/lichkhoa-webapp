// Weekly auto-schedule, applied to the week already open on the sheet.
// Layer 1: previous Sunday VG -> Monday morning and afternoon RT.
// Layer 2: copy the month roster into the matching week cells. Several tasks may share a duty role. A task marked "mã hóa vào gác" is rewritten to the code of the same-role task that is not itself encoded.
// Layer 3: registered leave, refused when the cell already comes from the month roster.
// Layer 4: registered teaching.
// Layer 5: weekly tasks in Quản lý Task order. Month-classified tasks and P, BÙ, CT, H stay on the month pour.
// A ward task runs at its place in that list. A lock only blocks that session.

import { normalizeDaySessions, readMonthCell } from './monthSchedule';
import { roleShortLabel, taskForRole } from './taskMatch';
import { orderCellText, splitTaskCodes } from './cellOrder';

export const HOLIDAY_DICTIONARY = {
  '1/1': 'Tết Dương lịch',
  '14/2': 'Valentine',
  '27/2': 'Ngày Thầy thuốc VN',
  '8/3': 'Quốc tế Phụ nữ',
  '30/4': 'Giải phóng miền Nam',
  '1/5': 'Quốc tế Lao động',
  '2/9': 'Quốc khánh',
  '20/10': 'Phụ nữ Việt Nam',
  '20/11': 'Nhà giáo Việt Nam',
  '22/12': 'Thành lập QĐNDVN',
  '26/4/2026': 'Giỗ tổ Hùng Vương',
  '16/2/2026': 'Nghỉ Giao thừa',
  '17/2/2026': 'Mùng 1 Tết',
  '18/2/2026': 'Mùng 2 Tết',
  '19/2/2026': 'Mùng 3 Tết'
};

const SESSION_LABEL = { S: 'Sáng', R: 'Trưa', C: 'Chiều', T: 'Tối' };
const DAY_NAMES = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function parseIso(iso) {
  const [y, m, d] = String(iso || '').split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function isoOf(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addIsoDays(iso, days) {
  const date = parseIso(iso);
  date.setDate(date.getDate() + days);
  return isoOf(date);
}

export function buildWeekDays(startDate) {
  const start = parseIso(startDate);
  const days = [];
  for (let d = 0; d < 7; d += 1) {
    const temp = new Date(start.getFullYear(), start.getMonth(), start.getDate() + d);
    const dayKey = `${temp.getDate()}/${temp.getMonth() + 1}`;
    const fullDateKey = `${temp.getDate()}/${temp.getMonth() + 1}/${temp.getFullYear()}`;
    const holidayName = HOLIDAY_DICTIONARY[fullDateKey] || HOLIDAY_DICTIONARY[dayKey] || '';
    days.push({
      dateObj: temp,
      iso: isoOf(temp),
      dayName: DAY_NAMES[d],
      dateStr: `${temp.getDate()}/${temp.getMonth() + 1}`,
      fullDateStr: fullDateKey,
      isHoliday: holidayName !== '',
      holidayName
    });
  }
  return days;
}

function blankDay(sessions) {
  const day = { isRT: false };
  sessions.forEach((id) => { day[id] = ''; });
  return day;
}

export function emptyWeekGrid(staffList, sessions) {
  const active = normalizeDaySessions(sessions);
  const grid = {};
  (staffList || []).forEach((person) => {
    grid[person.shortName] = {};
    for (let d = 0; d < 7; d += 1) grid[person.shortName][d] = blankDay(active);
  });
  return grid;
}

function fold(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function tokens(value, taskList) {
  return splitTaskCodes(value, taskList);
}

function hasToken(value, code, taskList) {
  const needle = fold(code);
  return tokens(value, taskList).some(item => fold(item) === needle);
}

function addToken(value, code, taskList) {
  if (!code || hasToken(value, code, taskList)) return String(value || '');
  const current = String(value || '').trim();
  return current ? `${current}, ${code}` : String(code);
}

function findTaskByCode(code, taskList) {
  const needle = fold(code);
  return (taskList || []).find(task => fold(task.code) === needle) || null;
}

function dutyHolders(taskList, role) {
  return (taskList || []).filter(task => task?.dutyRole === role);
}

// The code written on the week. Prefer a role holder that is not itself a source;
// if every holder encodes, use the one earlier in Quản lý Task.
function dutyTask(taskList, role) {
  const holders = dutyHolders(taskList, role);
  return holders.find(task => !task.encodeDuty) || holders[0] || null;
}

function isDutyToken(code, taskList, role, legacy) {
  const task = (taskList || []).find(item => fold(item?.code) === fold(code));
  if (task?.dutyRole === role) return true;
  const named = dutyTask(taskList, role);
  if (named && fold(code) === fold(named.code)) return true;
  if (task) return false;
  return fold(code) === legacy;
}

function encodesDuty(role, taskList) {
  const task = taskForRole(role, taskList);
  if (task) return !!task.encodeDuty;
  const label = fold(role?.label);
  return label === 'tc' || label === 'truc chinh' || label.includes('truc chinh');
}

function isWardTask(task) {
  return fold(`${task?.code || ''} ${task?.name || ''}`).includes('benh phong');
}

function isLeaveTask(task) {
  return task?.category === 'NGHI_VANG' || ['p', 'bu', 'ct', 'h'].includes(fold(task?.code));
}

function codeForRole(role, session, taskList) {
  const task = taskForRole(role, taskList);
  if (encodesDuty(role, taskList)) {
    if (session === 'C' || session === 'T') return dutyTask(taskList, 'vao_gac')?.code || task?.code || roleShortLabel(role, taskList);
    const morning = dutyTask(taskList, 'truc_ngay')?.code;
    if (morning && (session === 'S' || session === 'R')) return morning;
  }
  if (task?.code) return task.code;
  return roleShortLabel(role, taskList);
}

function matchStaff(text, staffList) {
  const found = [];
  String(text || '').split(/[,;/|\n]+/).map(item => item.trim()).filter(Boolean).forEach((part) => {
    const key = fold(part.replace(/\([^)]*\)/g, ''));
    if (!key) return;
    const hit = (staffList || []).find(person => fold(person.shortName) === key || fold(person.name) === key);
    if (hit && !found.some(person => person.id === hit.id)) found.push(hit);
  });
  return found;
}

function taskByTopic(topic, taskList) {
  const needle = fold(topic);
  if (!needle) return null;
  return (taskList || []).find(task => fold(task.code) === needle || fold(task.name) === needle) || null;
}

function ownersOf(task, staffList) {
  const ids = Array.isArray(task?.owners) ? task.owners : [];
  return ids.map(id => (staffList || []).find(person => person.id === id)).filter(Boolean);
}

function savedSlots(task) {
  if (!Array.isArray(task?.fixedSlots)) return null;
  const days = new Set((Array.isArray(task.fixedDays) ? task.fixedDays : []).map(Number));
  return task.fixedSlots
    .map(slot => ({
      day: Number(slot?.day),
      session: slot?.session === 'C' ? 'C' : slot?.session === 'S' ? 'S' : ''
    }))
    .filter(slot => slot.session && days.has(slot.day) && slot.day >= 0 && slot.day <= 6);
}

function taskSessions(task, active) {
  const spec = String(task?.session || '');
  const want = new Set();
  if (!spec || spec.includes('SANG')) want.add('S');
  if (spec.includes('TRUA')) want.add('R');
  if (spec.includes('CHIEU') || spec.includes('DEM')) want.add('C');
  if (spec.includes('TOI')) want.add('T');
  const list = active.filter(id => want.has(id));
  return list.length ? list : active.filter(id => id === 'S' || id === 'C');
}

function covers(entry, iso) {
  const start = entry?.from || entry?.iso;
  const end = entry?.to || entry?.from || entry?.iso;
  return Boolean(start && end && iso >= start && iso <= end);
}

function entrySessions(entry, active) {
  const raw = Array.isArray(entry?.sessions) && entry.sessions.length
    ? entry.sessions
    : [entry?.session === 'C' ? 'C' : 'S'];
  return active.filter(id => raw.includes(id));
}

function bonusOf(task) {
  if (task?.buRt || task?.buVg) {
    return {
      rt: task.buRt ? Number(task.deltaRt) || 0 : 0,
      vg: task.buVg ? Number(task.deltaVg) || 0 : 0
    };
  }
  if (task?.buMode === 'RT') return { rt: Number(task.delta) || 0, vg: 0 };
  if (task?.buMode === 'VG') return { rt: 0, vg: Number(task.delta) || 0 };
  return { rt: 0, vg: 0 };
}

function roomPairs(roomTable) {
  const matrix = roomTable?.matrix || [];
  const doctors = matrix[0] || [];
  const rooms = matrix[1] || [];
  const width = Math.max(doctors.length, rooms.length);
  const pairs = [];
  for (let index = 0; index < width; index += 1) {
    const doctor = String(doctors[index] || '').trim();
    const room = String(rooms[index] || '').trim();
    if (!doctor && !room) continue;
    pairs.push({ doctor, room });
  }
  return pairs;
}

export function generateWeeklySchedule({
  startDate,
  staffList = [],
  taskList = [],
  monthGrid = {},
  monthRoles = [],
  daySessions,
  leaveEntries = [],
  studyEntries = [],
  roomTable,
  sheets = [],
  existingNotes = {}
}) {
  const sessions = normalizeDaySessions(daySessions);
  const roomNames = roomPairs(roomTable).map(pair => pair.room).filter(Boolean);
  const days = buildWeekDays(startDate);
  const warnings = [];
  const roomWarnings = [];
  const buGrants = {};
  const leaveCuts = { bu: {}, phep: {} };
  const buPool = new Map(staffList.map(person => [person.id, Number(person.buBalance) || 0]));
  const monthCells = new Set();
  const granted = new Set();
  const grid = emptyWeekGrid(staffList, sessions);
  const rtSessions = ['S', 'C'].filter(id => sessions.includes(id));

  const ensure = (person, day) => {
    if (!grid[person.shortName]) {
      grid[person.shortName] = {};
      for (let index = 0; index < 7; index += 1) grid[person.shortName][index] = blankDay(sessions);
    }
    if (!grid[person.shortName][day]) grid[person.shortName][day] = blankDay(sessions);
    return grid[person.shortName][day];
  };

  const put = (person, day, session, code, fromMonth = false) => {
    if (!sessions.includes(session) || !code) return;
    const row = ensure(person, day);
    const current = String(row[session] || '');
    const isOff = (item) => isDutyToken(item, taskList, 'ra_truc', 'rt');
    const onlyRt = tokens(current, taskList).length > 0 && tokens(current, taskList).every(isOff);
    const offCode = dutyTask(taskList, 'ra_truc')?.code || 'RT';
    const next = onlyRt && !isOff(code) ? addToken(code, offCode, taskList) : addToken(current, code, taskList);
    row[session] = orderCellText(next, taskList, roomNames);
    if (tokens(row[session], taskList).some(isOff)) row.isRT = true;
    if (fromMonth) monthCells.add(`${person.shortName}|${day}|${session}`);
  };

  const read = (person, day, session) => String(grid[person.shortName]?.[day]?.[session] || '');

  const dayHas = (person, day, code) => sessions.some(session => hasToken(read(person, day, session), code, taskList));

  const warnedDuty = new Set();
  const warnDuty = (role, message) => {
    if (warnedDuty.has(role)) return;
    warnedDuty.add(role);
    warnings.push(message);
  };
  // Next-day ra trực comes from the vào gác code, not from that day's month cell.
  const markRt = (person, day) => {
    const code = dutyTask(taskList, 'ra_truc')?.code;
    if (!code) {
      warnDuty('ra_truc', 'Có task mã hóa vào gác nhưng chưa có task vai trò Ra trực.');
      return;
    }
    rtSessions.forEach(session => put(person, day, session, code, false));
  };

  const peopleWithVg = (iso) => {
    const found = new Map();
    (sheets || []).forEach((sheet) => {
      const sheetDays = buildWeekDays(sheet.startDate);
      const index = sheetDays.findIndex(day => day.iso === iso);
      if (index < 0) return;
      staffList.forEach((person) => {
        const row = sheet.grid?.[person.shortName]?.[index] || {};
        const hit = Object.entries(row).some(([key, value]) => key !== 'isRT' && key !== 'note' && tokens(value, taskList).some(item => isDutyToken(item, taskList, 'vao_gac', 'vg')));
        if (hit) found.set(person.id, person);
      });
    });
    (monthRoles || []).forEach((role) => {
      sessions.forEach((session) => {
        const code = codeForRole(role, session, taskList);
        if (!isDutyToken(code, taskList, 'vao_gac', 'vg')) return;
        matchStaff(readMonthCell(monthGrid, iso, role.key, session), staffList).forEach((person) => {
          found.set(person.id, person);
        });
      });
    });
    return [...found.values()];
  };

  // Layer 1 — Monday RT when the previous Sunday has VG.
  peopleWithVg(addIsoDays(days[0].iso, -1)).forEach(person => markRt(person, 0));

  // Layer 2 — month roster into the same weekday and session.
  days.forEach((day, dayIndex) => {
    (monthRoles || []).forEach((role) => {
      sessions.forEach((session) => {
        const text = String(readMonthCell(monthGrid, day.iso, role.key, session) || '').trim();
        if (!text) return;
        const people = matchStaff(text, staffList);
        if (!people.length) {
          warnings.push(`Lịch tháng ${day.dayName} ${day.dateStr} ${SESSION_LABEL[session] || session} (${role.label || role.key}) có "${text}" nhưng không khớp bác sĩ nào.`);
          return;
        }
        const code = codeForRole(role, session, taskList);
        if (encodesDuty(role, taskList) && (session === 'C' || session === 'T') && !dutyTask(taskList, 'vao_gac')) {
          warnDuty('vao_gac', `Dòng ${role.label || role.key} đang mã hóa vào gác nhưng chưa có task vai trò Vào gác.`);
        }
        people.forEach((person) => {
          put(person, dayIndex, session, code, true);
          if (isDutyToken(code, taskList, 'vao_gac', 'vg') && dayIndex < 6) markRt(person, dayIndex + 1);
        });
      });
    });
  });

  const lockedBy = (value, task) => tokens(value, taskList).filter((code) => {
    const existing = findTaskByCode(code, taskList);
    return existing && task && (existing.locks || []).includes(task.id);
  });

  const absent = (value) => tokens(value, taskList).some(code => ['p', 'bu', 'ct', 'h'].includes(fold(code)));

  // Layer 3 — leave yields to anything already written from the month roster.
  (leaveEntries || []).forEach((entry) => {
    const person = staffList.find(item => fold(item.shortName) === fold(entry.shortName));
    const requested = entry.type || 'P';
    if (!person) {
      if (entry.shortName) warnings.push(`Lịch nghỉ của "${entry.shortName}" không khớp bác sĩ nào.`);
      return;
    }
    days.forEach((day, dayIndex) => {
      if (!covers(entry, day.iso)) return;
      entrySessions(entry, sessions).forEach((session) => {
        const key = `${person.shortName}|${dayIndex}|${session}`;
        const current = read(person, dayIndex, session);
        if (monthCells.has(key)) {
          warnings.push(`Không xếp được ${requested} cho ${person.shortName} ${day.dayName} ${day.dateStr} ${SESSION_LABEL[session] || session}: ô đã có "${current}" từ lịch tháng. Cần sửa tay.`);
          return;
        }
        let code = requested;
        if (fold(requested) === 'p') {
          const pool = buPool.get(person.id) || 0;
          if (pool >= 0.5) {
            code = 'BÙ';
            buPool.set(person.id, +(pool - 0.5).toFixed(1));
            leaveCuts.bu[person.shortName] = +((leaveCuts.bu[person.shortName] || 0) + 0.5).toFixed(1);
          } else {
            leaveCuts.phep[person.shortName] = +((leaveCuts.phep[person.shortName] || 0) + 0.5).toFixed(1);
          }
        }
        put(person, dayIndex, session, code);
      });
    });
  });

  const canTake = (person, day, session, task) => {
    const current = read(person, day, session);
    if (absent(current)) return false;
    return lockedBy(current, task).length === 0;
  };

  const grant = (person, task, day, placedSessions) => {
    const bonus = bonusOf(task);
    if (!bonus.rt && !bonus.vg) return;
    const key = `${person.id}|${task.id}|${day}`;
    if (granted.has(key)) return;
    let amount = 0;
    if (bonus.rt && dayHas(person, day, 'RT')) amount += bonus.rt;
    if (bonus.vg && placedSessions.some(session => hasToken(read(person, day, session), 'VG', taskList))) amount += bonus.vg;
    if (!amount) return;
    granted.add(key);
    buGrants[person.shortName] = +((buGrants[person.shortName] || 0) + amount).toFixed(1);
  };

  const placeTask = (person, day, session, task) => {
    if (!canTake(person, day, session, task)) return false;
    put(person, day, session, task.code);
    return true;
  };

  // Layer 4 — registered lessons, then spread student teaching into empty cells.
  (studyEntries || []).forEach((entry) => {
    const named = staffList.find(item => fold(item.shortName) === fold(entry.shortName));
    const task = taskByTopic(entry.topic, taskList);
    const code = task?.code || entry.topic;
    if (!code) return;
    days.forEach((day, dayIndex) => {
      if (!covers(entry, day.iso)) return;
      entrySessions(entry, sessions).forEach((session) => {
        const order = task ? ownersOf(task, staffList) : [];
        const queue = [];
        if (named) queue.push(named);
        order.forEach((person) => {
          if (!queue.some(item => item.id === person.id)) queue.push(person);
        });
        const chosen = queue.find((person) => {
          if (monthCells.has(`${person.shortName}|${dayIndex}|${session}`)) return false;
          return task ? canTake(person, dayIndex, session, task) : !absent(read(person, dayIndex, session));
        });
        if (!chosen) {
          warnings.push(`Không xếp được lịch học "${code}" ${day.dayName} ${day.dateStr} ${SESSION_LABEL[session] || session}: ưu tiên lịch tháng hoặc ô đã bị khóa.`);
          return;
        }
        if (task) placeTask(chosen, dayIndex, session, task);
        else put(chosen, dayIndex, session, code);
        if (task) grant(chosen, task, dayIndex, [session]);
      });
    });
  });

  let wardsPlaced = false;
  const placeWards = (wardTask) => {
    if (wardsPlaced) return;
    wardsPlaced = true;
    roomPairs(roomTable).forEach(({ doctor, room }) => {
      if (!room) return;
      const people = matchStaff(doctor, staffList);
      if (!people.length) {
        roomWarnings.push(`Bệnh phòng ${room}: chưa có bác sĩ phụ trách.`);
        return;
      }
      people.forEach((person) => {
        for (let day = 0; day <= 4; day += 1) {
          let placed = false;
          let blocked = false;
          let off = true;
          sessions.forEach((session) => {
            const current = read(person, day, session);
            const blockers = lockedBy(current, wardTask);
            if (blockers.length) {
              blocked = true;
              roomWarnings.push(`Bệnh phòng ${room}: ${person.shortName} ${days[day].dayName} ${days[day].dateStr} ${SESSION_LABEL[session] || session} đang có ${blockers.join(', ')}, không xếp bệnh phòng buổi này. Cần bổ sung.`);
              return;
            }
            if (absent(current)) return;
            off = false;
            if (!placed) {
              put(person, day, session, room);
              placed = true;
            }
          });
          if (!placed && off && !blocked) {
            roomWarnings.push(`Bệnh phòng ${room}: ${person.shortName} nghỉ ${days[day].dayName} ${days[day].dateStr}. Cần bổ sung.`);
          }
        }
      });
    });
  };

  // Weekly tasks follow Quản lý Task order. Month scope and leave codes are poured earlier.
  (taskList || []).forEach((task) => {
    if (task.scope === 'month' || isLeaveTask(task)) return;
    if (isWardTask(task)) {
      placeWards(task);
      return;
    }
    const fixedDays = Array.isArray(task.fixedDays) ? task.fixedDays.map(Number).filter(day => days[day]) : [];
    if (!fixedDays.length) return;
    const people = ownersOf(task, staffList);
    if (!people.length) {
      warnings.push(`Task ${task.code} có ngày cố định nhưng chưa chọn Trách nhiệm.`);
      return;
    }
    const explicit = savedSlots(task);
    const plan = explicit
      ? explicit.filter(slot => days[slot.day] && sessions.includes(slot.session))
      : fixedDays.filter(day => days[day]).flatMap(day => taskSessions(task, sessions).map(session => ({ day, session })));
    if (explicit) {
      fixedDays.filter(day => days[day] && !plan.some(slot => slot.day === day)).forEach((day) => {
        warnings.push(`Task ${task.code} ${days[day].dayName} ${days[day].dateStr} chưa chọn Sáng hoặc Chiều.`);
      });
    }
    const byDay = new Map();
    plan.forEach((slot) => {
      const list = byDay.get(slot.day) || [];
      if (!list.includes(slot.session)) list.push(slot.session);
      byDay.set(slot.day, list);
    });
    byDay.forEach((useSessions, day) => {
      const placedByPerson = new Map();
      useSessions.forEach((session) => {
        const holder = people.find(item => hasToken(read(item, day, session), task.code, taskList));
        const alreadyThisDay = (item) => sessions.some(id => (
          monthCells.has(`${item.shortName}|${day}|${id}`) && hasToken(read(item, day, id), task.code, taskList)
        ));
        const chosen = holder || people.find(item => !alreadyThisDay(item) && canTake(item, day, session, task));
        if (!chosen) {
          warnings.push(`Không xếp được ${task.code} ${days[day].dayName} ${days[day].dateStr} ${SESSION_LABEL[session] || session}: người phụ trách đang bị khóa hoặc đang nghỉ.`);
          return;
        }
        if (!holder) placeTask(chosen, day, session, task);
        const list = placedByPerson.get(chosen.id) || [];
        list.push(session);
        placedByPerson.set(chosen.id, list);
      });
      placedByPerson.forEach((placedSessions, id) => {
        const person = people.find(item => item.id === id);
        if (person) grant(person, task, day, placedSessions);
      });
    });
  });
  if (!wardsPlaced) placeWards((taskList || []).find(isWardTask));

  const noteLines = {};
  const addNote = (person, line) => {
    const list = noteLines[person.shortName] || [];
    if (!list.includes(line)) list.push(line);
    noteLines[person.shortName] = list;
  };
  const ttWithRt = new Set(['tt', 'tt chinh', 'tt phu']);
  staffList.forEach((person) => {
    for (let day = 0; day < 7; day += 1) {
      if (!sessions.some(session => tokens(read(person, day, session), taskList).some(item => isDutyToken(item, taskList, 'ra_truc', 'rt')))) continue;
      let matched = null;
      sessions.forEach((session) => {
        tokens(read(person, day, session), taskList).forEach((code) => {
          if (!ttWithRt.has(fold(code)) || matched) return;
          matched = findTaskByCode(code, taskList) || { id: `code:${code}`, code };
        });
      });
      if (!matched) continue;
      const key = `${person.id}|${matched.id}|${day}`;
      if (granted.has(key)) continue;
      granted.add(key);
      const bonus = bonusOf(matched);
      const amount = bonus.rt > 0 ? bonus.rt : 0.5;
      buGrants[person.shortName] = +((buGrants[person.shortName] || 0) + amount).toFixed(1);
      addNote(person, `${days[day].dayName} ${days[day].dateStr}: có RT và ${matched.code}, cộng ${String(amount).replace('.', ',')} bù.`);
    }
  });
  staffList.forEach((person) => {
    const row = grid[person.shortName];
    if (!row) return;
    const prev = String(existingNotes?.[person.shortName] || '');
    const kept = prev.split('\n').map(line => line.trim()).filter(line => line && !/: có RT và .+ cộng [\d,]+ bù\.$/.test(line));
    const extra = (noteLines[person.shortName] || []).filter(line => !kept.includes(line));
    row.note = [...kept, ...extra].join('\n');
  });

  return { days, grid, warnings, roomWarnings, buGrants, leaveCuts };
}
