/**
 * F-211 — roomTable chính/phụ helpers.
 * Columns = rooms; rows = room name + primary + ordered deputies.
 */

const DEFAULT_ROW_HEIGHT = 32;
const DEFAULT_COL_WIDTH = 120;

export const ROOM_LABEL_ROOM = 'Tên bệnh phòng';
export const ROOM_LABEL_PRIMARY = 'BS chính';
export const ROOM_LABEL_DEPUTY_PREFIX = 'BS phụ';

export const DEFAULT_ROOM_LABELS = [ROOM_LABEL_ROOM, ROOM_LABEL_PRIMARY, `${ROOM_LABEL_DEPUTY_PREFIX} 1`];

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
  return f.includes('bs chinh') || (f.includes('chinh') && !f.includes('phu'));
}

export function isDeputyLabel(label) {
  const f = fold(label);
  if (f.includes('phu trach')) return false;
  return f.includes('bs phu') || (f.includes('phu') && !f.includes('chinh'));
}

export function isLegacyDoctorLabel(label) {
  const f = fold(label);
  return f.includes('phu trach') || f === 'bs';
}

/** True when table already uses room-centric chính/phụ rows. */
export function isPrimaryDeputyRoomTable(table) {
  const labels = table?.labels || [];
  if (!labels.length) return false;
  return labels.some(isPrimaryLabel) || (labels.some(isRoomNameLabel) && labels.some(isDeputyLabel));
}

function labeledRow(matrix, labels, predicate, fallback) {
  const index = (labels || []).findIndex(predicate);
  if (index >= 0) return { index, row: matrix[index] || [] };
  return { index: fallback, row: matrix[fallback] || [] };
}

/**
 * @returns {{ room: string, primary: string, deputies: string[], col: number }[]}
 */
export function roomDutiesOf(roomTable) {
  if (!roomTable?.matrix?.length) return [];
  const labels = roomTable.labels || [];
  const matrix = roomTable.matrix || [];

  if (isPrimaryDeputyRoomTable(roomTable)) {
    const roomRow = labeledRow(matrix, labels, isRoomNameLabel, 0).row;
    const primaryRow = labeledRow(matrix, labels, isPrimaryLabel, 1).row;
    const deputyIndexes = labels
      .map((label, index) => (isDeputyLabel(label) ? index : -1))
      .filter(index => index >= 0)
      .sort((a, b) => a - b);
    const width = Math.max(
      roomRow.length,
      primaryRow.length,
      ...deputyIndexes.map(index => (matrix[index] || []).length),
      0
    );
    const duties = [];
    for (let col = 0; col < width; col += 1) {
      const room = String(roomRow[col] || '').trim();
      const primary = String(primaryRow[col] || '').trim();
      const deputies = deputyIndexes
        .map(index => String(matrix[index]?.[col] || '').trim())
        .filter(Boolean);
      if (!room && !primary && !deputies.length) continue;
      duties.push({ room, primary, deputies, col });
    }
    return duties;
  }

  // Legacy: doctor row + room row (column = doctor↔room pair).
  const doctorRow = labeledRow(matrix, labels, isLegacyDoctorLabel, 0).row;
  const roomRow = labeledRow(matrix, labels, isRoomNameLabel, 1).row;
  const width = Math.max(doctorRow.length, roomRow.length);
  const byRoom = new Map();
  for (let col = 0; col < width; col += 1) {
    const doctor = String(doctorRow[col] || '').trim();
    const room = String(roomRow[col] || '').trim();
    if (!doctor && !room) continue;
    const key = fold(room) || `__empty_${col}`;
    const current = byRoom.get(key);
    if (!current) {
      byRoom.set(key, { room, primary: doctor, deputies: [], col });
    } else if (doctor) {
      if (!current.primary) current.primary = doctor;
      else if (staffNameKey(doctor) !== staffNameKey(current.primary)) current.deputies.push(doctor);
    }
  }
  return [...byRoom.values()];
}

/** Zip shape used by older callers: one entry per duty with primary as doctor. */
export function roomPairsFromDuties(duties) {
  return (duties || [])
    .filter(item => item.room || item.primary)
    .map(item => ({ doctor: item.primary || '', room: item.room || '' }));
}

/**
 * Migrate legacy doctor-column table → room-centric chính/phụ.
 * Idempotent when already migrated.
 */
export function migrateRoomTableToPrimaryDeputy(table) {
  if (!table?.matrix?.length) {
    return {
      labels: DEFAULT_ROOM_LABELS.slice(),
      matrix: [ ['', '', ''], ['', '', ''], ['', '', ''] ],
      colWidths: [DEFAULT_COL_WIDTH, DEFAULT_COL_WIDTH, DEFAULT_COL_WIDTH],
      rowHeights: DEFAULT_ROOM_LABELS.map(() => DEFAULT_ROW_HEIGHT)
    };
  }
  if (isPrimaryDeputyRoomTable(table)) {
    const duties = roomDutiesOf(table);
    const deputyRows = Math.max(
      1,
      ...duties.map(d => d.deputies.length),
      (table.labels || []).filter(isDeputyLabel).length
    );
    const labels = [
      ROOM_LABEL_ROOM,
      ROOM_LABEL_PRIMARY,
      ...Array.from({ length: deputyRows }, (_, i) => `${ROOM_LABEL_DEPUTY_PREFIX} ${i + 1}`)
    ];
    const width = Math.max(1, duties.length, 3);
    const matrix = labels.map((label, rowIndex) => Array.from({ length: width }, (_, col) => {
      const duty = duties[col];
      if (!duty) return '';
      if (rowIndex === 0) return duty.room || '';
      if (rowIndex === 1) return duty.primary || '';
      return duty.deputies[rowIndex - 2] || '';
    }));
    return {
      labels,
      matrix,
      colWidths: Array.from({ length: width }, (_, i) => Number(table.colWidths?.[i]) || DEFAULT_COL_WIDTH),
      rowHeights: labels.map((_, i) => Number(table.rowHeights?.[i]) || DEFAULT_ROW_HEIGHT)
    };
  }

  const duties = roomDutiesOf(table);
  const deputyRows = Math.max(1, ...duties.map(d => d.deputies.length), 1);
  const labels = [
    ROOM_LABEL_ROOM,
    ROOM_LABEL_PRIMARY,
    ...Array.from({ length: deputyRows }, (_, i) => `${ROOM_LABEL_DEPUTY_PREFIX} ${i + 1}`)
  ];
  const width = Math.max(3, duties.length);
  const matrix = labels.map((_, rowIndex) => Array.from({ length: width }, (_, col) => {
    const duty = duties[col];
    if (!duty) return '';
    if (rowIndex === 0) return duty.room || '';
    if (rowIndex === 1) return duty.primary || '';
    return duty.deputies[rowIndex - 2] || '';
  }));
  return {
    labels,
    matrix,
    colWidths: Array.from({ length: width }, () => DEFAULT_COL_WIDTH),
    rowHeights: labels.map(() => DEFAULT_ROW_HEIGHT)
  };
}

/** Warnings for rooms that have a name but no primary doctor. */
export function missingPrimaryWarnings(roomTable) {
  return roomDutiesOf(roomTable)
    .filter(duty => duty.room && !duty.primary)
    .map(duty => `Bệnh phòng ${duty.room}: chưa có BS chính.`);
}
