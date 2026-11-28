import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { TaskPalette } from './components/TaskPalette';
import { SheetView } from './components/SheetView';
import { CalendarView } from './components/CalendarView';
import { FairnessDashboard } from './components/FairnessDashboard';
import { StaffManager } from './components/StaffManager';
import { TaskManager } from './components/TaskManager';
import { MobileShell } from './components/mobile/MobileShell';
import { AccountPage } from './features/account/pages/AccountPage';
import { LoginGate } from './features/account/components/LoginGate';
import { NotificationsPanel } from './features/account/components/NotificationsPanel';
import { useAccount } from './features/account/hooks/useAccount';
import {
  clearSessionNotice,
  getSessionNotice,
  isSessionReady
} from './features/account/sessionAuth';
import { useViewportWidth } from './hooks/useViewportWidth';

import {
  getInitialStore,
  normalizeStore,
  pruneToSingleActiveDept,
  saveStore,
  setCloudMeta,
  markWeekNavigation,
  markMonthNavigation,
  clearWeekNavigationMark,
  setCloudPushHandler,
} from './store/dbStore';
import { getCategoriesForDept } from './store/constants';
import { generateWeeklySchedule, buildWeekDays, emptyWeekGrid, normalizeWeekStartIso } from './logic/schedulerEngine';
import { lockConflictMessages, pruneResolvedAlerts, resolveLockedCell, sameAlerts } from './logic/warningResolve';
import { roomTableOf } from './components/RoomSheet';
import {
  mondayOf,
  columnSpecs,
  currentMonthKey,
  customCellKey,
  ensureMonthRolesFromGrid,
  normalizeDaySessions,
  shiftMonthKey,
  resolveMonthRoles,
  sessionCellKey,
} from './logic/monthSchedule';
import { cathCellKey, localCathRoles } from './logic/cathSchedule';
import { buBaseline, buCatchUp, buGrantDeltas } from './logic/buLedger';
import { matchTask } from './logic/taskMatch';
import {
  canEdit,
  canEditSheetConnection,
  findLinkedStaff,
  firstNav,
  needsStaffLink,
  resolveActor,
  visibleNav,
} from './logic/access';
import { missingPrimaryWarnings } from './logic/roomDuty';
import { filterFalseScheduleWarnings } from './logic/falseWarnings';
import {
  isWeekPublished,
  shouldMaskWeekForViewer,
  WEEK_STATUS_DRAFT,
  WEEK_STATUS_PUBLISHED,
  withWeekPublishStatus
} from './logic/weekPublish';
import { formatLockAtLabel, isLeaveWindowOpen } from './logic/editWindows';
import { canMutateLeaveEntry, resolveActorLeaveKeys } from './logic/leaveOwnership';
import { ConfirmDialog } from './components/ConfirmDialog';
import {
  bootFromSheetOrCache,
  cacheStatusLabel,
  CACHE_STATUS,
  persistStoreWithSheet
} from './services/scheduleSync';
import { resolveUiMode } from './logic/uiMode';
import { isSheetBackend } from './config/dataBackend';
import { getToken } from './features/account/services/accountApi';
import { ConnectSheetDialog } from './features/sheetSync/ConnectSheetDialog';
import { BootstrapKhoaDialog } from './features/sheetSync/BootstrapKhoaDialog';
import { KhoaDiscoveryDialog } from './features/sheetSync/KhoaDiscoveryDialog';
import { useKhoaDiscovery } from './features/sheetSync/useKhoaDiscovery';
import { useSheetSync } from './features/sheetSync/useSheetSync';
import { hospitalCatalogEnabled } from './config/hospitalCatalog';
import { getGoogleIdToken } from './features/sheetSync/googleIdToken';
import { hasSheetPreviewSession } from './features/account/previewSession';
import {
  ensureSpreadsheetFromTenant,
  getSpreadsheetId,
  setSpreadsheetConnection
} from './features/sheetSync/sheetStorage';
import { listTenantRegistry, resolveTenant, tenantDepartmentOptions } from './config/tenant';
import {
  getActiveKhoaSlug,
  resolveKhoaEntry,
  setActiveKhoaSlug,
} from './features/sheetSync/khoaRegistry';
import { listSavedSheets, rememberSavedSheet } from './features/sheetSync/savedSheetRegistry';
import { gateBranding, sessionDeptDisplayName } from './config/appBranding';
import { asArray } from './logic/sheetStore/tableUtils';

const DEFAULT_START_DATE = '2026-09-14'; // Monday 14/09/2026

// ---------- Sheet helpers ----------
function blankSheetContent(dept, startDate) {
  return {
    startDate,
    grid: emptyWeekGrid(dept.staff, ['S', 'C']),
    roomAssignments: {},
    roomWarnings: [],
    warnings: [],
    buGrants: {},
    buPosted: {},
    leaveCuts: { bu: {}, phep: {} },
    publishStatus: 'draft',
    auditLog: [],
    monthRoles: [],
    monthGrid: {},
  };
}

function weekRecord(sh) {
  return {
    grid: sh.grid,
    warnings: sh.warnings || [],
    roomWarnings: sh.roomWarnings || [],
    buGrants: sh.buGrants || {},
    buPosted: sh.buPosted || {},
    leaveCuts: sh.leaveCuts || { bu: {}, phep: {} },
    publishStatus: sh.publishStatus || 'published'
  };
}

function openWeek(sh, startDate, staff) {
  const weeks = { ...(sh.weeks || {}) };
  if (sh.startDate) weeks[sh.startDate] = weekRecord(sh);
  const saved = weeks[startDate];
  const fresh = !saved;
  return {
    ...sh,
    weeks,
    startDate,
    ...(saved || {
      grid: emptyWeekGrid(staff, sh.daySessions),
      warnings: [],
      roomWarnings: [],
      buGrants: {},
      buPosted: {},
      leaveCuts: { bu: {}, phep: {} },
      publishStatus: 'draft'
    }),
    buGrants: fresh ? {} : (saved.buGrants || {}),
    buPosted: fresh || !Object.prototype.hasOwnProperty.call(saved, 'buPosted')
      ? (fresh ? {} : undefined)
      : (saved.buPosted || {}),
    leaveCuts: (saved && saved.leaveCuts) || { bu: {}, phep: {} },
    publishStatus: fresh ? 'draft' : (saved.publishStatus || sh.publishStatus || 'published')
  };
}

function applyBuDeltas(staff, deltas) {
  if (!deltas || !Object.keys(deltas).length) return staff;
  let changed = false;
  const next = asArray(staff).map((person) => {
    const delta = Number(deltas[person.shortName]) || 0;
    if (!delta) return person;
    changed = true;
    return {
      ...person,
      buBalance: +((Number(person.buBalance) || 0) + delta).toFixed(1)
    };
  });
  return changed ? next : staff;
}

function settleSheetLedger(sh, payGap) {
  const weeks = { ...(sh.weeks || {}) };
  let weeksChanged = false;
  Object.keys(weeks).forEach((key) => {
    if (key === sh.startDate) return;
    const saved = weeks[key];
    if (!saved || Object.prototype.hasOwnProperty.call(saved, 'buPosted')) return;
    weeks[key] = { ...saved, buPosted: { ...(saved.buGrants || {}) } };
    weeksChanged = true;
  });
  if (sh.buPosted) {
    return weeksChanged ? { sheet: { ...sh, weeks }, deltas: {} } : { sheet: sh, deltas: {} };
  }
  const deltas = payGap ? buCatchUp(sh) : {};
  const buPosted = { ...(sh.buGrants || {}) };
  if (sh.startDate) {
    const current = weeks[sh.startDate];
    weeks[sh.startDate] = current
      ? { ...current, buPosted }
      : {
        grid: sh.grid,
        warnings: sh.warnings || [],
        roomWarnings: sh.roomWarnings || [],
        buGrants: sh.buGrants || {},
        buPosted,
        leaveCuts: sh.leaveCuts || { bu: {}, phep: {} }
      };
  }
  return { sheet: { ...sh, weeks, buPosted }, deltas };
}

function weekSources(sheets) {
  const sources = [];
  asArray(sheets).forEach((sheet) => {
    sources.push({ startDate: sheet.startDate, grid: sheet.grid });
    Object.entries(sheet.weeks || {}).forEach(([startDate, saved]) => {
      sources.push({ startDate, grid: saved?.grid });
    });
  });
  return sources;
}

function nextSheetName(sheets, base = 'Sheet') {
  let n = sheets.length + 1;
  const names = new Set(sheets.map(s => s.name.toLowerCase()));
  while (names.has(`${base} ${n}`.toLowerCase())) n++;
  return `${base} ${n}`;
}

