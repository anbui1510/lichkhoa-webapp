/** Giá trị JSON/store đôi khi là object (key "0","1"…) thay vì mảng — tránh `.forEach is not a function`. */
export function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  if (typeof value === 'object') return Object.values(value);
  return [];
}

/** Một hàng lịch tuần: mảng ngày hoặc object chỉ số ngày. */
export function asGridDayRows(days) {
  if (Array.isArray(days)) return days;
  if (days && typeof days === 'object') {
    const keys = Object.keys(days).filter((k) => /^\d+$/.test(k));
    if (!keys.length) return asArray(days);
    keys.sort((a, b) => Number(a) - Number(b));
    return keys.map((k) => days[k]);
  }
  return [];
}

export function rowsToObjects(rows, headers) {
  const rowList = asArray(rows);
  if (!rowList.length) return [];
  const [first, ...rest] = rowList;
  const hdr = (Array.isArray(first) ? first : []).map((c) => String(c || '').trim());
  const useHeaders = hdr.some(Boolean) ? hdr : headers;
  const start = hdr.some(Boolean) ? rest : rowList;
  return start
    .filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== ''))
    .map((row) => {
      const obj = {};
      useHeaders.forEach((key, i) => {
        if (key) obj[key] = row[i] ?? '';
      });
      return obj;
    });
}

export function objectsToRows(objects, headers) {
  return [
    headers,
    ...asArray(objects).map((obj) => headers.map((h) => {
      const v = obj[h];
      if (v === undefined || v === null) return '';
      if (typeof v === 'object') return JSON.stringify(v);
      return v;
    })),
  ];
}

export function metaRowsToObject(rows) {
  const map = {};
  asArray(rows).forEach((row) => {
    const k = String(row[0] || '').trim();
    if (!k || k.startsWith('#')) return;
    map[k] = row[1] ?? '';
  });
  return map;
}

export function metaObjectToRows(meta) {
  return Object.entries(meta || {}).map(([k, v]) => [k, v ?? '']);
}

export function parseJsonCell(value, fallback) {
  const s = String(value ?? '').trim();
  if (!s) return fallback;
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

/** Ô JSON trên Sheet Task — luôn trả mảng nếu kỳ vọng danh sách. */
export function parseJsonArrayCell(value, fallback = []) {
  const parsed = parseJsonCell(value, fallback);
  return asArray(parsed).length ? asArray(parsed) : (Array.isArray(fallback) ? fallback : []);
}

export function numCell(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function boolCell(value) {
  if (value === true || value === 'true' || value === '1' || value === 'TRUE') return true;
  return false;
}
