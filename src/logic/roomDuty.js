/**
 * F-211 — roomTable: cột = bác sĩ tuần; hàng 1 = shortName; hàng 2–3 = tên phòng.
 */

const DEFAULT_ROW_HEIGHT = 32;
const DEFAULT_COL_WIDTH = 120;

export const ROOM_LABEL_ROOM = 'Tên bệnh phòng';
export const ROOM_LABEL_PRIMARY = 'BS chính';
export const ROOM_LABEL_DEPUTY_PREFIX = 'BS phụ';
export const ROOM_LABEL_DOCTOR = 'BS';

/** Hàng 1 = BS; hàng 2 = Chính; hàng 3 = Hỗ trợ (ô ghi tên phòng). */
export const DEFAULT_ROOM_LABELS = [ROOM_LABEL_DOCTOR, 'Chính', 'Hỗ trợ'];

function fold(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function staffNameKey(value) {
  return String(value || '').normalize('NFC').trim().toLocaleLowerCase('vi');
}

export function isRoomNameLabel(label) {
  const f = fold(label);
  return f.includes('ten benh phong') || f.includes('benh phong') || (f.includes('phong') && !f.includes('phu trach') && !f.includes('chinh') && !f.includes('phu'));
}

export function isPrimaryLabel(label) {
  const f = fold(label);
  // Chỉ «BS chính» (shape cũ) — không khớp nhãn cột «Chính» (doctor-first).
  return f.includes('bs chinh') || (f.startsWith('bs') && f.includes('chinh') && !f.includes('phu'));
}

export function isDeputyLabel(label) {
  const f = fold(label);
  if (f.includes('phu trach')) return false;
  if (f.includes('ho tro') || f.includes('ho-tro') || f.includes('support')) return true;
  return f.includes('bs phu') || (f.includes('phu') && !f.includes('chinh'));
}

export function isLegacyDoctorLabel(label) {
  const f = fold(label);
  return f.includes('phu trach') || f === 'bs';
}

/** Hàng đổ / chọn tên BS (hàng đầu). */
export function isDoctorAssignmentLabel(label) {
  return isLegacyDoctorLabel(label) || isPrimaryLabel(label);
}

function staffShortNames(staffList) {
  return (staffList || []).map((person) => String(person.shortName || '').trim()).filter(Boolean);
}

function sameStaffName(a, b) {
  return staffNameKey(a) === staffNameKey(b);
}

/** True when table already uses room-centric chính/phụ rows (shape cũ). */
export function isPrimaryDeputyRoomTable(table) {
  const labels = table?.labels || [];
  if (!labels.length) return false;
  return labels.some(isPrimaryLabel) || (labels.some(isRoomNameLabel) && labels.some(isDeputyLabel));
}

/** Cột = BS; hàng 0 = shortName; hàng 1+ = tên phòng. */
export function isDoctorFirstRoomTable(table) {
  const labels = table?.labels || [];
  if (!labels.length) return false;
  if (isRoomNameLabel(labels[0])) return false;
  const head = fold(labels[0]);
  const hasRoomRows = labels.some((label) => {
    const f = fold(label);
    return f === 'chinh' || f === 'ho tro' || f === 'ho-tro' || f.includes('ho tro');
  });
  // Nhãn mặc định BS / Chính / Hỗ trợ — luôn doctor-first (không migrate nhầm).
  if ((head === 'bs' || head === '' || isLegacyDoctorLabel(labels[0])) && hasRoomRows) {
    return true;
  }
  if (isPrimaryDeputyRoomTable(table)) return false;
  return isLegacyDoctorLabel(labels[0]) || String(labels[0] || '').trim() === '';
}

function padRow(row, width) {
  const next = (row || []).map((cell) => String(cell ?? ''));
  while (next.length < width) next.push('');
  return next.slice(0, width);
}

function emptyDoctorFirstTable(width = 3) {
  const w = Math.max(1, width);
  return {
    labels: DEFAULT_ROOM_LABELS.slice(),
    matrix: DEFAULT_ROOM_LABELS.map(() => Array.from({ length: w }, () => '')),
    colWidths: Array.from({ length: w }, () => DEFAULT_COL_WIDTH),
    rowHeights: DEFAULT_ROOM_LABELS.map(() => DEFAULT_ROW_HEIGHT),
  };
}

function labeledRow(matrix, labels, predicate, fallback) {
  const index = (labels || []).findIndex(predicate);
  if (index >= 0) return { index, row: matrix[index] || [] };
  return { index: fallback, row: matrix[fallback] || [] };
}

/**
 * Chuẩn hoá: hàng 1 = BS, hàng 2–3 = tên phòng. Bỏ nhãn «Tên bệnh phòng».
 * Migrate từ chính/phụ cũ: [phòng, BS chính, hỗ trợ] → [BS chính, phòng, hỗ trợ-as-phòng2].
 */
export function migrateToDoctorFirstRoomTable(table) {
  if (!table?.matrix?.length) return emptyDoctorFirstTable(3);

  const labels = (table.labels || []).map((label) => String(label ?? ''));
  const matrix = (table.matrix || []).map((row) => (row || []).map((cell) => String(cell ?? '')));
  const width = Math.max(
    1,
    ...matrix.map((row) => row.length),
    (table.colWidths || []).length,
  );

  if (isPrimaryDeputyRoomTable(table)) {
    const roomRow = padRow(labeledRow(matrix, labels, isRoomNameLabel, 0).row, width);
    const primaryRow = padRow(labeledRow(matrix, labels, isPrimaryLabel, 1).row, width);
    const deputyIdx = labels
      .map((label, index) => (isDeputyLabel(label) ? index : -1))
      .filter((index) => index >= 0)
      .sort((a, b) => a - b);
    const room2 = padRow(deputyIdx.length ? matrix[deputyIdx[0]] : [], width);
    return {
      labels: DEFAULT_ROOM_LABELS.slice(),
      matrix: [primaryRow, roomRow, room2],
      colWidths: Array.from({ length: width }, (_, i) => Number(table.colWidths?.[i]) || DEFAULT_COL_WIDTH),
      rowHeights: DEFAULT_ROOM_LABELS.map((_, i) => Number(table.rowHeights?.[i]) || DEFAULT_ROW_HEIGHT),
    };
  }

  // Đã doctor-first / legacy BS + phòng: ép 3 hàng, nhãn mặc định (xóa «Tên bệnh phòng»).
  const doctorIdx = labels.findIndex(isLegacyDoctorLabel);
  const roomIdx = labels.findIndex(isRoomNameLabel);
  const doctorRow = padRow(matrix[doctorIdx >= 0 ? doctorIdx : 0] || [], width);
  const roomRow = padRow(matrix[roomIdx >= 0 ? roomIdx : (doctorIdx === 0 ? 1 : 0)] || [], width);
  const extraRoom = padRow(
    matrix.find((_, index) => index !== (doctorIdx >= 0 ? doctorIdx : 0) && index !== (roomIdx >= 0 ? roomIdx : 1)) || [],
    width,
  );

  return {
    labels: DEFAULT_ROOM_LABELS.slice(),
    matrix: [doctorRow, roomRow, extraRoom],
    colWidths: Array.from({ length: width }, (_, i) => Number(table.colWidths?.[i]) || DEFAULT_COL_WIDTH),
    rowHeights: DEFAULT_ROOM_LABELS.map((_, i) => Number(table.rowHeights?.[i]) || DEFAULT_ROW_HEIGHT),
  };
}

/** @deprecated dùng migrateToDoctorFirstRoomTable */
export function migrateRoomTableToPrimaryDeputy(table) {
  return migrateToDoctorFirstRoomTable(table);
}

/** Nhãn cột trái: giữ chữ user đã sửa; ô trống → mặc định BS / Chính / Hỗ trợ. */
export function resolveRoomRowLabels(existing) {
  const prev = existing || [];
  return [
    String(prev[0] || '').trim() || ROOM_LABEL_DOCTOR,
    String(prev[1] || '').trim() || 'Chính',
    String(prev[2] || '').trim() || 'Hỗ trợ',
  ];
}

/**
 * Đổ shortName staff tuần lên hàng đầu (1 cột / bác sĩ).
 * Giữ tên phòng hàng 2–3 theo cột khớp tên BS; không xóa nhãn Chính/Hỗ trợ.
 */
export function applyWeekStaffToDoctorRow(table, staffList) {
  const base = table && isDoctorFirstRoomTable(table) ? table : migrateToDoctorFirstRoomTable(table);
  const labels = resolveRoomRowLabels(base.labels);
  const names = staffShortNames(staffList);
  const labelsChanged = labels.some((label, i) => label !== String(base.labels?.[i] ?? ''));

  if (!names.length) {
    if (!labelsChanged) return base;
    return {
      ...base,
      labels,
      rowHeights: labels.map((_, index) => Number(base.rowHeights?.[index]) || DEFAULT_ROW_HEIGHT),
    };
  }

  const matrix = (base.matrix || []).map((row) => (row || []).map((cell) => String(cell ?? '')));
  while (matrix.length < 3) matrix.push([]);
  const width = Math.max(
    names.length,
    ...matrix.map((row) => row.length),
    (base.colWidths || []).length,
    0,
  );
  matrix.forEach((row) => {
    while (row.length < width) row.push('');
  });

  const doctors = matrix[0] || [];
  const used = new Set();
  const matched = names.map((name) => {
    const index = doctors.findIndex((cell, col) => !used.has(col) && sameStaffName(cell, name));
    if (index >= 0) used.add(index);
    return index;
  });
  const leftover = doctors
    .map((_, col) => col)
    .filter((col) => {
      if (used.has(col)) return false;
      return matrix.some((row, rowIndex) => rowIndex > 0 && String(row[col] || '').trim());
    });
  const sources = [...matched, ...leftover];

  const needsSync = sources.length !== doctors.length
    || sources.some((src, col) => src !== col)
    || names.some((name, col) => !sameStaffName(doctors[col], name))
    || (base.labels || [])[0] === ROOM_LABEL_ROOM
    || (base.labels || []).some(isRoomNameLabel)
    || (base.labels || []).some(isPrimaryLabel);
  if (!needsSync && !labelsChanged && sources.length === names.length) return base;

  const nextMatrix = needsSync
    ? matrix.map((row, rowIndex) => sources.map((src, col) => {
      if (rowIndex === 0) {
        return col < names.length ? names[col] : (src >= 0 ? String(row[src] ?? '') : '');
      }
      if (src < 0) return '';
      return String(row[src] ?? '');
    }))
    : matrix.map((row) => row.slice());

  return {
    ...base,
    labels,
    matrix: nextMatrix,
    colWidths: needsSync
      ? sources.map((src) => (
        src >= 0 ? Number(base.colWidths?.[src]) || DEFAULT_COL_WIDTH : DEFAULT_COL_WIDTH
      ))
      : (base.colWidths || []).slice(),
    rowHeights: labels.map((_, index) => Number(base.rowHeights?.[index]) || DEFAULT_ROW_HEIGHT),
  };
}

/** @deprecated alias — đổ vào hàng BS (đầu tiên). */
export function applyWeekStaffToPrimaryRow(table, staffList) {
  return applyWeekStaffToDoctorRow(table, staffList);
}

function splitRoomTokens(cell) {
  return String(cell || '')
    .split(/[,;/|\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Đọc bảng doctor-first theo quy tắc Chính / Hỗ trợ:
 * - Hàng Chính: BS là primary của từng phòng trong ô
 * - Hàng Hỗ trợ: BS là deputy — chỉ nhận phòng khi primary bị khóa BP
 * @returns {{ room: string, primary: string, deputies: string[], col: number }[]}
 */
export function roomDutiesOf(roomTable) {
  if (!roomTable?.matrix?.length) return [];
  const normalized = isDoctorFirstRoomTable(roomTable)
    ? roomTable
    : migrateToDoctorFirstRoomTable(roomTable);
  const matrix = normalized.matrix || [];
  const doctorRow = matrix[0] || [];
  const chinhRow = matrix[1] || [];
  const supportRow = matrix[2] || [];
  const width = Math.max(doctorRow.length, chinhRow.length, supportRow.length, 0);
  const byRoom = new Map();

  const ensure = (room, col) => {
    if (!byRoom.has(room)) {
      byRoom.set(room, { room, primary: '', deputies: [], col });
    }
    return byRoom.get(room);
  };

  for (let col = 0; col < width; col += 1) {
    const doctor = String(doctorRow[col] || '').trim();
    splitRoomTokens(chinhRow[col]).forEach((room) => {
      const duty = ensure(room, col);
      if (!doctor) return;
      if (!duty.primary) duty.primary = doctor;
      else if (duty.primary !== doctor && !duty.deputies.includes(doctor)) {
        duty.deputies.push(doctor);
      }
    });
    splitRoomTokens(supportRow[col]).forEach((room) => {
      const duty = ensure(room, col);
      if (!doctor) return;
      if (duty.primary && duty.primary !== doctor && !duty.deputies.includes(doctor)) {
        duty.deputies.push(doctor);
      } else if (!duty.primary && !duty.deputies.includes(doctor)) {
        duty.deputies.push(doctor);
      }
    });
  }

  return [...byRoom.values()];
}

/** Zip shape used by older callers: one entry per duty with primary as doctor. */
export function roomPairsFromDuties(duties) {
  return (duties || [])
    .filter((item) => item.room || item.primary)
    .map((item) => ({ doctor: item.primary || '', room: item.room || '' }));
}

/** Warnings for rooms that have a name but no primary doctor. */
export function missingPrimaryWarnings(roomTable) {
  return roomDutiesOf(roomTable)
    .filter((duty) => duty.room && !duty.primary)
    .map((duty) => `Bệnh phòng ${duty.room}: chưa có BS chính.`);
}