// Đảm bảo mỗi khoa có ít nhất 1 sheet
function ensureSheets(store) {
  const sheetsByDept = { ...(store.sheetsByDept || {}) };
  const deptList = asArray(store.departments);
  let departments = deptList;
  deptList.forEach(dept => {
    const st = sheetsByDept[dept.id];
    const sheetList = asArray(st?.sheets);
    if (!st || sheetList.length === 0) {
      const id = `sheet_${dept.id}_1`;
      sheetsByDept[dept.id] = {
        activeSheetId: id,
        sheets: [{ id, name: 'Sheet 1', ...blankSheetContent(dept, DEFAULT_START_DATE) }]
      };
      return;
    }
    const activeId = sheetList.some(s => s.id === st.activeSheetId) ? st.activeSheetId : sheetList[0].id;
    let sheetChanged = false;
    const sheets = sheetList.map((sh) => {
      const { sheet, deltas } = settleSheetLedger(sh, sh.id === activeId);
      if (sheet !== sh) sheetChanged = true;
      if (sh.id === activeId && Object.keys(deltas).length) {
        departments = departments.map(item => (
          item.id === dept.id ? { ...item, staff: applyBuDeltas(item.staff, deltas) } : item
        ));
      }
      return sheet;
    });
    if (sheetChanged || activeId !== st.activeSheetId) {
      sheetsByDept[dept.id] = { ...st, activeSheetId: activeId, sheets };
    }
  });
  return { ...store, departments, sheetsByDept };
}

function applyThemeClass(next) {
  const root = document.documentElement;
  const body = document.body;
  if (next === 'light') {
    body.classList.add('light-theme');
    body.classList.remove('dark-theme');
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  } else {
    body.classList.add('dark-theme');
    body.classList.remove('light-theme');
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  }
}

