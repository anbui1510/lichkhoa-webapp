import { buildDayAgenda } from '../src/logic/mobileAgenda.js';
import { resolveUiMode, MOBILE_BREAKPOINT_PX } from '../src/logic/uiMode.js';

const days = [
  { iso: '2026-09-14', dayName: 'T2', dateStr: '14/9', fullDateStr: '14/9/2026' },
  { iso: '2026-09-15', dayName: 'T3', dateStr: '15/9', fullDateStr: '15/9/2026' }
];
const grid = {
  LỢI: [{ S: 'TN', C: '0' }, { S: 'SAPK', C: 'TT' }],
  PHỤNG: [{ S: 'VG', C: 'round' }, { S: '0', C: '0' }]
};
const staff = [
  { shortName: 'LỢI', name: 'Phan Tiến Lợi' },
  { shortName: 'PHỤNG', name: 'Trần Công Bảo Phụng' }
];
const tasks = [
  { code: 'TN', name: 'Trực Ngày', bgColor: '#fff2cc', textColor: '#cc0000' },
  { code: 'SAPK', name: 'Siêu âm', bgColor: '#d9d9d9', textColor: '#000' },
  { code: 'VG', name: 'Vào Gác', bgColor: '#ffe599', textColor: '#cc0000' },
  { code: 'TT', name: 'Thông tim', bgColor: '#f4ccd8', textColor: '#990000' },
  { code: 'round', name: 'Visit', bgColor: '#d9ead3', textColor: '#274e13' }
];

const a1 = buildDayAgenda({
  days, grid, staffList: staff, taskList: tasks, dayIndex: 0, daySessions: ['S', 'C']
});
const codes1 = a1.sessions.flatMap((s) => s.items.map((i) => `${i.shortName}:${i.code}`));
if (!codes1.includes('LỢI:TN')) throw new Error('TC-F203-01 failed');
if (codes1.some((c) => c.endsWith(':0'))) throw new Error('unexpected zero code');

const a2 = buildDayAgenda({
  days, grid, staffList: staff, taskList: tasks, dayIndex: 0, daySessions: ['S', 'C'], filterShortName: 'LỢI'
});
if (!a2.sessions.every((s) => s.items.every((i) => i.shortName === 'LỢI'))) {
  throw new Error('TC-F203-02 failed');
}

const a3 = buildDayAgenda({
  days, grid, staffList: staff, taskList: tasks, dayIndex: 1, daySessions: ['S', 'C'], filterShortName: 'PHỤNG'
});
if (!a3.sessions.every((s) => s.items.length === 0)) throw new Error('TC-F203-03 failed');

if (resolveUiMode({ width: 400 }) !== 'mobile') throw new Error('TC-F203-04 failed');
if (resolveUiMode({ width: 400, forced: 'desktop' }) !== 'desktop') throw new Error('TC-F203-05 failed');
if (resolveUiMode({ width: MOBILE_BREAKPOINT_PX + 1 }) !== 'desktop') throw new Error('desktop width failed');

console.log('TC-F203 OK');
