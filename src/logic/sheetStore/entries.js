import { LEAVE_HEADERS, STUDY_HEADERS } from './constants.js';
import { asArray, objectsToRows, parseJsonCell, rowsToObjects } from './tableUtils.js';

function staffShortName(staff, staffId, shortName) {
  const sn = String(shortName || '').trim();
  if (sn) return sn;
  const id = String(staffId || '').trim();
  if (!id) return '';
  const hit = asArray(staff).find((person) => person.id === id);
  if (hit?.shortName) return hit.shortName;
  return /^doc_|^hv_/.test(id) ? '' : id;
}

function staffIdForExport(entry, staff) {
  const shortName = String(entry?.shortName || '').trim();
  if (entry?.staffId) return String(entry.staffId).trim();
  const hit = asArray(staff).find((person) => person.shortName === shortName);
  if (hit?.id) return hit.id;
  return shortName;
}

const LEAVE_PAYLOAD_KEYS = ['sessions', 'session', 'repeat', 'exdates', 'createdAt'];
const STUDY_PAYLOAD_KEYS = ['sessions', 'session', 'repeat', 'exdates', 'createdAt', 'taskId', 'topic', 'type', 'plannedLong'];

function payloadSlice(entry, keys) {
  const payload = {};
  keys.forEach((key) => {
    const value = entry?.[key];
    if (value === undefined || value === null || value === '') return;
    payload[key] = value;
  });
  return payload;
}

export function importLeaveRows(rows, staff = []) {
  return rowsToObjects(rows, LEAVE_HEADERS).map((row) => {
    const id = String(row.id || '').trim();
    if (!id) return null;
    const from = String(row.fromDate || '').trim();
    const to = String(row.toDate || '').trim() || from;
    const staffId = String(row.staffId || '').trim();
    const shortName = staffShortName(staff, staffId, row.shortName);
    const payload = parseJsonCell(row.payloadJson, {});
    return {
      id,
      staffId,
      shortName,
      from,
      to,
      iso: from,
      note: String(row.note || '').trim(),
      type: String(row.type || '').trim(),
      ...payload,
    };
  }).filter(Boolean);
}

export function exportLeaveRows(entries, staff = []) {
  const rows = asArray(entries).map((entry) => {
    const from = entry.from || entry.iso || entry.fromDate || '';
    const to = entry.to || entry.toDate || from;
    const payload = payloadSlice(entry, LEAVE_PAYLOAD_KEYS);
    return {
      id: entry.id,
      staffId: staffIdForExport(entry, staff),
      shortName: entry.shortName || '',
      fromDate: from,
      toDate: to,
      note: entry.note || '',
      type: entry.type || '',
      payloadJson: Object.keys(payload).length ? JSON.stringify(payload) : '',
    };
  });
  return objectsToRows(rows, LEAVE_HEADERS);
}

export function importStudyRows(rows, staff = []) {
  return rowsToObjects(rows, STUDY_HEADERS).map((row) => {
    const id = String(row.id || '').trim();
    if (!id) return null;
    const from = String(row.fromDate || '').trim();
    const to = String(row.toDate || '').trim() || from;
    const staffId = String(row.staffId || '').trim();
    const shortName = staffShortName(staff, staffId, row.shortName);
    const payload = parseJsonCell(row.payloadJson, {});
    return {
      id,
      staffId,
      shortName,
      from,
      to,
      iso: from,
      note: String(row.note || '').trim(),
      ...payload,
    };
  }).filter(Boolean);
}

export function exportStudyRows(entries, staff = []) {
  const rows = asArray(entries).map((entry) => {
    const from = entry.from || entry.iso || entry.fromDate || '';
    const to = entry.to || entry.toDate || from;
    const payload = payloadSlice(entry, STUDY_PAYLOAD_KEYS);
    return {
      id: entry.id,
      staffId: staffIdForExport(entry, staff),
      shortName: entry.shortName || '',
      fromDate: from,
      toDate: to,
      note: entry.note || '',
      payloadJson: Object.keys(payload).length ? JSON.stringify(payload) : '',
    };
  });
  return objectsToRows(rows, STUDY_HEADERS);
}