export function App() {
  const [store, setStore] = useState(() => ensureSheets(getInitialStore()));
  const [activeView, setActiveView] = useState('SHEET'); // 'SHEET' | 'CALENDAR' | 'DASHBOARD' | 'STAFF' | 'TASKS' | 'ACCOUNT'
  const [accountSection, setAccountSection] = useState('profile');
  const [notifOpen, setNotifOpen] = useState(false);
  const [theme, setTheme] = useState('light');
  const [cacheStatus, setCacheStatus] = useState(CACHE_STATUS.CACHE);
  const [syncHint, setSyncHint] = useState('');
  const [sheetConflictOpen, setSheetConflictOpen] = useState(false);
  const [sheetBooted, setSheetBooted] = useState(false);
  const sheetRevisionRef = useRef(0);
  const skipNextPersistRef = useRef(true);
  const [sheetConnectOpen, setSheetConnectOpen] = useState(false);
  const [sheetConnectionRevision, setSheetConnectionRevision] = useState(0);
  const [loginBusy, setLoginBusy] = useState(false);
  const [sessionNotice, setSessionNoticeState] = useState(() => getSessionNotice());

  // Default = full white (navbar, sidebar, sheet chrome — not only the grid)
  useEffect(() => {
    applyThemeClass('light');
  }, []);

  useEffect(() => {
    if (isSheetBackend()) ensureSpreadsheetFromTenant();
  }, []);

  useEffect(() => {
    if (!isSheetBackend()) return;
    setStore((prev) => {
      const next = pruneToSingleActiveDept(prev);
      return next === prev ? prev : ensureSheets(next);
    });
  }, []);

  const onThemeFromSettings = useCallback((darkMode) => {
    // After migrateThemeLightDefault, saved darkMode starts false.
    // User can still turn dark on via the sun/moon toggle.
    const next = darkMode === true ? 'dark' : 'light';
    setTheme(next);
    applyThemeClass(next);
  }, []);

  const account = useAccount({ onThemeFromSettings });

  // Save after a short pause so a click or keystroke does not stringify the whole store first.
  const storeRef = useRef(store);
  storeRef.current = store;

  const syncAuthReady = isSessionReady({
    backend: isSheetBackend() ? 'sheet' : 'api',
    token: getToken(),
    googleToken: getGoogleIdToken(),
    sheetPreview: hasSheetPreviewSession(),
    user: account.user,
    offline: account.offline
  });

  useEffect(() => {
    if (syncAuthReady) {
      clearSessionNotice();
      setSessionNoticeState('');
    } else {
      setSessionNoticeState(getSessionNotice());
    }
  }, [syncAuthReady, account.user, account.loading]);

  const sheetSync = useSheetSync({
    syncAuthReady,
    accountLoading: account.loading,
    accountEmail: account.user?.email,
    accountFullName: account.user?.fullName || account.profile?.fullName,
    sheetConnectionRevision,
    setStore,
    storeRef,
    ensureSheets,
  });

  const handlePickCatalogKhoa = useCallback((entry) => {
    if (!entry?.spreadsheetId) return;
    setActiveKhoaSlug(entry.slug);
    setSpreadsheetConnection(`https://docs.google.com/spreadsheets/d/${entry.spreadsheetId}/edit`);
    rememberSavedSheet(entry.spreadsheetId, entry.label || '');
    setCloudMeta({});
    sheetSync.markForcePull();
    setSheetConnectionRevision((rev) => rev + 1);
  }, [sheetSync.markForcePull]);

  const khoaDiscovery = useKhoaDiscovery({
    syncAuthReady,
    accountEmail: account.user?.email,
    onPickKhoa: handlePickCatalogKhoa,
  });

  const handleDeptIdentitySave = useCallback(async ({ id, name, code }) => {
    setStore((prev) => {
      const oldId = prev.activeDeptId || prev.departments?.[0]?.id;
      const departments = (prev.departments || []).map((d) => (
        d.id === oldId ? { ...d, id, name, code } : d
      ));
      const sheetsByDept = { ...(prev.sheetsByDept || {}) };
      if (oldId && id && oldId !== id && sheetsByDept[oldId]) {
        sheetsByDept[id] = sheetsByDept[oldId];
        delete sheetsByDept[oldId];
      }
      const next = ensureSheets({
        ...prev,
        activeDeptId: id,
        departments,
        sheetsByDept,
      });
      saveStore(next);
      return next;
    });
  }, [ensureSheets]);

  const handleSheetConnectionSave = useCallback(async (url) => {
    if (!window.confirm(
      'Đổi sổ sẽ đồng bộ lịch từ Google Sheet mới. Dữ liệu hiển thị sẽ theo file đó. Tiếp tục?'
    )) {
      return;
    }
    setSpreadsheetConnection(url);
    setCloudMeta({});
    sheetSync.markForcePull();
    setSheetConnectionRevision((rev) => rev + 1);
  }, [sheetSync.markForcePull]);

  const khoaRegistry = useMemo(() => listTenantRegistry(), []);
  const catalogKhoaRegistry = khoaDiscovery.catalogEntries;
  const effectiveKhoaRegistry = khoaRegistry.length ? khoaRegistry : catalogKhoaRegistry;
  const hospitalKhoaSwitch = isSheetBackend() && effectiveKhoaRegistry.length > 1;

  const handleSelectKhoa = useCallback((slug) => {
    const entry = resolveKhoaEntry(slug)
      || catalogKhoaRegistry.find((e) => e.slug === slug);
    if (!entry?.spreadsheetId) return;
    const currentSlug = getActiveKhoaSlug();
    if (currentSlug === entry.slug && getSpreadsheetId() === entry.spreadsheetId) return;
    setActiveKhoaSlug(entry.slug);
    setSpreadsheetConnection(`https://docs.google.com/spreadsheets/d/${entry.spreadsheetId}/edit`);
    setCloudMeta({});
    sheetSync.markForcePull();
    setSheetConnectionRevision((rev) => rev + 1);
  }, [catalogKhoaRegistry, sheetSync.markForcePull]);

  // F-303: push Postgres khi API backend và chưa dùng F-210 SoT link
  useEffect(() => {
    if (isSheetBackend()) return undefined;
    const soTLinked = Boolean(
      account.scheduleConfig?.linked && account.scheduleConfig?.spreadsheetId
    );
    if (soTLinked) {
      setCloudPushHandler(null);
      return undefined;
    }
    setCloudPushHandler(async (nextStore) => {
      if (!syncAuthReady) return;
      const { pushScheduleStore } = await import('./features/scheduleSync/scheduleStoreClient');
      const res = await pushScheduleStore(nextStore);
      if (res?.updatedAt) setCloudMeta({ updatedAt: res.updatedAt });
    });
    return () => setCloudPushHandler(null);
  }, [syncAuthReady, account.scheduleConfig?.linked, account.scheduleConfig?.spreadsheetId]);

  const sheetSyncBanner = isSheetBackend() && (sheetSync.sheetSyncError || sheetSync.sheetSyncNotice) ? (
    <div
      className="sheet-sync-banner"
      role="status"
      style={{
        padding: '8px 16px',
        fontSize: '0.85rem',
        background: sheetSync.sheetSyncError ? 'var(--destructive, #fee2e2)' : 'var(--muted, #f1f5f9)',
        color: sheetSync.sheetSyncError ? '#991b1b' : 'inherit',
        borderBottom: '1px solid var(--border, #e2e8f0)',
      }}
    >
      {sheetSync.sheetSyncError || sheetSync.sheetSyncNotice}
    </div>
  ) : null;

  const sheetSyncTitle = sheetSync.sheetSyncAt
    ? `Đồng bộ từ Sheet (lần cuối ${new Date(sheetSync.sheetSyncAt).toLocaleString('vi-VN')})`
    : 'Đồng bộ từ Google Sheet';

  // Active Department Data
  const activeDept = store.departments.find(d => d.id === store.activeDeptId) || store.departments[0];
  const staffList = activeDept?.staff || [];
  const taskList = activeDept?.tasks || [];
  const roster = useMemo(
    () => store.departments.flatMap(dept => (dept.staff || []).map(person => ({
      ...person,
      deptId: dept.id,
      deptName: dept.name
    }))),
    [store.departments]
  );
  const actor = useMemo(() => resolveActor(account.user, roster), [account.user, roster]);
  const needsSheetConnect = useMemo(() => {
    if (hospitalCatalogEnabled()) return false;
    if (!isSheetBackend() || !syncAuthReady || hasSheetPreviewSession()) return false;
    ensureSpreadsheetFromTenant();
    return !getSpreadsheetId();
  }, [syncAuthReady, sheetConnectionRevision]);

  useEffect(() => {
    if (!isSheetBackend() || !syncAuthReady) return;
    ensureSpreadsheetFromTenant();
  }, [syncAuthReady, sheetConnectionRevision]);

  const linkedStaff = useMemo(
    () => findLinkedStaff(account.user, roster),
    [account.user, roster]
  );
  const navbarDepartments = useMemo(() => {
    if (isSheetBackend()) return activeDept ? [activeDept] : [];
    return store.departments;
  }, [store.departments, activeDept]);
  const savedSheets = useMemo(() => listSavedSheets(), [sheetConnectionRevision]);
  const localSheetSwitch = isSheetBackend() && !hospitalKhoaSwitch && savedSheets.length >= 2;
  const sheetKhoaSwitch = hospitalKhoaSwitch || localSheetSwitch;

  const handleSelectSavedSheet = useCallback((spreadsheetId) => {
    const id = String(spreadsheetId || '').trim();
    if (!id || getSpreadsheetId() === id) return;
    const saved = listSavedSheets().find((e) => e.spreadsheetId === id);
    setSpreadsheetConnection(`https://docs.google.com/spreadsheets/d/${id}/edit`);
    rememberSavedSheet(id, saved?.label || activeDept?.name || '');
    setCloudMeta({});
    sheetSync.markForcePull();
    setSheetConnectionRevision((rev) => rev + 1);
  }, [activeDept?.name, sheetSync.markForcePull]);

  useEffect(() => {
    if (!isSheetBackend()) return;
    const id = getSpreadsheetId();
    const name = activeDept?.name;
    if (id && name) rememberSavedSheet(id, name);
  }, [activeDept?.name, activeDept?.id, sheetConnectionRevision]);

  const activeKhoaEntry = useMemo(() => {
    if (!hospitalKhoaSwitch && effectiveKhoaRegistry.length <= 1) {
      return effectiveKhoaRegistry[0] || null;
    }
    if (!hospitalKhoaSwitch) return null;
    const slug = getActiveKhoaSlug();
    return (
      resolveKhoaEntry(slug)
      || catalogKhoaRegistry.find((e) => e.slug === slug)
      || effectiveKhoaRegistry[0]
      || null
    );
  }, [hospitalKhoaSwitch, khoaRegistry, catalogKhoaRegistry, effectiveKhoaRegistry, sheetConnectionRevision]);
  const activeSavedSheet = useMemo(() => {
    if (!localSheetSwitch) return null;
    const id = getSpreadsheetId();
    return savedSheets.find((e) => e.spreadsheetId === id) || null;
  }, [localSheetSwitch, savedSheets, sheetConnectionRevision]);
  const navbarSelectorDepartments = useMemo(() => {
    if (hospitalKhoaSwitch) {
      return effectiveKhoaRegistry.map((entry) => ({ id: entry.slug, name: entry.label }));
    }
    if (localSheetSwitch) {
      return savedSheets.map((entry) => ({
        id: entry.spreadsheetId,
        name: entry.label || activeDept?.name || `Sổ …${entry.spreadsheetId.slice(-6)}`,
      }));
    }
    return navbarDepartments;
  }, [hospitalKhoaSwitch, localSheetSwitch, effectiveKhoaRegistry, savedSheets, navbarDepartments, activeDept?.name]);
  const navbarActiveDept = hospitalKhoaSwitch
    ? { id: activeKhoaEntry?.slug, name: activeKhoaEntry?.label || activeDept?.name || 'Khoa' }
    : localSheetSwitch
      ? {
        id: getSpreadsheetId(),
        name: activeSavedSheet?.label || activeDept?.name || 'Khoa',
      }
      : activeDept;
  const hideDeptSelector = sheetKhoaSwitch
    ? false
    : ((actor.kind === 'member' && Boolean(linkedStaff?.deptId))
      || (isSheetBackend() && navbarDepartments.length <= 1));
  const gateBrand = useMemo(() => gateBranding(), []);
  const sessionTitle = useMemo(
    () => (
      hospitalKhoaSwitch && activeKhoaEntry?.label
        ? activeKhoaEntry.label
        : sessionDeptDisplayName(activeDept, linkedStaff)
    ),
    [hospitalKhoaSwitch, activeKhoaEntry?.label, activeDept, linkedStaff]
  );

  useEffect(() => {
    if (sheetKhoaSwitch) return;
    const deptId = linkedStaff?.deptId;
    if (!deptId) return;
    setStore((prev) => {
      if (prev.activeDeptId === deptId) return prev;
      return ensureSheets({ ...prev, activeDeptId: deptId });
    });
  }, [sheetKhoaSwitch, linkedStaff?.deptId]);

  const allow = (tab) => canEdit(actor, tab);
  const allowBook = () => allow('week') || allow('month');
  const sheetLinked = Boolean(
    account.scheduleConfig?.linked && account.scheduleConfig?.spreadsheetId
  );
  // F-210 LWW SoT chỉ khi API backend; F-304 dùng useSheetSync khi sheet backend
  const useF210SoT = !isSheetBackend() && sheetLinked;
  const leaveWindowOpen = isLeaveWindowOpen(account.scheduleConfig);
  const leaveKeys = useMemo(
    () => resolveActorLeaveKeys(account.user, staffList, account.rosterPeople),
    [account.user, staffList, account.rosterPeople]
  );
  const isModOrAdminRole = (() => {
    const role = String(account.user?.role || '');
    return role === 'Admin' || role === 'Mod';
  })();
  const canWriteSheet = (() => {
    if (isModOrAdminRole) return true;
    // F-214: User ghi SoT khi cửa sổ nghỉ còn mở (LWW + conflict dialog như Mod).
    const role = String(account.user?.role || '');
    return role === 'User' && leaveWindowOpen && useF210SoT;
  })();
  const canManagePublish = isModOrAdminRole;
  const leaveLockedForMember = actor.kind === 'member' && !leaveWindowOpen;
  const leaveLockBanner = {
    leaveWindowOpen,
    leaveLockedForMember,
    leaveLabel: formatLockAtLabel(account.scheduleConfig?.leaveLockAt),
    monthLabel: formatLockAtLabel(account.scheduleConfig?.monthLockAt)
  };

  const reloadFromSheet = useCallback(async () => {
    if (!useF210SoT) return;
    const local = storeRef.current || ensureSheets(getInitialStore());
    const result = await bootFromSheetOrCache({
      localStore: local,
      linked: sheetLinked
    });
    sheetRevisionRef.current = result.revision || 0;
    setCacheStatus(result.cacheStatus);
    setSyncHint(result.error || '');
    skipNextPersistRef.current = true;
    setStore(ensureSheets(normalizeStore(result.store)));
    setSheetConflictOpen(false);
  }, [sheetLinked, useF210SoT]);

  useEffect(() => {
    if (activeView === 'ACCOUNT') return;
    const allowed = visibleNav(actor);
    if (!allowed.includes(activeView)) setActiveView(allowed[0] || 'ACCOUNT');
  }, [activeView, actor]);
  const categories = useMemo(() => getCategoriesForDept(activeDept), [activeDept]);

  // Active Sheet Data
  const sheetState = store.sheetsByDept[activeDept.id];
  const sheets = sheetState.sheets;
  const activeSheet = sheets.find(s => s.id === sheetState.activeSheetId) || sheets[0];
  const weekMasked = shouldMaskWeekForViewer(activeSheet, account.user, actor);
  const scheduleData = useMemo(() => {
    const weekStart = normalizeWeekStartIso(activeSheet.startDate);
    const days = buildWeekDays(weekStart);
    const monthRoles = ensureMonthRolesFromGrid(activeSheet.monthRoles, activeSheet.monthGrid);
    const withMonth = (base) => (
      monthRoles.length !== (activeSheet.monthRoles || []).length
        ? { ...base, monthRoles, monthRolesRecovered: true }
        : { ...base, monthRoles }
    );
    if (!weekMasked) {
      return withMonth({ ...activeSheet, startDate: weekStart, days });
    }
    return withMonth({
      ...activeSheet,
      startDate: weekStart,
      days,
      grid: emptyWeekGrid(staffList, activeSheet.daySessions),
      warnings: [],
      roomWarnings: [],
      weekMasked: true,
      publishStatus: WEEK_STATUS_DRAFT,
    });
  }, [activeSheet, weekMasked, staffList]);

  useEffect(() => {
    if (!activeSheet?.startDate) return;
    const fixed = normalizeWeekStartIso(activeSheet.startDate);
    if (fixed === activeSheet.startDate) return;
    updateActiveSheet((sh) => (sh.startDate === fixed ? sh : { ...sh, startDate: fixed }));
  }, [activeSheet?.startDate]);

  useEffect(() => {
    if (!scheduleData.monthRolesRecovered) return;
    if ((activeSheet.monthRoles || []).length) return;
    setStore((prev) => {
      const deptId = prev.activeDeptId || activeDept.id;
      const st = prev.sheetsByDept?.[deptId];
      if (!st) return prev;
      const sheets = st.sheets.map((sh) => (
        sh.id === activeSheet.id ? { ...sh, monthRoles: scheduleData.monthRoles } : sh
      ));
      return {
        ...prev,
        sheetsByDept: { ...prev.sheetsByDept, [deptId]: { ...st, sheets } },
      };
    });
  }, [
    activeDept.id,
    activeSheet.id,
    activeSheet.monthRoles,
    scheduleData.monthRoles,
    scheduleData.monthRolesRecovered,
  ]);

  // Boot F-210: ưu tiên GET Sheet SoT khi API backend + linked.
  useEffect(() => {
    if (isSheetBackend()) {
      setSheetBooted(true);
      return undefined;
    }
    if (account.loading || account.scheduleConfigLoading) return undefined;
    let cancelled = false;
    (async () => {
      const local = storeRef.current || ensureSheets(getInitialStore());
      const result = await bootFromSheetOrCache({
        localStore: local,
        linked: sheetLinked
      });
      if (cancelled) return;
      sheetRevisionRef.current = result.revision || 0;
      setCacheStatus(result.cacheStatus);
      setSyncHint(result.error || '');
      skipNextPersistRef.current = true;
      setStore(ensureSheets(normalizeStore(result.store)));
      setSheetBooted(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    account.loading,
    account.scheduleConfigLoading,
    account.user?.id,
    sheetLinked,
    account.scheduleConfig?.spreadsheetId
  ]);

  // F-210 Save: localStorage = cache; Mod/Admin PUT Sheet khi đã link (API backend).
  useEffect(() => {
    if (isSheetBackend() || !useF210SoT) return undefined;
    if (!sheetBooted) return undefined;
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return undefined;
    }
    const timer = window.setTimeout(() => {
      persistStoreWithSheet({
        store: storeRef.current,
        baseRevision: sheetRevisionRef.current,
        linked: sheetLinked,
        canWrite: canWriteSheet
      }).then((result) => {
        if (typeof result.revision === 'number') {
          sheetRevisionRef.current = result.revision;
        }
        setCacheStatus(result.cacheStatus);
        if (result.conflict) {
          setSyncHint(
            result.error ||
              'Có bản Sheet khác đã bị ghi đè (LWW). Có thể nạp lại từ Sheet nếu cần.'
          );
          setSheetConflictOpen(true);
        } else if (result.error) {
          setSyncHint(result.error);
        } else if (result.cacheStatus === CACHE_STATUS.LIVE) {
          setSyncHint('');
        }
      });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [store, sheetBooted, sheetLinked, canWriteSheet, useF210SoT]);

  // Cache local (+ F-303 cloud push handler khi không dùng F-210)
  useEffect(() => {
    if (useF210SoT) return undefined;
    const timer = window.setTimeout(() => saveStore(storeRef.current), 400);
    return () => window.clearTimeout(timer);
  }, [store, useF210SoT]);

  useEffect(() => {
    const flush = () => saveStore(storeRef.current, { skipCloud: useF210SoT });
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [useF210SoT]);

  // ---------- Store update helpers ----------
  const updateActiveDept = (fn) => {
    setStore(prev => ({
      ...prev,
      departments: prev.departments.map(d => (d.id === activeDept.id ? fn(d) : d))
    }));
  };

  const updateSheetState = (fn) => {
    setStore(prev => ({
      ...prev,
      sheetsByDept: { ...prev.sheetsByDept, [activeDept.id]: fn(prev.sheetsByDept[activeDept.id]) }
    }));
  };

  const updateActiveSheet = (fn) => {
    updateSheetState(st => ({
      ...st,
      sheets: st.sheets.map(sh => (sh.id === activeSheet.id ? fn(sh) : sh))
    }));
  };

  // Theme Toggle
  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyThemeClass(next);
    account.saveSettings?.({ darkMode: next === 'dark' }).catch(() => {});
  };

  const openAccount = (section) => {
    setAccountSection(section);
    setActiveView('ACCOUNT');
    setNotifOpen(false);
  };

  // Department Selection
  const handleSelectDept = (deptId) => {
    setStore(prev => ensureSheets({ ...prev, activeDeptId: deptId }));
  };

  const handlePublishWeek = () => {
    if (!canManagePublish) return;
    updateActiveSheet(sh => withWeekPublishStatus(sh, WEEK_STATUS_PUBLISHED, {
      by: account.user?.email || account.user?.fullName || account.user?.username || '',
      action: 'publish'
    }));
  };

  const handleUnpublishWeek = () => {
    if (!canManagePublish) return;
    updateActiveSheet(sh => withWeekPublishStatus(sh, WEEK_STATUS_DRAFT, {
      by: account.user?.email || account.user?.fullName || account.user?.username || '',
      action: 'unpublish'
    }));
  };

  // Run Auto-Scheduler Engine on the active sheet
  const handleAutoSchedule = () => {
    if (!allow('week')) return;
    if (weekMasked) return;
    const sessions = normalizeDaySessions(activeSheet.daySessions);
    const previousCuts = activeSheet.leaveCuts || { bu: {}, phep: {} };
    const staffForRun = staffList.map(person => ({
      ...person,
      buBalance: +((Number(person.buBalance) || 0) + (Number(previousCuts.bu?.[person.shortName]) || 0)).toFixed(1),
      phepBalance: +((Number(person.phepBalance) || 0) + (Number(previousCuts.phep?.[person.shortName]) || 0)).toFixed(1)
    }));
    const existingNotes = {};
    staffList.forEach((person) => {
      existingNotes[person.shortName] = activeSheet.grid?.[person.shortName]?.note || '';
    });
    const result = generateWeeklySchedule({
      startDate: activeSheet.startDate,
      staffList: staffForRun,
      taskList,
      monthGrid: activeSheet.monthGrid || {},
      monthRoles: resolveMonthRoles(activeSheet.monthRoles),
      daySessions: sessions,
      leaveEntries: activeDept.leaveEntries || [],
      studyEntries: activeDept.studyEntries || [],
      roomTable: roomTableOf(activeSheet, staffList),
      sheets: weekSources(sheets),
      existingNotes,
      cathRoles: localCathRoles(activeSheet.cathRoles),
      cathGrid: activeSheet.cathGrid || {}
    });
    const setupWarnings = missingPrimaryWarnings(roomTableOf(activeSheet, staffList));
    const warnCtx = {
      grid: result.grid,
      staffList,
      taskList,
      days: buildWeekDays(activeSheet.startDate),
      sessions
    };
    const cleanedWarnings = filterFalseScheduleWarnings(result.warnings || [], warnCtx);
    const after = result.buGrants || {};
    const afterCuts = result.leaveCuts || { bu: {}, phep: {} };
    const sheetId = activeSheet.id;
    const deptId = activeDept.id;
    setStore(prev => {
      const st = prev.sheetsByDept[deptId];
      const sh = st.sheets.find(item => item.id === sheetId) || st.sheets[0];
      const posted = sh.buPosted || buBaseline(sh);
      const grantDeltas = buGrantDeltas(after, posted);
      const cuts = sh.leaveCuts || { bu: {}, phep: {} };
      const roomWarnings = [...setupWarnings, ...(result.roomWarnings || [])];
      const nextSheet = {
        ...sh,
        grid: result.grid,
        warnings: cleanedWarnings,
        roomWarnings,
        cathGrid: result.cathGrid,
        buGrants: after,
        buPosted: after,
        leaveCuts: afterCuts,
        weeks: {
          ...(sh.weeks || {}),
          [sh.startDate]: {
            grid: result.grid,
            warnings: cleanedWarnings,
            roomWarnings,
            buGrants: after,
            buPosted: after,
            leaveCuts: afterCuts,
            publishStatus: sh.publishStatus || WEEK_STATUS_DRAFT
          }
        }
      };
      return {
        ...prev,
        departments: prev.departments.map(dept => dept.id !== deptId ? dept : {
          ...dept,
          staff: dept.staff.map(person => {
            const name = person.shortName;
            const grantDelta = grantDeltas[name] || 0;
            const buCutDelta = (Number(afterCuts.bu?.[name]) || 0) - (Number(cuts.bu?.[name]) || 0);
            const phepCutDelta = (Number(afterCuts.phep?.[name]) || 0) - (Number(cuts.phep?.[name]) || 0);
            if (!grantDelta && !buCutDelta && !phepCutDelta) return person;
            return {
              ...person,
              buBalance: +((Number(person.buBalance) || 0) + grantDelta - buCutDelta).toFixed(1),
              phepBalance: +((Number(person.phepBalance) || 0) - phepCutDelta).toFixed(1)
            };
          })
        }),
        sheetsByDept: {
          ...prev.sheetsByDept,
          [deptId]: { ...st, sheets: st.sheets.map(item => item.id === sh.id ? nextSheet : item) }
        }
      };
    });
  };

  const sheetWithPrunedAlerts = (sh, people = staffList, tasks = taskList) => {
    const ctx = {
      grid: sh.grid,
      days: buildWeekDays(sh.startDate),
      sessions: normalizeDaySessions(sh.daySessions),
      staffList: people,
      taskList: tasks
    };
    const warnings = pruneResolvedAlerts(sh.warnings, ctx);
    const roomWarnings = pruneResolvedAlerts(sh.roomWarnings, ctx);
    if (sameAlerts(warnings, sh.warnings) && sameAlerts(roomWarnings, sh.roomWarnings)) return sh;
    const weeks = { ...(sh.weeks || {}) };
    if (sh.startDate && weeks[sh.startDate]) {
      weeks[sh.startDate] = { ...weeks[sh.startDate], grid: sh.grid, warnings, roomWarnings };
    }
    return { ...sh, warnings, roomWarnings, weeks };
  };

  // Manual Cell Edit from Sheet View
  const handleUpdateCell = (shortName, dayIdx, session, newVal) => {
    if (!allow('week')) return;
    let value = newVal == null ? '' : String(newVal);

    updateActiveSheet(sh => {
      const previous = sh.grid?.[shortName]?.[dayIdx]?.[session] || '';
      value = resolveLockedCell(previous, value, taskList);
      const grid = { ...sh.grid };
      const row = { ...(grid[shortName] || {}) };
      const cell = { ...(row[dayIdx] || { S: '', C: '' }) };
      cell[session] = value;
      row[dayIdx] = cell;
      grid[shortName] = row;
      return sheetWithPrunedAlerts({ ...sh, grid });
    });

    // Real-time BÙ / PHÉP balance calculation
    if (value.includes('BÙ') || value.includes('BU')) {
      updateActiveDept(d => ({
        ...d,
        staff: d.staff.map(s =>
          s.shortName === shortName && s.buBalance >= 0.5
            ? { ...s, buBalance: +(s.buBalance - 0.5).toFixed(1) }
            : s
        )
      }));
    }
  };

  const handleUpdateBalance = (shortName, field, raw) => {
    if (!allow('week')) return false;
    const text = String(raw ?? '').trim().replace(',', '.');
    if (text !== '' && !/^[+-]?\d+(\.\d+)?$/.test(text)) return false;
    const parsed = text === '' ? 0 : Math.round(Number(text) * 10) / 10;
    if (!Number.isFinite(parsed)) return false;
    const key = field === 'phep' ? 'phepBalance' : 'buBalance';
    const current = staffList.find(person => person.shortName === shortName);
    if (!current || Number(current[key]) === parsed) return true;
    updateActiveDept(dept => ({
      ...dept,
      staff: dept.staff.map(person => (
        person.shortName === shortName ? { ...person, [key]: parsed } : person
      ))
    }));
    return true;
  };

  const handleUpdateNote = (shortName, newVal) => {
    if (!allow('week')) return;
    const value = newVal == null ? '' : String(newVal);
    updateActiveSheet(sh => {
      const grid = { ...sh.grid };
      const row = { ...(grid[shortName] || {}) };
      row.note = value;
      grid[shortName] = row;
      return { ...sh, grid };
    });
  };

  useEffect(() => {
    const deptId = activeDept?.id;
    const sheetId = activeSheet?.id;
    if (!deptId || !sheetId) return;
    setStore(prev => {
      const dept = prev.departments.find(item => item.id === deptId);
      const st = prev.sheetsByDept[deptId];
      if (!dept || !st) return prev;
      let changed = false;
      const sheets = st.sheets.map((sh) => {
        if (sh.id !== sheetId) return sh;
        const next = sheetWithPrunedAlerts(sh, dept.staff || [], dept.tasks || []);
        if (next !== sh) changed = true;
        return next;
      });
      if (!changed) return prev;
      return {
        ...prev,
        sheetsByDept: { ...prev.sheetsByDept, [deptId]: { ...st, sheets } }
      };
    });
  }, [activeDept?.id, activeSheet?.id, activeSheet?.grid, activeSheet?.warnings, activeSheet?.roomWarnings, (taskList || []).map(task => `${task.id}:${task.warn === false ? 0 : 1}`).join('|')]);

  const handleDateChange = (daysDelta) => {
    markWeekNavigation();
    const [y, m, d] = normalizeWeekStartIso(activeSheet.startDate).split('-').map(Number);
    const curr = new Date(y, m - 1, d);
    curr.setDate(curr.getDate() + daysDelta);
    const newStart = mondayOf(curr);
    updateActiveSheet(sh => openWeek(sh, newStart, staffList));
  };

  const handleGoCurrentWeek = () => {
    markWeekNavigation();
    updateActiveSheet(sh => openWeek(sh, mondayOf(new Date()), staffList));
  };

  const shiftCalendarMonth = (baseKey, delta) => (
    delta === 0 ? currentMonthKey() : shiftMonthKey(baseKey, delta)
  );

  const handleMonthKeyChange = (baseKey, delta) => {
    const next = shiftCalendarMonth(baseKey, delta);
    markMonthNavigation();
    updateActiveSheet(sh => ({ ...sh, monthKey: next }));
  };

  const handleLeaveMonthKeyChange = (baseKey, delta) => {
    const next = shiftCalendarMonth(baseKey, delta);
    markMonthNavigation();
    updateActiveSheet(sh => ({ ...sh, leaveMonthKey: next }));
  };

  const handleStudyMonthKeyChange = (baseKey, delta) => {
    const next = shiftCalendarMonth(baseKey, delta);
    markMonthNavigation();
    updateActiveSheet(sh => ({ ...sh, studyMonthKey: next }));
  };

  const handleWeekMerges = (weekMerges) => {
    if (!allow('week')) return;
    updateActiveSheet(sh => ({ ...sh, weekMerges }));
  };

  const handleMonthMerges = (monthMerges) => {
    if (!allow('month')) return;
    updateActiveSheet(sh => ({ ...sh, monthMerges }));
  };

  const handleDaySessions = (daySessions) => {
    if (!allowBook()) return;
    updateActiveSheet(sh => ({ ...sh, daySessions: normalizeDaySessions(daySessions) }));
  };

  const handleFreeze = (scope, patch) => {
    if (!allow(scope === 'month' ? 'month' : 'week')) return;
    updateActiveSheet(sh => {
      const freeze = { ...(sh.freeze || {}) };
      freeze[scope] = { ...(freeze[scope] || {}), ...patch };
      return { ...sh, freeze };
    });
  };

  const saveDeptList = (field, entry) => {
    const tab = field === 'studyEntries' ? 'study' : 'leave';
    if (!allow(tab)) return;
    if (field === 'leaveEntries') {
      if (leaveLockedForMember) {
        window.alert('Đã khóa lịch nghỉ. Liên hệ Mod để chỉnh giúp.');
        return;
      }
      if (!canMutateLeaveEntry(actor, entry, leaveKeys)) {
        window.alert('Bạn chỉ được sửa lịch nghỉ của chính mình.');
        return;
      }
    }
    updateActiveDept(dept => {
      const list = dept[field] || [];
      const exists = list.some(item => item.id === entry.id);
      return {
        ...dept,
        [field]: exists ? list.map(item => (item.id === entry.id ? entry : item)) : [...list, entry]
      };
    });
  };

  const deleteDeptItem = (field, id) => {
    const tab = field === 'studyEntries' ? 'study' : 'leave';
    if (!allow(tab)) return;
    if (field === 'leaveEntries') {
      if (leaveLockedForMember) {
        window.alert('Đã khóa lịch nghỉ. Liên hệ Mod để chỉnh giúp.');
        return;
      }
      const existing = (activeDept.leaveEntries || []).find((item) => item.id === id);
      if (existing && !canMutateLeaveEntry(actor, existing, leaveKeys)) {
        window.alert('Bạn chỉ được xóa lịch nghỉ của chính mình.');
        return;
      }
    }
    updateActiveDept(dept => ({
      ...dept,
      [field]: (dept[field] || []).filter(item => item.id !== id)
    }));
  };

  const handleUpdateRooms = (roomTable) => {
    if (!allow('week')) return;
    updateActiveSheet(sh => ({ ...sh, roomTable }));
  };

  const handleUpdateCathCell = (iso, rowKey, session, value) => {
    if (!allow('week')) return;
    updateActiveSheet(sh => ({
      ...sh,
      cathGrid: { ...(sh.cathGrid || {}), [cathCellKey(iso, rowKey, session)]: value ?? '' }
    }));
  };

  const handleRenameCathRole = (rowKey, raw) => {
    if (!allow('week')) return;
    const label = String(raw || '').trim();
    if (!label) return;
    updateActiveSheet(sh => ({
      ...sh,
      cathRoles: localCathRoles(sh.cathRoles).map(role => (
        role.key === rowKey ? { ...role, label } : role
      ))
    }));
  };

  const handleAddCathRole = () => {
    if (!allow('week')) return;
    updateActiveSheet(sh => ({
      ...sh,
      cathRoles: [...localCathRoles(sh.cathRoles), { key: `cath_${Date.now()}`, label: 'Task mới', source: 'local' }]
    }));
  };

  const handleDeleteCathRole = (rowKey) => {
    if (!allow('week')) return;
    if (!rowKey || rowKey === 'rash_pm' || rowKey === 'tt_chinh' || rowKey === 'tt_phu' || rowKey === 'ttcc') return;
    updateActiveSheet(sh => {
      const cathGrid = { ...(sh.cathGrid || {}) };
      Object.keys(cathGrid).forEach((cellKey) => {
        if (cellKey.split('|')[1] === rowKey) delete cathGrid[cellKey];
      });
      return {
        ...sh,
        cathGrid,
        cathRoles: localCathRoles(sh.cathRoles).filter(role => role.key !== rowKey)
      };
    });
  };

  const handleUpdateMonthCell = (iso, roleKey, session, value) => {
    if (!allow('month')) return;
    updateActiveSheet(sh => ({
      ...sh,
      monthGrid: { ...(sh.monthGrid || {}), [sessionCellKey(iso, roleKey, session)]: value ?? '' }
    }));
  };

  const handleUpdateMonthCustomCell = (id, weekStart, slot, value) => {
    if (!allow('month')) return;
    updateActiveSheet(sh => ({
      ...sh,
      monthGrid: { ...(sh.monthGrid || {}), [customCellKey(id, weekStart, slot)]: value ?? '' }
    }));
  };

  const handleInsertMonthColumn = (index, side) => {
    if (!allow('month')) return;
    updateActiveSheet(sh => {
      const keys = columnSpecs(sh.monthColumnOrder, sh.monthColumnTitles, sh.daySessions).map(column => column.key);
      const key = `x:c${Date.now()}`;
      const at = Math.max(0, Math.min((Number(index) || 0) + (side === 'right' ? 1 : 0), keys.length));
      keys.splice(at, 0, key);
      return {
        ...sh,
        monthColumnOrder: keys,
        monthColumnTitles: { ...(sh.monthColumnTitles || {}), [key]: 'Cột mới' }
      };
    });
  };

  const handleRenameMonthColumn = (key, title) => {
    if (!allow('month')) return;
    updateActiveSheet(sh => ({
      ...sh,
      monthColumnTitles: { ...(sh.monthColumnTitles || {}), [key]: String(title || '').trim() || 'Cột mới' }
    }));
  };

  const handleRemoveMonthColumn = (key) => {
    if (!allow('month')) return;
    if (!String(key).startsWith('x:')) return;
    const id = String(key).slice(2);
    updateActiveSheet(sh => {
      const monthGrid = { ...(sh.monthGrid || {}) };
      const cellStyles = { ...(sh.cellStyles || {}) };
      const prefix = `x|${id}|`;
      Object.keys(monthGrid).forEach((cellKey) => {
        if (cellKey.startsWith(prefix)) delete monthGrid[cellKey];
      });
      const stylePrefix = `m|x|${id}|`;
      Object.keys(cellStyles).forEach((styleKey) => {
        if (styleKey.startsWith(stylePrefix)) delete cellStyles[styleKey];
      });
      const titles = { ...(sh.monthColumnTitles || {}) };
      delete titles[key];
      return {
        ...sh,
        monthGrid,
        cellStyles,
        monthColumnTitles: titles,
        monthColumnOrder: columnSpecs(sh.monthColumnOrder, sh.monthColumnTitles, sh.daySessions).map(column => column.key).filter(item => item !== key)
      };
    });
  };

  const handlePatchStyles = (updates) => {
    if (!allowBook()) return;
    updateActiveSheet(sh => {
      const cellStyles = { ...(sh.cellStyles || {}) };
      Object.entries(updates || {}).forEach(([key, value]) => {
        if (!value) delete cellStyles[key];
        else cellStyles[key] = value;
      });
      return { ...sh, cellStyles };
    });
  };

  const handleAddMonthRole = (roleInput) => {
    if (!allow('month')) return;
    let next = null;
    if (roleInput && typeof roleInput === 'object' && roleInput.key) {
      next = {
        key: String(roleInput.key),
        label: String(roleInput.label || '').trim(),
        taskId: roleInput.taskId || null,
      };
    } else {
      const task = roleInput && typeof roleInput === 'object' ? roleInput : null;
      const label = task ? String(task.code || '').trim() : String(roleInput || '').trim();
      if (!label) return;
      next = {
        key: `role_${Date.now()}`,
        label,
        taskId: task?.id || null,
      };
    }
    if (!next.label) return;
    updateActiveSheet((sh) => {
      const roles = resolveMonthRoles(sh.monthRoles);
      if (roles.some((role) => role.key === next.key)) return sh;
      if (next.taskId && roles.some((role) => role.taskId === next.taskId)) return sh;
      return { ...sh, monthRoles: [...roles, next] };
    });
  };

  const handleInsertMonthRole = (index) => {
    if (!allow('month')) return;
    updateActiveSheet(sh => {
      const roles = resolveMonthRoles(sh.monthRoles);
      const next = [...roles];
      const at = Math.max(0, Math.min(Number(index) || 0, next.length));
      next.splice(at, 0, { key: `role_${Date.now()}`, label: '', taskId: null });
      return { ...sh, monthRoles: next };
    });
  };

  const handleRenameMonthRole = (roleKey, raw) => {
    if (!allow('month')) return;
    const text = String(raw || '').trim();
    const matched = matchTask(text, taskList);
    updateActiveSheet(sh => ({
      ...sh,
      monthRoles: resolveMonthRoles(sh.monthRoles).map(role => (
        role.key === roleKey
          ? { ...role, label: matched ? String(matched.code || '').trim() : text, taskId: matched?.id || null }
          : role
      ))
    }));
  };

  const handleDeleteMonthRole = (roleKey) => {
    if (!allow('month')) return;
    updateActiveSheet(sh => {
      const monthGrid = { ...(sh.monthGrid || {}) };
      Object.keys(monthGrid).forEach((key) => {
        if (key.split('|')[1] === roleKey) delete monthGrid[key];
      });
      return {
        ...sh,
        monthGrid,
        monthRoles: resolveMonthRoles(sh.monthRoles).filter(role => role.key !== roleKey)
      };
    });
  };

  // ---------- Sheet Tab Actions ----------
  const handleSelectSheet = (sheetId) => {
    updateSheetState(st => ({ ...st, activeSheetId: sheetId }));
  };

  const handleAddSheet = () => {
    if (!allowBook()) return;
    const id = `sheet_${Date.now()}`;
    updateSheetState(st => ({
      activeSheetId: id,
      sheets: [...st.sheets, { id, name: nextSheetName(st.sheets), ...blankSheetContent(activeDept, activeSheet.startDate) }]
    }));
  };

  const handleRenameSheet = (sheetId, name) => {
    if (!allowBook()) return;
    updateSheetState(st => ({
      ...st,
      sheets: st.sheets.map(sh => (sh.id === sheetId ? { ...sh, name } : sh))
    }));
  };

  const handleDuplicateSheet = (sheetId) => {
    if (!allowBook()) return;
    const id = `sheet_${Date.now()}`;
    updateSheetState(st => {
      const idx = st.sheets.findIndex(sh => sh.id === sheetId);
      if (idx < 0) return st;
      const source = st.sheets[idx];
      const copy = JSON.parse(JSON.stringify(source));
      copy.id = id;
      copy.name = nextSheetName(st.sheets, `Bản sao của ${source.name}`.slice(0, 32));
      const nextSheets = [...st.sheets];
      nextSheets.splice(idx + 1, 0, copy);
      return { activeSheetId: id, sheets: nextSheets };
    });
  };

  const handleMoveSheet = (sheetId, direction) => {
    if (!allowBook()) return;
    updateSheetState(st => {
      const idx = st.sheets.findIndex(sh => sh.id === sheetId);
      const next = idx + direction;
      if (idx < 0 || next < 0 || next >= st.sheets.length) return st;
      const sheets = [...st.sheets];
      const [item] = sheets.splice(idx, 1);
      sheets.splice(next, 0, item);
      return { ...st, sheets };
    });
  };

  const handleColorSheet = (sheetId, color) => {
    if (!allowBook()) return;
    updateSheetState(st => ({
      ...st,
      sheets: st.sheets.map(sh => (sh.id === sheetId ? { ...sh, color: color || undefined } : sh))
    }));
  };

  const handleDeleteSheet = (sheetId) => {
    if (!allowBook()) return;
    updateSheetState(st => {
      if (st.sheets.length <= 1) return st;
      const idx = st.sheets.findIndex(sh => sh.id === sheetId);
      const nextSheets = st.sheets.filter(sh => sh.id !== sheetId);
      const activeSheetId = st.activeSheetId === sheetId
        ? nextSheets[Math.max(0, idx - 1)].id
        : st.activeSheetId;
      return { activeSheetId, sheets: nextSheets };
    });
  };

  // ---------- Staff Management Actions ----------
  const handleLinkAccount = (staffId) => {
    const email = String(account.user?.email || '').trim();
    if (!email || !staffId) return;
    setStore(prev => {
      let nextDeptId = prev.activeDeptId;
      const departments = prev.departments.map(dept => ({
        ...dept,
        staff: (dept.staff || []).map(person => {
          if (person.id === staffId) {
            nextDeptId = dept.id;
            return { ...person, loginEmail: email };
          }
          if (String(person.loginEmail || '').trim().toLowerCase() === email.toLowerCase()) {
            return { ...person, loginEmail: '' };
          }
          return person;
        })
      }));
      return { ...prev, activeDeptId: nextDeptId, departments };
    });
  };

  const handleAddStaff = (newStaffObj) => {
    if (!allow('staff')) return;
    updateActiveDept(d => ({ ...d, staff: [...d.staff, newStaffObj] }));
  };

  const handleUpdateStaff = (updatedStaff, oldShortName) => {
    if (!allow('staff')) return;
    setStore(prev => {
      const deptId = activeDept.id;
      const departments = prev.departments.map(d =>
        d.id === deptId
          ? { ...d, staff: d.staff.map(s => (s.id === updatedStaff.id ? updatedStaff : s)) }
          : d
      );

      // Đổi tên viết tắt -> chuyển dữ liệu lịch của bác sĩ sang tên mới trong tất cả các sheet
      let sheetsByDept = prev.sheetsByDept;
      const newShortName = updatedStaff.shortName;
      if (oldShortName && oldShortName !== newShortName && sheetsByDept[deptId]) {
        const st = sheetsByDept[deptId];
        sheetsByDept = {
          ...sheetsByDept,
          [deptId]: {
            ...st,
            sheets: st.sheets.map(sh => {
              if (!sh.grid || !sh.grid[oldShortName]) return sh;
              const grid = { ...sh.grid, [newShortName]: sh.grid[oldShortName] };
              delete grid[oldShortName];
              return { ...sh, grid };
            })
          }
        };
      }

      return { ...prev, departments, sheetsByDept };
    });
  };

  const handleDeleteStaff = (staffId) => {
    if (!allow('staff')) return;
    updateActiveDept(d => ({ ...d, staff: d.staff.filter(s => s.id !== staffId) }));
  };

  const handleBulkImportStaff = (newStaffList) => {
    if (!allow('staff')) return;
    updateActiveDept(d => ({ ...d, staff: [...d.staff, ...newStaffList] }));
  };

  const handleReorderStaff = (staff) => {
    if (!allow('staff')) return;
    updateActiveDept(d => ({ ...d, staff }));
  };

  // ---------- Task Management Actions ----------
  const handleAddTask = (newTaskObj) => {
    if (!allow('tasks') && !allow('month')) return;
    updateActiveDept(d => ({ ...d, tasks: [...d.tasks, newTaskObj] }));
  };

  const handleUpdateTask = (updatedTask) => {
    if (!allow('tasks') && !allow('month')) return;
    updateActiveDept(d => ({ ...d, tasks: d.tasks.map(item => item.id === updatedTask.id ? updatedTask : item) }));
  };

  const handleDeleteTask = (taskId) => {
    if (!allow('tasks')) return;
    updateActiveDept(d => ({ ...d, tasks: d.tasks.filter(t => t.id !== taskId) }));
  };

  const handleReorderTasks = (tasks) => {
    if (!allow('tasks')) return;
    updateActiveDept(d => ({ ...d, tasks }));
  };

  const handleLoadTaskTemplate = (templateTasks) => {
    if (!allow('tasks')) return;
    updateActiveDept(d => ({ ...d, tasks: templateTasks }));
  };

  const handleAddCategory = (category) => {
    if (!allow('tasks') && !allow('month')) return;
    updateActiveDept(d => ({ ...d, customCategories: [...(d.customCategories || []), category] }));
  };

  const handleDeleteCategory = (categoryKey) => {
    if (!allow('tasks') && !allow('month')) return;
    updateActiveDept(d => ({
      ...d,
      customCategories: (d.customCategories || []).filter(c => c.key !== categoryKey)
    }));
  };

  const handleImportStore = (imported) => {
    if (!allow('tasks')) return;
    setStore(ensureSheets(imported));
  };

  const viewportWidth = useViewportWidth();
  const coarsePointer = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(pointer: coarse)').matches;
  const isMobileUi = resolveUiMode({
    width: viewportWidth,
    coarsePointer
  }) === 'mobile';
  const navViews = visibleNav(actor);

  const handleExit = () => {
    if (window.confirm('Thoát / đăng xuất phiên làm việc? Dữ liệu lịch vẫn lưu trên trình duyệt; phiên API sẽ đăng xuất.')) {
      account.logout();
      setSessionNoticeState('expired');
      setActiveView('SHEET');
    }
  };

  const handleGateLogin = async (email, password) => {
    setLoginBusy(true);
    try {
      await account.login(email, password);
      clearSessionNotice();
      setSessionNoticeState('');
    } finally {
      setLoginBusy(false);
    }
  };

  const handleGatePreviewLogin = async (email) => {
    setLoginBusy(true);
    try {
      await account.loginSheetPreview(email);
      clearSessionNotice();
      setSessionNoticeState('');
    } finally {
      setLoginBusy(false);
    }
  };

  const handleGateGoogle = async (credential) => {
    setLoginBusy(true);
    try {
      await account.loginWithGoogle(credential);
      clearSessionNotice();
      setSessionNoticeState('');
    } finally {
      setLoginBusy(false);
    }
  };

  const accountView = (
    <AccountPage
      section={accountSection}
      account={account}
      sheetConnection={isSheetBackend() && account.user ? {
        readOnly: !canEditSheetConnection(actor),
        onSave: handleSheetConnectionSave
      } : null}
      deptIdentity={isSheetBackend() && account.user ? {
        department: activeDept,
        readOnly: !canEditSheetConnection(actor),
        onSave: handleDeptIdentitySave,
      } : null}
      rosterLink={needsStaffLink(account.user) && !account.offline ? {
        required: actor.kind === 'guest' || !String(account.user?.role || ''),
        people: account.rosterPeople || [],
        currentPersonId: (account.rosterPeople || []).find(
          (p) => p.linkedUserId && p.linkedUserId === account.user?.id
        )?.id || '',
        onSubmit: async (personId) => {
          await account.linkRosterPerson(personId);
        }
      } : null}
      staffLink={needsStaffLink(account.user) && !account.rosterPeople?.length ? {
        required: actor.kind === 'guest',
        current: actor.staff,
        options: roster.map(person => {
          const linked = String(person.loginEmail || '').trim().toLowerCase();
          const mine = linked && linked === String(account.user?.email || '').trim().toLowerCase();
          return { ...person, taken: Boolean(linked) && !mine };
        }),
        onSubmit: handleLinkAccount
      } : null}
      onClose={firstNav(actor) === 'ACCOUNT' ? undefined : () => setActiveView(firstNav(actor))}
      onThemeToggle={(mode) => {
        setTheme(mode);
        applyThemeClass(mode);
      }}
    />
  );

  const calendarView = (
    <CalendarView
      dept={activeDept}
      staffList={staffList}
      taskList={taskList}
      scheduleData={scheduleData}
      linkedShortName={linkedStaff?.shortName || ''}
    />
  );

  const dashboardView = (
    <FairnessDashboard
      dept={activeDept}
      staffList={staffList}
      scheduleData={scheduleData}
    />
  );

  const staffView = (
    <StaffManager
      staffList={staffList}
      taskList={taskList}
      tenantDepartments={tenantDepartmentOptions()}
      defaultDeptId={activeDept?.id}
      onAddStaff={handleAddStaff}
      onUpdateStaff={handleUpdateStaff}
      onDeleteStaff={handleDeleteStaff}
      onReorderStaff={handleReorderStaff}
      onBulkImport={handleBulkImportStaff}
      readOnly={!allow('staff')}
    />
  );

  const tasksView = (
    <TaskManager
      taskList={taskList}
      categories={categories}
      onAddTask={handleAddTask}
      onUpdateTask={handleUpdateTask}
      onDeleteTask={handleDeleteTask}
      onReorderTasks={handleReorderTasks}
      staffList={staffList}
      onLoadTemplate={handleLoadTaskTemplate}
      onAddCategory={handleAddCategory}
      onDeleteCategory={handleDeleteCategory}
      readOnly={!allow('tasks')}
      store={store}
      onImportStore={handleImportStore}
    />
  );

  const sheetView = (
    <SheetView
      dept={activeDept}
      staffList={staffList}
      taskList={taskList}
      scheduleData={scheduleData}
      onUpdateCell={handleUpdateCell}
      onUpdateCathCell={handleUpdateCathCell}
      onRenameCathRole={handleRenameCathRole}
      onAddCathRole={handleAddCathRole}
      onDeleteCathRole={handleDeleteCathRole}
      onUpdateNote={handleUpdateNote}
      onUpdateBalance={handleUpdateBalance}
      onDateChange={handleDateChange}
      onGoCurrentWeek={handleGoCurrentWeek}
      currentStartDate={activeSheet.startDate}
      sheets={sheets}
      activeSheetId={activeSheet.id}
      onSelectSheet={handleSelectSheet}
      onAddSheet={handleAddSheet}
      onRenameSheet={handleRenameSheet}
      onDuplicateSheet={handleDuplicateSheet}
      onDeleteSheet={handleDeleteSheet}
      onMoveSheet={handleMoveSheet}
      onColorSheet={handleColorSheet}
      monthKey={activeSheet.monthKey}
      leaveMonthKey={activeSheet.leaveMonthKey}
      studyMonthKey={activeSheet.studyMonthKey}
      onMonthKeyChange={handleMonthKeyChange}
      onLeaveMonthKeyChange={handleLeaveMonthKeyChange}
      onStudyMonthKeyChange={handleStudyMonthKeyChange}
      onUpdateMonthCell={handleUpdateMonthCell}
      onUpdateMonthCustomCell={handleUpdateMonthCustomCell}
      onInsertMonthColumn={handleInsertMonthColumn}
      onRemoveMonthColumn={handleRemoveMonthColumn}
      onRenameMonthColumn={handleRenameMonthColumn}
      onPatchStyles={handlePatchStyles}
      onAddMonthRole={handleAddMonthRole}
      onInsertMonthRole={handleInsertMonthRole}
      onRenameMonthRole={handleRenameMonthRole}
      categories={categories}
      onAddTask={handleAddTask}
      onUpdateTask={handleUpdateTask}
      onAddCategory={handleAddCategory}
      onDeleteCategory={handleDeleteCategory}
      onUpdateRooms={handleUpdateRooms}
      onWeekMerges={handleWeekMerges}
      onDaySessions={handleDaySessions}
      onFreeze={handleFreeze}
      leaveEntries={activeDept.leaveEntries || []}
      studyEntries={activeDept.studyEntries || []}
      onSaveLeave={(entry) => saveDeptList('leaveEntries', entry)}
      onDeleteLeave={(id) => deleteDeptItem('leaveEntries', id)}
      onSaveStudy={(entry) => saveDeptList('studyEntries', entry)}
      onDeleteStudy={(id) => deleteDeptItem('studyEntries', id)}
      onMonthMerges={handleMonthMerges}
      onDeleteMonthRole={handleDeleteMonthRole}
      onAutoSchedule={canManagePublish || allow('week') ? handleAutoSchedule : undefined}
      onPourWeekFromMonth={canManagePublish || allow('week') ? handleAutoSchedule : undefined}
      onPublishWeek={canManagePublish ? handlePublishWeek : undefined}
      onUnpublishWeek={canManagePublish ? handleUnpublishWeek : undefined}
      weekPublished={isWeekPublished(activeSheet)}
      canManagePublish={canManagePublish}
      weekMasked={weekMasked}
      actor={actor}
      leaveLockBanner={leaveLockBanner}
      leaveReadOnly={leaveLockedForMember || (actor.kind === 'member' && leaveKeys.size === 0)}
    />
  );

  // F-102: chưa đăng nhập → chỉ hiện cổng đăng nhập
  if (account.loading) {
    return (
      <div className="login-gate">
        <p className="form-hint">Đang tải phiên đăng nhập…</p>
      </div>
    );
  }

  if (!syncAuthReady) {
    return (
      <LoginGate
        tenantLabel={gateBrand.title}
        tenantHint={gateBrand.subtitle}
        staffList={roster}
        busy={loginBusy}
        error={account.error}
        sessionNotice={sessionNotice}
        onLogin={handleGateLogin}
        onPreviewLogin={handleGatePreviewLogin}
        onGoogle={handleGateGoogle}
      />
    );
  }

  if (isMobileUi) {
    return (
      <div className="app-container mobile-app">
        {needsSheetConnect && (
          <div
            className="sheet-sync-banner"
            role="status"
            style={{
              padding: '8px 16px',
              fontSize: '0.85rem',
              background: 'var(--muted, #f1f5f9)',
            }}
          >
            Chưa có sổ lịch trên trình duyệt này.
            {canEditSheetConnection(actor) ? (
              <button
                type="button"
                className="action-btn primary"
                style={{ marginLeft: 8, padding: '4px 10px', fontSize: '0.85rem' }}
                onClick={() => setSheetConnectOpen(true)}
              >
                Chọn sổ
              </button>
            ) : (
              ' Liên hệ admin.'
            )}
          </div>
        )}
        <NotificationsPanel
          open={notifOpen}
          onClose={() => setNotifOpen(false)}
          settings={account.settings}
        />
        <MobileShell
          activeDept={navbarActiveDept}
          departments={navbarSelectorDepartments}
          onSelectDept={
            hospitalKhoaSwitch
              ? handleSelectKhoa
              : localSheetSwitch
                ? handleSelectSavedSheet
                : handleSelectDept
          }
          hideDeptSelector={hideDeptSelector}
          tenantLabel={sessionTitle}
          activeView={activeView}
          onSelectView={setActiveView}
          views={navViews}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onNotifications={() => setNotifOpen((open) => !open)}
          onProfile={() => openAccount('profile')}
          onSettings={() => openAccount('settings')}
          onExit={handleExit}
          childrenByView={{
            SHEET: sheetView,
            STAFF: staffView,
            TASKS: tasksView,
            DASHBOARD: dashboardView,
            CALENDAR: calendarView,
            ACCOUNT: accountView
          }}
        />
      </div>
    );
  }

  return (
    <div className="app-container">
      <Navbar
        activeDept={navbarActiveDept}
        departments={navbarSelectorDepartments}
        onSelectDept={
          hospitalKhoaSwitch
            ? handleSelectKhoa
            : localSheetSwitch
              ? handleSelectSavedSheet
              : handleSelectDept
        }
        hideDeptSelector={hideDeptSelector}
        tenantLabel={sessionTitle}
        activeView={activeView}
        onSelectView={setActiveView}
        views={navViews}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onNotifications={() => setNotifOpen((open) => !open)}
        onProfile={() => openAccount('profile')}
        onSettings={() => openAccount('settings')}
        syncStatus={useF210SoT ? cacheStatus : undefined}
        syncStatusLabel={useF210SoT ? cacheStatusLabel(cacheStatus) : ''}
        syncHint={useF210SoT ? syncHint : ''}
        onExit={handleExit}
        onSheetSync={isSheetBackend() && syncAuthReady ? () => sheetSync.manualPull() : undefined}
        sheetSyncTitle={sheetSyncTitle}
      />
      {hospitalCatalogEnabled() && syncAuthReady && khoaDiscovery.catalogLoading && (
        <div className="sheet-sync-banner" role="status" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
          Đang tìm khoa theo email đăng nhập…
        </div>
      )}
      {hospitalCatalogEnabled() && khoaDiscovery.catalogError && (
        <div
          className="sheet-sync-banner"
          role="alert"
          style={{
            padding: '8px 16px',
            fontSize: '0.85rem',
            background: 'var(--destructive, #fee2e2)',
            color: '#991b1b',
          }}
        >
          {khoaDiscovery.catalogError}
        </div>
      )}
      {needsSheetConnect && (
        <div
          className="sheet-sync-banner"
          role="status"
          style={{
            padding: '8px 16px',
            fontSize: '0.85rem',
            background: 'var(--muted, #f1f5f9)',
            borderBottom: '1px solid var(--border, #e2e8f0)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          <span>
            Trình duyệt này chưa biết sổ Google Sheet (ẩn danh xóa bộ nhớ). Dùng link có{' '}
            <code>?sheet=</code> hoặc lưu sổ một lần — URL sẽ được gắn để lần sau mở lại.
          </span>
          {canEditSheetConnection(actor) ? (
            <button
              type="button"
              className="action-btn primary"
              style={{ padding: '4px 12px', fontSize: '0.85rem' }}
              onClick={() => setSheetConnectOpen(true)}
            >
              Chọn / lưu sổ lịch
            </button>
          ) : (
            <span>Liên hệ admin khoa để có link đăng nhập đúng sổ.</span>
          )}
        </div>
      )}
      {sheetSyncBanner}

      {useF210SoT && sheetConflictOpen && (
        <ConfirmDialog
          variant="info"
          title="Xung đột đồng bộ Sheet"
          message="Có bản lịch khác trên Sheet đã bị ghi đè theo last-write-wins. Bạn có thể nạp lại từ Sheet (bản hiện trên server) hoặc tiếp tục với bản máy này."
          confirmText="Nạp lại từ Sheet"
          cancelText="Tiếp tục bản máy này"
          onConfirm={() => {
            reloadFromSheet();
          }}
          onCancel={() => setSheetConflictOpen(false)}
        />
      )}

      <NotificationsPanel
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        settings={account.settings}
      />

      {isSheetBackend() && (
        <>
          <ConnectSheetDialog
            open={sheetConnectOpen}
            onOpenChange={setSheetConnectOpen}
            onConnected={() => {
              try {
                sessionStorage.removeItem('LICHKHOA_SHEET_CONNECT_DISMISSED');
              } catch {
                /* private mode */
              }
              setSheetConnectOpen(false);
              sheetSync.markForcePull();
              setSheetConnectionRevision((rev) => rev + 1);
            }}
          />
          <BootstrapKhoaDialog
            open={sheetSync.bootstrapOpen}
            onOpenChange={sheetSync.setBootstrapOpen}
            staffCount={staffList.length}
            taskCount={taskList.length}
            tenantLabel={sessionTitle}
            busy={sheetSync.bootstrapBusy}
            onConfirm={sheetSync.runBootstrap}
          />
          <KhoaDiscoveryDialog
            open={khoaDiscovery.catalogPickerOpen}
            onOpenChange={khoaDiscovery.setCatalogPickerOpen}
            entries={khoaDiscovery.catalogEntries}
            loading={khoaDiscovery.catalogLoading}
            onSelect={handlePickCatalogKhoa}
          />
        </>
      )}

      <main className="main-content">
        {activeView !== 'ACCOUNT' && (allow('week') || allow('month')) && (
          <TaskPalette tasks={taskList} categories={categories} staff={staffList} />
        )}

        {activeView === 'ACCOUNT' && accountView}
        {activeView === 'SHEET' && sheetView}
        {activeView === 'CALENDAR' && calendarView}
        {activeView === 'DASHBOARD' && dashboardView}
        {activeView === 'STAFF' && staffView}
        {activeView === 'TASKS' && tasksView}
      </main>
    </div>
  );
}
