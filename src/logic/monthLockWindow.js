import { parseLockAt } from './editWindows.js';
import { addDays, occurrenceStartOn } from './leaveRepeat.js';

function todayIso(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function combineDateAndTime(isoDate, ref) {
  const [y, m, d] = String(isoDate || '').split('-').map(Number);
  if (!y || !m || !d) return null;
  const out = new Date(y, m - 1, d, ref.getHours(), ref.getMinutes(), 0, 0);
  return Number.isNaN(out.getTime()) ? null : out;
}

function simpleWindow(openAt, lockAt, now) {
  if (openAt && now < openAt) return false;
  if (lockAt && now >= lockAt) return false;
  return true;
}

function normalizeRepeat(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!raw.freq) return null;
  return raw;
}

/**
 * F-215 — cửa sổ sửa lịch tháng (mở khóa → khóa, có thể lặp).
 * @param {{ monthOpenAt?: unknown, monthLockAt?: unknown, monthLockRepeat?: unknown }} config
 */
export function isMonthWindowOpen(config, now = new Date()) {
  const openAt = parseLockAt(config?.monthOpenAt);
  const lockAt = parseLockAt(config?.monthLockAt);
  const repeat = normalizeRepeat(config?.monthLockRepeat);

  if (!openAt && !lockAt) return true;
  if (!repeat) return simpleWindow(openAt, lockAt, now);
  if (!openAt || !lockAt) return simpleWindow(openAt, lockAt, now);

  const spanMs = lockAt.getTime() - openAt.getTime();
  if (spanMs <= 0) return simpleWindow(openAt, lockAt, now);

  const anchorFrom = todayIso(openAt);
  const entry = { from: anchorFrom, to: anchorFrom, repeat };

  for (let offset = -120; offset <= 120; offset += 1) {
    const probe = addDays(todayIso(now), offset);
    const occ = occurrenceStartOn(entry, probe);
    if (occ !== probe) continue;
    const winOpen = combineDateAndTime(occ, openAt);
    const winClose = new Date(winOpen.getTime() + spanMs);
    if (winOpen && winClose && now >= winOpen && now < winClose) return true;
  }
  return false;
}