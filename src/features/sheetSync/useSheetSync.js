import { useCallback, useEffect, useRef, useState } from 'react';
import { isSheetBackend } from '../../config/dataBackend';
import {
  getCloudMeta,
  isWeekNavigationFresh,
  normalizeStore,
  pruneToSingleActiveDept,
  saveStore,
  setCloudMeta,
  setCloudPushHandler,
  ensureBootstrapAdminStaff,
} from '../../store/dbStore';
import { getSpreadsheetId } from './sheetStorage';
import {
  bootstrapScheduleStore,
  canSyncScheduleStore,
  fetchSheetProfile,
  pullScheduleStore,
  pushScheduleStoreIfNotStale,
} from '../scheduleSync/scheduleStoreClient';
import { sheetSyncBlockers } from '../../config/sheetSyncEnv';
import { mergeDeptEntriesOnPull, mergeMonthLayoutOnPull, mergeWeekViewCursor } from '../../logic/weekCursorMerge.js';
import { mergeStaffOnPull } from '../../logic/staffPullMerge.js';
import { mergeTasksOnPull } from '../../logic/tasksPullMerge.js';
import { mergeStoreStaffLoginEmails } from '../../logic/sheetStore/staffIdentityMerge.js';
import { hasPendingSheetEdits, isEditQuietPeriod } from '../../logic/pendingSheetEdits.js';
import { hasSheetPreviewSession } from '../account/previewSession';
import { getGoogleIdToken } from './googleIdToken';

const PULL_INTERVAL_MS = 45_000;

/**
 * F-304 — bootstrap Sheet, pull/push, conflict hint.
 */
