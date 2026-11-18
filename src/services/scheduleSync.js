/**
 * F-210 — Client sync lịch: Sheet SoT qua proxy; localStorage chỉ cache.
 */

import { getToken } from '../features/account/services/accountApi';
import { saveStore } from '../store/dbStore';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

/** @typedef {'live'|'cache'|'stale'|'need-sync'} CacheStatus */

export const CACHE_STATUS = Object.freeze({
  LIVE: 'live',
  CACHE: 'cache',
  STALE: 'stale',
  NEED_SYNC: 'need-sync'
});

const STATUS_LABELS = {
  live: 'Sheet · trực tiếp',
  cache: 'Cache · local',
  stale: 'Cache · lệch/cũ',
  'need-sync': 'Chờ đồng bộ Sheet'
};

/**
 * @param {CacheStatus | string} status
 * @returns {string}
 */
export function cacheStatusLabel(status) {
  return STATUS_LABELS[status] || STATUS_LABELS.cache;
}

/**
 * Payload đồng bộ: subset store tương thích normalizeStore / ensureSheets.
 * @param {object} store
 */
export function toSyncPayload(store) {
  if (!store || typeof store !== 'object') return {};
  return {
    departments: store.departments || [],
    sheetsByDept: store.sheetsByDept || {},
    activeDeptId: store.activeDeptId || null,
    weeklySchedules: store.weeklySchedules || {},
    monthlySchedules: store.monthlySchedules || {}
  };
}

/**
 * @param {object | null | undefined} payload
 * @returns {boolean}
 */
export function isUsableSheetPayload(payload) {
  return Boolean(payload && Array.isArray(payload.departments) && payload.departments.length > 0);
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}), 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    const error = new Error('Không kết nối được API để đồng bộ lịch Sheet.');
    error.status = 0;
    throw error;
  }

  let data = null;
  const text = await response.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: `Lỗi máy chủ (${response.status}).` };
  }

  if (!response.ok) {
    const message =
      data && typeof data.error === 'string' && data.error.length < 220
        ? data.error
        : `Đồng bộ lịch thất bại (${response.status}).`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

/** GET /api/schedule/data */
export function fetchScheduleData() {
  return request('/schedule/data');
}

/**
 * PUT /api/schedule/data
 * @param {{ payload: object, baseRevision: number }} body
 */
export function pushScheduleData(body) {
  return request('/schedule/data', {
    method: 'PUT',
    body: JSON.stringify(body)
  });
}

/**
 * Boot: ưu tiên Sheet khi online + đã auth; localStorage chỉ cache.
 * @param {{
 *   localStore: object,
 *   linked: boolean,
 *   canWrite: boolean
 * }} opts
 * @returns {Promise<{
 *   store: object,
 *   revision: number,
 *   cacheStatus: CacheStatus,
 *   conflict: boolean,
 *   error: string | null
 * }>}
 */
export async function bootFromSheetOrCache({ localStore, linked }) {
  const fallback = {
    store: localStore,
    revision: 0,
    cacheStatus: CACHE_STATUS.CACHE,
    conflict: false,
    error: null
  };

  if (!getToken()) {
    return { ...fallback, cacheStatus: CACHE_STATUS.CACHE };
  }

  if (!linked) {
    return {
      ...fallback,
      cacheStatus: CACHE_STATUS.CACHE,
      error: null
    };
  }

  try {
    const data = await fetchScheduleData();
    const revision = Number(data?.revision) || 0;
    const payload = data?.payload && typeof data.payload === 'object' ? data.payload : {};

    if (isUsableSheetPayload(payload)) {
      saveStore(payload);
      return {
        store: payload,
        revision,
        cacheStatus: CACHE_STATUS.LIVE,
        conflict: false,
        error: null
      };
    }

    // Sheet trống (revision 0) — giữ cache local để seed PUT đầu; không coi local là SoT.
    if (revision === 0) {
      return {
        store: localStore,
        revision: 0,
        cacheStatus: CACHE_STATUS.NEED_SYNC,
        conflict: false,
        error: null
      };
    }

    saveStore(payload);
    return {
      store: payload,
      revision,
      cacheStatus: CACHE_STATUS.LIVE,
      conflict: false,
      error: null
    };
  } catch (err) {
    const status = err?.status;
    if (status === 409) {
      return {
        ...fallback,
        cacheStatus: CACHE_STATUS.CACHE,
        error: err.message || null
      };
    }
    if (status === 0 || status === 503 || status === 502) {
      return {
        ...fallback,
        cacheStatus: CACHE_STATUS.STALE,
        error: err.message || null
      };
    }
    return {
      ...fallback,
      cacheStatus: CACHE_STATUS.STALE,
      error: err.message || null
    };
  }
}

/**
 * Ghi cache local + PUT Sheet nếu có quyền.
 * @returns {Promise<{
 *   revision: number,
 *   cacheStatus: CacheStatus,
 *   conflict: boolean,
 *   error: string | null,
 *   skipped: boolean
 * }>}
 */
export async function persistStoreWithSheet({
  store,
  baseRevision,
  linked,
  canWrite
}) {
  saveStore(store);

  if (!getToken() || !linked) {
    return {
      revision: baseRevision || 0,
      cacheStatus: CACHE_STATUS.CACHE,
      conflict: false,
      error: null,
      skipped: true
    };
  }

  if (!canWrite) {
    return {
      revision: baseRevision || 0,
      cacheStatus: CACHE_STATUS.LIVE,
      conflict: false,
      error: null,
      skipped: true
    };
  }

  try {
    const result = await pushScheduleData({
      payload: toSyncPayload(store),
      baseRevision: Number(baseRevision) || 0
    });
    return {
      revision: Number(result?.revision) || (Number(baseRevision) || 0) + 1,
      cacheStatus: result?.conflict ? CACHE_STATUS.STALE : CACHE_STATUS.LIVE,
      conflict: Boolean(result?.conflict),
      error: result?.conflict
        ? 'Đã có bản Sheet mới hơn; máy này đã ghi đè (LWW). Nạp lại nếu cần.'
        : null,
      skipped: false
    };
  } catch (err) {
    const status = err?.status;
    if (status === 403) {
      return {
        revision: baseRevision || 0,
        cacheStatus: CACHE_STATUS.LIVE,
        conflict: false,
        error: err.message,
        skipped: true
      };
    }
    if (status === 409) {
      return {
        revision: baseRevision || 0,
        cacheStatus: CACHE_STATUS.CACHE,
        conflict: false,
        error: err.message,
        skipped: true
      };
    }
    return {
      revision: baseRevision || 0,
      cacheStatus: CACHE_STATUS.NEED_SYNC,
      conflict: false,
      error: err.message || 'Ghi Sheet thất bại; dữ liệu còn trên cache máy.',
      skipped: false
    };
  }
}
