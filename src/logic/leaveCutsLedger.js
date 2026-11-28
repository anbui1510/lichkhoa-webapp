import { splitTaskCodes } from './cellOrder.js';

function fold(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const CUT_PER_SESSION = 0.5;

function tokenCountsAsBu(token) {
  const key = fold(token);
  return key === 'bu' || key === 'bù';
}

function tokenCountsAsPhep(token) {
  return fold(token) === 'p';
}

/** Tổng BÙ / PHÉP (0,5 mỗi buổi) đọc từ lưới tuần — dùng đồng bộ với leaveCuts trên sheet. */
export function leaveCutsFromWeekGrid(grid, staffList, taskList, sessions = ['S', 'C']) {
  const cuts = { bu: {}, phep: {} };
  const sessionList = Array.isArray(sessions) && sessions.length ? sessions : ['S', 'C'];
  (staffList || []).forEach((person) => {
    const name = person.shortName;
    const row = grid?.[name];
    if (!row) return;
    for (let day = 0; day < 7; day += 1) {
      sessionList.forEach((session) => {
        const value = row[day]?.[session];
        if (!String(value || '').trim()) return;
        splitTaskCodes(value, taskList).forEach((token) => {
          if (tokenCountsAsBu(token)) {
            cuts.bu[name] = +((cuts.bu[name] || 0) + CUT_PER_SESSION).toFixed(1);
          } else if (tokenCountsAsPhep(token)) {
            cuts.phep[name] = +((cuts.phep[name] || 0) + CUT_PER_SESSION).toFixed(1);
          }
        });
      });
    }
  });
  return cuts;
}

function sideEqual(a = {}, b = {}) {
  const names = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const name of names) {
    const left = Number(a[name]) || 0;
    const right = Number(b[name]) || 0;
    if (Math.abs(left - right) > 0.001) return false;
  }
  return true;
}

export function leaveCutsEqual(a, b) {
  const left = a || { bu: {}, phep: {} };
  const right = b || { bu: {}, phep: {} };
  return sideEqual(left.bu, right.bu) && sideEqual(left.phep, right.phep);
}

/** Hoàn cuts cũ lên số dư rồi trừ cuts mới (giống reconcile sau auto-schedule). */
export function staffAfterLeaveCutsChange(staff, prevCuts, nextCuts) {
  const prev = prevCuts || { bu: {}, phep: {} };
  const next = nextCuts || { bu: {}, phep: {} };
  return (staff || []).map((person) => {
    const name = person.shortName;
    const buRestore = Number(prev.bu?.[name]) || 0;
    const buNew = Number(next.bu?.[name]) || 0;
    const phepRestore = Number(prev.phep?.[name]) || 0;
    const phepNew = Number(next.phep?.[name]) || 0;
    const buBalance = +((Number(person.buBalance) || 0) + buRestore - buNew).toFixed(1);
    const phepBalance = +((Number(person.phepBalance) || 0) + phepRestore - phepNew).toFixed(1);
    if (buBalance === person.buBalance && phepBalance === person.phepBalance) return person;
    return { ...person, buBalance, phepBalance };
  });
}