export function useSheetSync({
  syncAuthReady,
  accountLoading,
  accountEmail,
  accountFullName,
  sheetConnectionRevision,
  setStore,
  storeRef,
  ensureSheets,
}) {
  const [sheetSyncError, setSheetSyncError] = useState('');
  const [sheetSyncNotice, setSheetSyncNotice] = useState('');
  const [sheetSyncAt, setSheetSyncAt] = useState(() => getCloudMeta().updatedAt || '');
  const [bootstrapOpen, setBootstrapOpen] = useState(false);
  const [bootstrapBusy, setBootstrapBusy] = useState(false);
  const forcePullRef = useRef(false);
  const bootstrapCheckedRef = useRef(false);
  /** Chặn push lên Sheet trước khi pull lần đầu thành công (tránh xóa NhanSu). */
  const sheetHydratedRef = useRef(false);
  const pushInFlightRef = useRef(false);
  const pushAgainRef = useRef(false);

  const patchCloudUpdatedAt = useCallback((updatedAt) => {
    if (!updatedAt) return;
    const prev = getCloudMeta();
    const prevTs = prev.updatedAt ? new Date(prev.updatedAt).getTime() : 0;
    const nextTs = new Date(updatedAt).getTime() || 0;
    // Đang có sửa local (markStaffEdit…) — không lùi updatedAt theo Sheet cũ.
    if (nextTs < prevTs && hasPendingSheetEdits()) {
      return;
    }
    setCloudMeta({ ...prev, updatedAt });
  }, []);

  const markForcePull = useCallback(() => {
    forcePullRef.current = true;
    bootstrapCheckedRef.current = false;
    sheetHydratedRef.current = false;
  }, []);

  const applyRemotePayload = useCallback((remote, force) => {
    if (!remote?.payload?.departments) return false;
    const localMeta = getCloudMeta();
    const remoteTs = new Date(remote.updatedAt).getTime() || 0;
    const localTs = localMeta.updatedAt ? new Date(localMeta.updatedAt).getTime() : 0;
    // LWW bỏ qua payload đầy đủ — vẫn gộp loginEmail từ Sheet (sửa tay không đụng _meta).
    if (!force && localTs && remoteTs < localTs) {
      setStore((prev) => {
        const identity = mergeStoreStaffLoginEmails(prev, remote.payload);
        if (!identity.changed) return prev;
        const next = ensureSheets(identity.store);
        saveStore(next, { skipCloud: true });
        const dept = next.departments?.[0];
        if ((dept?.staff?.length || 0) > 0) sheetHydratedRef.current = true;
        return next;
      });
      return false;
    }
    let applied = false;
    setStore((prev) => {
      let next = ensureSheets(pruneToSingleActiveDept(normalizeStore(remote.payload)));
      // Luôn giữ cursor tuần/tháng đang xem khi đã có local — kể cả force pull
      // (trừ lần hydrate đầu chưa có store). F5 reset qua viewSessionCursors.
      if (prev?.sheetsByDept) {
        next = ensureSheets(mergeWeekViewCursor(prev, next));
      }
      // NhanSu / roomTable / Task / nghỉ / cath vừa sửa — không để pull Sheet (cũ) đè trước khi push kịp.
      // Kể cả force: vẫn giữ bản local khi mark còn TTL (tránh «Đồng bộ» xóa hàng vừa thêm).
      next = ensureSheets(mergeStaffOnPull(prev, next));
      next = ensureSheets(mergeTasksOnPull(prev, next));
      next = ensureSheets(mergeDeptEntriesOnPull(prev, next));
      next = ensureSheets(mergeMonthLayoutOnPull(prev, next));
      saveStore(next, { skipCloud: true });
      applied = true;
      return next;
    });
    if (!applied) return false;
    patchCloudUpdatedAt(remote.updatedAt);
    setSheetSyncAt(remote.updatedAt);
    setSheetSyncError('');
    const dept = remote.payload.departments?.[0];
    if ((dept?.staff?.length || 0) > 0) sheetHydratedRef.current = true;
    return true;
  }, [ensureSheets, patchCloudUpdatedAt, setStore]);

  const refreshSyncBlockerNotice = useCallback(() => {
    if (!isSheetBackend() || !getSpreadsheetId()) return;
    const blockers = sheetSyncBlockers({
      previewSession: hasSheetPreviewSession(),
      googleSignedIn: Boolean(getGoogleIdToken()),
    });
    if (blockers.length) {
      setSheetSyncNotice(blockers.join(' '));
    }
  }, []);

  const pullFromSheet = useCallback(async (force = false) => {
    if (!syncAuthReady || !getSpreadsheetId()) return;
    // Vừa sửa NhanSu / bệnh phòng — đợi push ghi Sheet trước (tránh đè + hủy debounce push).
    if (!force && !forcePullRef.current && isEditQuietPeriod()) return;
    if (!(await canSyncScheduleStore())) {
      refreshSyncBlockerNotice();
      return;
    }
    try {
      const remote = await pullScheduleStore(storeRef.current);
      const did = applyRemotePayload(remote, force || forcePullRef.current);
      if (forcePullRef.current) forcePullRef.current = false;
      if (did) setSheetSyncNotice('');
    } catch (error) {
      setSheetSyncError(error?.message || 'Không kéo được dữ liệu từ Sheet.');
    }
  }, [applyRemotePayload, refreshSyncBlockerNotice, storeRef, syncAuthReady]);

  useEffect(() => {
    if (!isSheetBackend() || accountLoading || !getSpreadsheetId()) return;
    refreshSyncBlockerNotice();
  }, [accountLoading, refreshSyncBlockerNotice, sheetConnectionRevision, syncAuthReady]);

  const runBootstrap = useCallback(async () => {
    if (!syncAuthReady || !getSpreadsheetId()) return;
    setBootstrapBusy(true);
    setSheetSyncError('');
    try {
      let prepared = ensureBootstrapAdminStaff(storeRef.current, {
        email: accountEmail,
        fullName: accountFullName,
      });
      const res = await bootstrapScheduleStore(prepared);
      if (res?.updatedAt) {
        patchCloudUpdatedAt(res.updatedAt);
        setSheetSyncAt(res.updatedAt);
      }
      const normalized = ensureSheets(normalizeStore(prepared));
      setStore(normalized);
      saveStore(normalized, { skipCloud: true });
      setBootstrapOpen(false);
      bootstrapCheckedRef.current = true;
      sheetHydratedRef.current = true;
      await pullFromSheet(true);
    } catch (error) {
      setSheetSyncError(error?.message || 'Thiết lập Sheet thất bại.');
    } finally {
      setBootstrapBusy(false);
    }
  }, [
    accountEmail,
    accountFullName,
    patchCloudUpdatedAt,
    pullFromSheet,
    setStore,
    storeRef,
    syncAuthReady,
  ]);

  // Profile + bootstrap vs pull sau login / đổi sổ
  useEffect(() => {
    if (!isSheetBackend() || accountLoading || !syncAuthReady || !getSpreadsheetId()) {
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        if (!(await canSyncScheduleStore())) {
          refreshSyncBlockerNotice();
          return;
        }
        const profile = await fetchSheetProfile();
        if (cancelled) return;
        if (profile?.bootstrapEligible) {
          bootstrapCheckedRef.current = true;
          setBootstrapOpen(true);
          return;
        }
        bootstrapCheckedRef.current = true;
        if (forcePullRef.current || !getCloudMeta().updatedAt) {
          const remote = await pullScheduleStore(storeRef.current);
          if (cancelled) return;
          if (!remote?.payload?.departments) {
            setSheetSyncNotice('Không đọc được dữ liệu từ Sheet — không ghi đè. Kiểm tra tab NhanSu/Task.');
            return;
          }
          applyRemotePayload(remote, forcePullRef.current || !getCloudMeta().updatedAt);
          if (forcePullRef.current) forcePullRef.current = false;
        } else {
          await pullFromSheet(forcePullRef.current);
        }
      } catch (error) {
        if (!cancelled) {
          setSheetSyncError(error?.message || 'Lỗi đồng bộ Sheet.');
        }
        if (forcePullRef.current) forcePullRef.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    accountLoading,
    syncAuthReady,
    accountEmail,
    sheetConnectionRevision,
    applyRemotePayload,
    pullFromSheet,
    refreshSyncBlockerNotice,
    storeRef,
  ]);

  // Push debounced từ saveStore — kiểm tra remote mới hơn trước khi ghi
  useEffect(() => {
    if (!isSheetBackend()) return undefined;

    const runPush = async (_snapshot) => {
      // Luôn lấy store mới nhất — tránh debounce push bản cũ sau khi pull xen giữa.
      const nextStore = storeRef.current;
      if (!nextStore) return;
      if (!syncAuthReady) return;
      if (!sheetHydratedRef.current) return;
      if (!(await canSyncScheduleStore())) return;
      if (bootstrapOpen) return;
      if (pushInFlightRef.current) {
        pushAgainRef.current = true;
        return;
      }
      pushInFlightRef.current = true;
      pushAgainRef.current = false;
      try {
        const result = await pushScheduleStoreIfNotStale(nextStore);
        if (result?.outcome === 'skipped_remote_newer') {
          if (hasPendingSheetEdits()) {
            setSheetSyncNotice('Sheet có bản mới hơn nhưng đang giữ sửa local — thử Đồng bộ sau vài giây.');
            return;
          }
          setSheetSyncNotice('Sheet Google mới hơn — đã bỏ qua ghi đè. Bấm «Đồng bộ từ Sheet».');
          if (!isWeekNavigationFresh()) await pullFromSheet(true);
          return;
        }
        if (result?.outcome === 'pushed' && result.updatedAt) {
          // Chỉ gộp loginEmail vào store hiện tại — không restore snapshot lúc bắt đầu push
          // (tránh hoàn tác «Tuần sau» khi push còn đang chạy).
          if (result.identityFromRemote) {
            setStore((prev) => {
              const merged = mergeStoreStaffLoginEmails(prev, result.identityFromRemote);
              if (!merged.changed) return prev;
              const next = ensureSheets(merged.store);
              saveStore(next, { skipCloud: true });
              return next;
            });
          }
          // Không clear roomTable/staff/dept/month marks sau push — pull kế tiếp
          // còn cần giữ bản local đến khi Sheet kịp có cùng dữ liệu (TTL).
          patchCloudUpdatedAt(result.updatedAt);
          setSheetSyncAt(result.updatedAt);
          setSheetSyncNotice('');
          setSheetSyncError('');
        }
      } catch (error) {
        setSheetSyncError(error?.message || 'Không ghi được lên Sheet.');
      } finally {
        pushInFlightRef.current = false;
        if (pushAgainRef.current) {
          pushAgainRef.current = false;
          if (storeRef.current) void runPush(storeRef.current);
        }
      }
    };

    setCloudPushHandler(runPush);
    return () => setCloudPushHandler(null);
  }, [bootstrapOpen, ensureSheets, patchCloudUpdatedAt, pullFromSheet, setStore, storeRef, syncAuthReady]);

  // Pull định kỳ + khi quay lại tab
  useEffect(() => {
    if (!isSheetBackend() || !syncAuthReady || bootstrapOpen) return undefined;

    const onVisible = () => {
      if (document.visibilityState === 'visible') pullFromSheet(false);
    };
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') pullFromSheet(false);
    }, PULL_INTERVAL_MS);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [bootstrapOpen, pullFromSheet, syncAuthReady]);

  const manualPull = useCallback(() => {
    forcePullRef.current = true;
    return pullFromSheet(true);
  }, [pullFromSheet]);

  return {
    sheetSyncError,
    sheetSyncNotice,
    sheetSyncAt,
    bootstrapOpen,
    setBootstrapOpen,
    bootstrapBusy,
    runBootstrap,
    manualPull,
    markForcePull,
  };
}
