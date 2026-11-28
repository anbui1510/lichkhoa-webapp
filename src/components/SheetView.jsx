import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SheetTabs } from './SheetTabs';
import { MonthSheet } from './MonthSheet';
import { SheetToolbar } from './SheetToolbar';
import { DayCalendar } from './DayCalendar';
import { MonthRolePickerModal } from './MonthRolePickerModal';
import { RoomSheet, roomTableOf } from './RoomSheet';
import { rectSelectionHooks } from '../logic/rectSelection';
import { combineMerges, mergeMenuItems, userMerges } from '../logic/merges';
import { activeEntry, expandSharedTaskStyles, paintCell, pushFormatUndo, selectedEntries } from '../logic/cellFormat';
import { LeaveLockHeaderControl } from './LeaveLockHeaderControl';
import {
  currentMonthKey,
  ensureMonthRolesFromGrid,
  formatMonthLabel,
  normalizeDaySessions,
  resolveMonthRoles,
  sessionLabel,
  shiftMonthKey,
} from '../logic/monthSchedule';
import {
  buildCathDisplayRows,
  CATH_ADD_SLOT_KEY,
  cathRolesForWeekGrid,
  resolveCathRoles,
} from '../logic/cathSchedule';
import { attachPaletteDrop } from '../logic/paletteDrop';
import { attachCellDragSwap } from '../logic/cellDragSwap';
import { applySheetZoom, patchHotCells, watchSheetViewport } from '../logic/sheetViewport';
import { taskForRole } from '../logic/taskMatch';
import { buildSessionAlertRow, lockConflictMessages } from '../logic/warningResolve';
import { buildWeekDays, missingFixedTaskMessages, normalizeWeekStartIso } from '../logic/schedulerEngine';
import { leadingTask, orderCellText } from '../logic/cellOrder';
import { canEdit, canSee, firstSheetPlan } from '../logic/access';
import { traineeCovers, traineeOnWeek } from '../logic/traineePeriod';
import { alertMuted } from '../logic/taskAlert';
import { HANDSONTABLE_LICENSE_KEY } from '../config/handsontable';
import { asArray } from '../logic/sheetStore/tableUtils';

const FIXED_COLS = 3;

function monthRoleGroup(role, taskList) {
  return taskForRole(role, taskList)?.category || '';
}

function findTaskColor(taskList, raw, roomNames) {
  const task = leadingTask(raw, taskList, roomNames);
  return task ? { bg: task.bgColor, text: task.textColor } : null;
}

function syncWeekFrame(hot) {
  if (!hot?.rootElement || hot.isDestroyed) return;
  let body = 0;
  for (let index = 0; index < hot.countRows(); index += 1) body += hot.getRowHeight(index) || 30;
  let cols = 0;
  for (let index = 0; index < hot.countCols(); index += 1) cols += hot.getColWidth(index) || 0;
  const zoom = parseFloat(hot.rootElement.style.zoom) || 1;
  const thead = hot.rootElement.querySelector('.ht_master .htCore thead');
  const measured = thead ? Math.ceil(thead.getBoundingClientRect().height / zoom) : 0;
  const table = hot.rootElement.querySelector('.ht_master .htCore');
  const tableWidth = table ? Math.ceil(table.getBoundingClientRect().width / zoom) : 0;
  const height = body + Math.max(measured, 48) + 4;
  const width = Math.max(cols + 4, tableWidth);
  const current = hot.getSettings();
  const next = {};
  if (current.height !== height) next.height = height;
  if (current.width !== width) next.width = width;
  if (Object.keys(next).length) hot.updateSettings(next);
}

const NAME_COL_WIDTH = 78;
const BALANCE_COL_WIDTH = 48;
const SESSION_COL_WIDTH = 96;
const NOTE_COL_WIDTH = 220;
/** Cột BÁC SĨ luôn ghim; sheet chưa chọn ghim cột thì ghim BÁC SĨ + BÙ + PHÉP. */
const WEEK_MIN_PIN_COLS = 1;
const WEEK_DEFAULT_PIN_COLS = FIXED_COLS;

function dayColumnWidth(viewport, sessionCount, zoom) {
  const scale = zoom > 0 ? zoom : 1;
  const count = Math.max(1, sessionCount);
  const available = viewport / scale - NAME_COL_WIDTH - BALANCE_COL_WIDTH * 2;
  return Math.max(64, Math.floor(available / count));
}

function columnWidthsFor(count, noteCol, sessionWidth) {
  return Array.from({ length: count }, (_, index) => {
    if (index === 0) return NAME_COL_WIDTH;
    if (index < FIXED_COLS) return BALANCE_COL_WIDTH;
    if (index === noteCol) return NOTE_COL_WIDTH;
    return sessionWidth;
  });
}

function cathActionButton(label, title, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'month-add-task';
  button.title = title;
  button.setAttribute('aria-label', title);
  button.textContent = label;
  button.addEventListener('mousedown', (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  return button;
}

function cathActionBar({ onAdd, onRemove, removeTitle }) {
  const wrap = document.createElement('div');
  wrap.className = 'week-cath-actions';
  if (onAdd) wrap.appendChild(cathActionButton('+', 'Thêm task từ lịch tháng', onAdd));
  if (onRemove) wrap.appendChild(cathActionButton('×', removeTitle || 'Xóa dòng', onRemove));
  return wrap;
}

const CATH_ROW_MIN_PX = 34;

function applyWeekRowHeights(hot, heights, savedRows) {
  const plugin = hot.getPlugin('manualRowResize');
  if (!plugin?.setManualSize) return false;
  let changed = false;
  heights.forEach((height, index) => {
    const kept = Math.max(height, savedRows?.[index] || 0);
    if (hot.getRowHeight(index) === kept) return;
    plugin.setManualSize(index, kept);
    changed = true;
  });
  return changed;
}

function measureWeekRowHeights(hot, table, { alertRow, noteCol, cathStart, cathCount }, savedRows) {
  const widths = [];
  for (let index = 0; index < hot.countCols(); index += 1) widths.push(hot.getColWidth(index));
  const heights = measureWeekHeights(table, widths, { alertRow, noteCol });
  for (let row = cathStart; row >= 0 && row < cathStart + cathCount; row += 1) {
    heights[row] = Math.max(heights[row] || 30, CATH_ROW_MIN_PX);
  }
  return heights.map((height, index) => Math.max(height, savedRows?.[index] || 0));
}

function defaultWeekColWidth(index, noteCol, sessionWidth = SESSION_COL_WIDTH) {
  if (index === 0) return NAME_COL_WIDTH;
  if (index < FIXED_COLS) return BALANCE_COL_WIDTH;
  if (index === noteCol) return NOTE_COL_WIDTH;
  return sessionWidth;
}

function fitWeekColumns(hot, { viewport, zoom, noteCol, manual }) {
  if (!hot || manual || viewport < 320) return;
  const sessions = Math.max(1, noteCol - FIXED_COLS);
  const session = dayColumnWidth(viewport, sessions, zoom);
  const widths = columnWidthsFor(hot.countCols(), noteCol, session);
  if (widths.every((value, index) => hot.getColWidth(index) === value)) return;
  hot.updateSettings({ colWidths: widths });
  syncWeekFrame(hot);
}

function measureWeekHeights(table, widths, { alertRow, noteCol }) {
  const probe = document.createElement('div');
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.left = '-9999px';
  probe.style.boxSizing = 'border-box';
  probe.style.whiteSpace = 'pre-wrap';
  probe.style.wordBreak = 'normal';
  probe.style.overflowWrap = 'break-word';
  probe.style.font = '700 0.82rem var(--font-main), sans-serif';
  document.body.appendChild(probe);
  const heights = asArray(table).map((line, rowIndex) => {
    const warning = rowIndex === alertRow;
    probe.style.lineHeight = warning ? '1.35' : '1.25';
    probe.style.padding = '4px 5px';
    probe.style.fontWeight = warning ? '600' : '700';
    let max = warning ? 28 : 30;
    asArray(line).forEach((text, col) => {
      const value = String(text || '');
      if (!value.trim()) return;
      if (!warning && col === 0) {
        probe.style.width = `${Math.max(48, Number(widths?.[0]) || NAME_COL_WIDTH)}px`;
        probe.textContent = value;
        max = Math.max(max, probe.offsetHeight + 2);
        return;
      }
      if (!warning && col > 0 && col < FIXED_COLS) return;
      const fallback = col === noteCol ? NOTE_COL_WIDTH : SESSION_COL_WIDTH;
      probe.style.width = `${Math.max(48, Number(widths?.[col]) || fallback)}px`;
      probe.textContent = value;
      max = Math.max(max, probe.offsetHeight + 2);
    });
    return max;
  });
  probe.remove();
  return heights;
}

function weekScrollParents(root) {
  const nodes = new Set();
  let node = root?.closest('.sheet-scroll');
  while (node) {
    nodes.add(node);
    node = node.parentElement?.closest('.sheet-scroll, .view-container, .main-content');
  }
  return [...nodes];
}

/**
 * Không dùng ht_clone_left: clone là bảng riêng → chiều cao hàng lệch master (bug lệch BS).
 * Ghim cột bằng ô trên cùng một bảng master: translateX(--week-pin-x) theo cuộn .sheet-scroll.
 */
function weekPinCount(hot) {
  return Math.max(0, Number(hot?.getSettings?.().stickyColumnsStart) || 0);
}

function weekPinOffset(hot, col) {
  let left = 0;
  for (let index = 0; index < col; index += 1) left += hot.getColWidth(index) || 0;
  return left;
}

/** Gắn class ghim; HOT reset ô mỗi render nên gọi từ renderer / afterGetColHeader. */
function pinWeekCell(hot, cell, col, span = 1) {
  if (!cell) return;
  const count = weekPinCount(hot);
  cell.classList.remove('week-pin-col', 'week-pin-edge');
  cell.style.removeProperty('left');
  if (col < 0 || count <= 0 || col >= count) return;
  cell.classList.add('week-pin-col');
  if (col + Math.max(1, span) >= count) cell.classList.add('week-pin-edge');
}

function stickWeekFreeze(hot) {
  const root = hot?.rootElement;
  const scroller = root?.closest('.sheet-scroll');
  const top = root?.querySelector('.ht_clone_top');
  if (!root || hot.isDestroyed || !scroller?.classList.contains('is-open')) return;
  const zoom = parseFloat(root.style.zoom) || 1;
  const rootRect = root.getBoundingClientRect();
  const pinBox = scroller.getBoundingClientRect();
  const pinCols = weekPinCount(hot);
  const maxX = Math.max(0, weekPinOffset(hot, hot.countCols()) - weekPinOffset(hot, pinCols));
  const shiftX = Math.round(Math.max(0, Math.min((pinBox.left - rootRect.left) / zoom, maxX)));
  const shiftY = Math.round(Math.max(0, (pinBox.top - rootRect.top) / zoom));
  root.style.setProperty('--week-pin-x', `${shiftX}px`);
  if (top) top.style.transform = shiftY ? `translate3d(0, ${shiftY}px, 0)` : '';
  root.classList.toggle('is-pin-x', shiftX > 0);
  root.classList.toggle('is-pin-y', shiftY > 0);
}

export function SheetView({
  dept,
  staffList,
  taskList,
  scheduleData,
  onUpdateCell,
  onUpdateCathCell,
  onRenameCathRole,
  onAddCathRole,
  onDeleteCathRole,
  onDateChange,
  onGoCurrentWeek,
  currentStartDate,
  sheets,
  activeSheetId,
  onSelectSheet,
  onAddSheet,
  onRenameSheet,
  onDuplicateSheet,
  onDeleteSheet,
  onMoveSheet,
  onColorSheet,
  monthKey,
  leaveMonthKey,
  studyMonthKey,
  onMonthKeyChange,
  onLeaveMonthKeyChange,
  onStudyMonthKeyChange,
  onUpdateMonthCell,
  onPatchStyles,
  onAddMonthRole,
  onInsertMonthRole,
  onRenameMonthRole,
  onDeleteMonthRole,
  onReorderMonthRole,
  onInsertMonthColumn,
  onRemoveMonthColumn,
  onRenameMonthColumn,
  onUpdateMonthCustomCell,
  onMonthMerges,
  categories,
  onAddTask,
  onUpdateTask,
  onAddCategory,
  onDeleteCategory,
  onUpdateRooms,
  onWeekMerges,
  onDaySessions,
  leaveEntries,
  studyEntries,
  onSaveLeave,
  onDeleteLeave,
  onSaveStudy,
  onDeleteStudy,
  onFreeze,
  onUpdateNote,
  onUpdateBalance,
  onAutoSchedule,
  onPourWeekFromMonth,
  onPublishWeek,
  onUnpublishWeek,
  weekPublished = true,
  canManagePublish = false,
  weekMasked = false,
  actor,
  leaveLockBanner = null,
  leaveReadOnly = false,
  leaveLockAt = null,
  canManageLeaveLock = false,
  leaveLockBusy = false,
  onSaveLeaveLock,
}) {
  const containerRef = useRef(null);
  const hotInstanceRef = useRef(null);
  const weekEditRef = useRef(null);
  const stylesRef = useRef(scheduleData.cellStyles || {});
  const taskListRef = useRef(taskList);
  const onUpdateRef = useRef(onUpdateCell);
  const onCathCellRef = useRef(onUpdateCathCell);
  const onCathRenameRef = useRef(onRenameCathRole);
  const openCathAddRef = useRef(() => {});
  const onCathDeleteRef = useRef(onDeleteCathRole);
  const onNoteRef = useRef(onUpdateNote);
  const onBalanceRef = useRef(onUpdateBalance);
  const describeRef = useRef(() => null);
  const bridge = useRef({
    hot: null,
    describe: () => null,
    getSelectedEntries: () => [],
    getActiveEntry: () => null
  });
  const formatCtl = useRef({ armed: false, style: null });
  const patchRef = useRef(onPatchStyles);
  const weekMergesRef = useRef(scheduleData.weekMerges || []);
  const onWeekMergesRef = useRef(onWeekMerges);
  const alertMergeRef = useRef([]);
  const roomNamesRef = useRef([]);
  const weekSizeRef = useRef({ cols: null, rows: null });
  const uiRef = useRef({});
  const [plan, setPlan] = useState('week');
  const prevPlanRef = useRef('week');
  const [monthGroupKeys, setMonthGroupKeys] = useState(null);
  const [warm, setWarm] = useState({ month: false, leave: false, study: false });
  const [longNonce, setLongNonce] = useState(0);
  const [teachNonce, setTeachNonce] = useState(0);
  const [zoom, setZoom] = useState(100);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const readOnlyRef = useRef(false);
  readOnlyRef.current = !canEdit(actor, 'week');
  const shownPlanRef = useRef('week');
  const [painting, setPainting] = useState(false);
  const [activeStyle, setActiveStyle] = useState(null);
  const activeMonth = monthKey || currentMonthKey();
  const activeLeaveMonth = leaveMonthKey || monthKey || currentMonthKey();
  const activeStudyMonth = studyMonthKey || monthKey || currentMonthKey();
  const [addOpen, setAddOpen] = useState(false);
  const [cathAddOpen, setCathAddOpen] = useState(false);
  const [monthColorRoleKey, setMonthColorRoleKey] = useState(null);

  const monthRolesForCathPick = useMemo(() => {
    const fromGrid = ensureMonthRolesFromGrid(scheduleData.monthRoles, scheduleData.monthGrid);
    if (fromGrid.length) return fromGrid;
    return resolveMonthRoles(scheduleData.monthRoles);
  }, [scheduleData.monthRoles, scheduleData.monthGrid]);

  const cathTakenRoles = useMemo(
    () => resolveCathRoles(scheduleData.cathRoles, scheduleData.monthRoles),
    [scheduleData.cathRoles, scheduleData.monthRoles]
  );

  const { grid, roomWarnings, warnings } = scheduleData;
  const weekDays = useMemo(
    () => buildWeekDays(normalizeWeekStartIso(currentStartDate || scheduleData.startDate)),
    [currentStartDate, scheduleData.startDate]
  );
  const weekDaysRef = useRef(weekDays);
  weekDaysRef.current = weekDays;
  const days = weekDays;
  /** Cùng danh sách hàng lưới tuần — đổ shortName lên hàng BS chính (1 cột / BS). */
  const weekStaff = staffList.filter(person => traineeOnWeek(person, days));
  const roomTable = roomTableOf(scheduleData, weekStaff);
  const hiddenRoomDoctors = staffList
    .filter(person => !traineeOnWeek(person, days))
    .map(person => String(person.shortName || '').trim())
    .filter(Boolean);
  const monthFilterGroups = useMemo(() => {
    const used = new Set((scheduleData.monthRoles || []).map(role => monthRoleGroup(role, taskList)));
    const groups = (categories || [])
      .filter(item => used.has(item.key))
      .map(item => ({ key: item.key, label: item.label }));
    if (used.has('')) groups.push({ key: '', label: 'Chưa phân nhóm' });
    return groups;
  }, [scheduleData.monthRoles, taskList, categories]);
  const visibleMonthRoles = useMemo(() => {
    const roles = scheduleData.monthRoles || [];
    if (!monthGroupKeys) return roles;
    const allow = new Set(monthGroupKeys);
    return roles.filter(role => allow.has(monthRoleGroup(role, taskList)));
  }, [scheduleData.monthRoles, taskList, monthGroupKeys]);
  const monthGridHasRoleData = useMemo(() => {
    const grid = scheduleData.monthGrid || {};
    return Object.keys(grid).some((key) => {
      if (key.startsWith('x|')) return false;
      const parts = key.split('|');
      if (parts.length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(parts[0])) return false;
      return String(grid[key] ?? '').trim() !== '';
    });
  }, [scheduleData.monthGrid]);
  const monthRolesFilteredEmpty = (scheduleData.monthRoles || []).length > 0 && visibleMonthRoles.length === 0;
  const monthRolesMissingRows = (scheduleData.monthRoles || []).length === 0 && monthGridHasRoleData;
  const monthTaskColorEdit = useMemo(() => {
    if (plan !== 'month') return null;
    const roles = scheduleData.monthRoles || [];
    const role = roles.find((item) => item.key === monthColorRoleKey);
    if (!role) {
      return {
        disabled: true,
        hint: 'Chọn ô Nhiệm vụ (cột task) trên lịch tháng',
        bgColor: '#3b82f6',
        textColor: '#111827',
      };
    }
    const task = taskForRole(role, taskList);
    if (!task) {
      return {
        disabled: true,
        hint: 'Dòng này chưa gắn task — nhập mã task trước',
        bgColor: '#e5e7eb',
        textColor: '#111827',
      };
    }
    return {
      bgColor: task.bgColor || '#3b82f6',
      textColor: task.textColor || '#111827',
      onChange: (field, value) => {
        onUpdateTask?.({ ...task, [field]: value });
      },
    };
  }, [plan, monthColorRoleKey, scheduleData.monthRoles, taskList, onUpdateTask]);

  const toggleMonthGroup = (key) => {
    const all = monthFilterGroups.map(item => item.key);
    const current = monthGroupKeys == null
      ? all
      : monthGroupKeys.filter(item => all.includes(item));
    const next = current.includes(key)
      ? current.filter(item => item !== key)
      : [...current, key];
    const showsAll = next.length === all.length && all.every(item => next.includes(item));
    setMonthGroupKeys(showsAll ? null : next);
  };

  stylesRef.current = scheduleData.cellStyles || {};
  taskListRef.current = taskList;
  onUpdateRef.current = onUpdateCell;
  onCathCellRef.current = onUpdateCathCell;
  onCathRenameRef.current = onRenameCathRole;
  openCathAddRef.current = () => setCathAddOpen(true);
  onCathDeleteRef.current = onDeleteCathRole;
  onNoteRef.current = onUpdateNote;
  onBalanceRef.current = onUpdateBalance;
  patchRef.current = onPatchStyles;
  weekMergesRef.current = scheduleData.weekMerges || [];
  onWeekMergesRef.current = onWeekMerges;
  bridge.current.styles = scheduleData.cellStyles || {};
  uiRef.current.styles = scheduleData.cellStyles || {};
  uiRef.current.onActiveStyle = (style) => setActiveStyle(style);
  uiRef.current.onPatchStyles = onPatchStyles;
  uiRef.current.onVisibleMonth = null;
  uiRef.current.onMonthRoleSelect = (roleKey) => setMonthColorRoleKey(roleKey || null);
  uiRef.current.onPaint = (entries, style) => {
    const tab = shownPlanRef.current === 'month' ? 'month' : 'week';
    if (!canEdit(actor, tab)) return;
    setPainting(false);
    if (!entries.length) return;
    const prev = {};
    const next = {};
    entries.forEach((entry) => {
      prev[entry.key] = entry.style ? { ...entry.style } : null;
      next[entry.key] = style && Object.keys(style).length ? { ...style } : null;
    });
    expandSharedTaskStyles(stylesRef.current, prev, next);
    pushFormatUndo(bridge.current.hot, prev, next, (map) => patchRef.current(map));
  };

  const weekModel = useMemo(() => {
  const sessions = normalizeDaySessions(scheduleData.daySessions);
  const cathRoles = cathRolesForWeekGrid(scheduleData.cathRoles, scheduleData.monthRoles);
  const cathRolesForAlerts = cathRoles.filter((row) => row.key !== CATH_ADD_SLOT_KEY);
  const alertRows = [
    ...asArray(warnings),
    ...asArray(roomWarnings),
    ...lockConflictMessages({ grid, staffList: weekStaff, days, sessions, taskList }),
    ...missingFixedTaskMessages({
      grid,
      staffList: weekStaff,
      days,
      sessions,
      taskList,
      cathGrid: scheduleData.cathGrid,
      cathRoles: cathRolesForAlerts
    })
  ].filter(message => !alertMuted(message, taskList));
  const roomLabelIndex = (roomTable.labels || []).findIndex(label => String(label || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .includes('phong'));
  const roomNames = (roomTable.matrix?.[roomLabelIndex >= 0 ? roomLabelIndex : 1] || [])
    .map(item => String(item || '').trim())
    .filter(Boolean);
  roomNamesRef.current = roomNames;
  const rowData = weekStaff.map(s => {
    const sData = grid[s.shortName] || {};
    const row = [s.shortName, s.buBalance, s.phepBalance];
    for (let d = 0; d < 7; d += 1) {
      sessions.forEach(id => {
        const text = traineeCovers(s, days[d]?.iso) ? (sData[d]?.[id] || '') : '';
        row.push(orderCellText(text, taskList, roomNames));
      });
    }
    row.push(sData.note || '');
    return row;
  });
  const monthRolesForCath = ensureMonthRolesFromGrid(scheduleData.monthRoles, scheduleData.monthGrid);
  const cathRows = buildCathDisplayRows({
    roles: cathRoles,
    days,
    sessions,
    monthGrid: scheduleData.monthGrid,
    cathGrid: scheduleData.cathGrid,
    monthRoles: monthRolesForCath,
  });
  const doctorCount = weekStaff.length;
  const cathStart = doctorCount;
  const noteCol = FIXED_COLS + 7 * sessions.length;
  const weekWidth = noteCol + 1;
  const freezeRows = Math.max(0, Number(scheduleData.freeze?.week?.rows) || 0);
  // Stored 0 vẫn nâng lên 1 (BÁC SĨ).
  const storedFreezeCols = scheduleData.freeze?.week?.cols;
  const freezeCols = storedFreezeCols == null
    ? WEEK_DEFAULT_PIN_COLS
    : Math.max(WEEK_MIN_PIN_COLS, Number(storedFreezeCols) || 0);
  const alertLine = alertRows.length
    ? buildSessionAlertRow(alertRows, {
      days, sessions, weekWidth, noteCol, leaveEntries, studyEntries, grid, staffList, taskList
    })
    : null;
  const alertIndex = alertLine ? cathStart + cathRoles.length : -1;
  const weekData = alertLine ? [...rowData, ...cathRows, alertLine] : [...rowData, ...cathRows];

  const topHeaders = [
    'BÁC SĨ',
    'BÙ',
    'PHÉP',
    ...days.map(d => ({
      label: `${d.dayName} (${d.dateStr})`,
      colspan: sessions.length
    })),
    'Ghi chú'
  ];
  const subHeaders = ['', '', '', ...days.flatMap(() => sessions.map(sessionLabel)), ''];

  const dataKey = JSON.stringify([...rowData, ...cathRows]);
  const headerKey = `${sessions.join('')}|${days.map(d => d.dateStr).join(',')}`;
  const gridShape = `${headerKey}|${weekData.length}|${weekWidth}|${freezeRows}|${freezeCols}|${currentStartDate}`;
  const paintKey = `${dataKey}|${alertRows.join('|')}`;
  return {
    sessions, alertRows, roomNames, rowData, cathRoles, cathRows,
    doctorCount, cathStart, noteCol, freezeRows, freezeCols, alertLine, alertIndex,
    weekData, topHeaders, subHeaders, gridShape, paintKey
  };
  }, [scheduleData, staffList, weekStaff, taskList, leaveEntries, studyEntries, currentStartDate, days, grid, warnings, roomWarnings]);
  const {
    sessions, alertRows, roomNames, rowData, cathRoles, cathRows,
    doctorCount, cathStart, noteCol, freezeRows, freezeCols, alertLine, alertIndex,
    weekData, topHeaders, subHeaders, gridShape, paintKey
  } = weekModel;
  weekEditRef.current = {
    rowData, cathRoles, cathStart, doctorCount, days, sessions, noteCol, alertIndex
  };

  describeRef.current = (row, col) => {
    if (row >= cathStart && row < cathStart + cathRoles.length) {
      const role = cathRoles[row - cathStart];
      if (!role || col < 0) return null;
      if (col === 0) return { key: `w|cath|${role.key}|label`, style: stylesRef.current[`w|cath|${role.key}|label`] || null };
      if (col < FIXED_COLS || col === noteCol) return null;
      const offset = col - FIXED_COLS;
      const day = days[Math.floor(offset / sessions.length)];
      if (!day) return null;
      const session = sessions[offset % sessions.length];
      const key = `w|cath|${role.key}|${day.fullDateStr}|${session}`;
      return { key, style: stylesRef.current[key] || null };
    }
    const staff = weekStaff[row];
    if (!staff || col < 0) return null;
    let key = null;
    if (col === 0) key = `w|${staff.shortName}|label`;
    else if (col === 1) key = `w|${staff.shortName}|bu`;
    else if (col === 2) key = `w|${staff.shortName}|phep`;
    else if (col === noteCol) key = `w|${staff.shortName}|note`;
    else {
      const offset = col - FIXED_COLS;
      const day = days[Math.floor(offset / sessions.length)];
      if (!day) return null;
      const session = sessions[offset % sessions.length];
      key = `w|${staff.shortName}|${day.fullDateStr}|${session}`;
    }
    return { key, style: stylesRef.current[key] || null };
  };

  useEffect(() => {
    if (!containerRef.current || !window.Handsontable) return undefined;

    if (hotInstanceRef.current) {
      hotInstanceRef.current.destroy();
      hotInstanceRef.current = null;
    }

    alertMergeRef.current = [];

    const colCount = weekData[0]?.length || 0;
    const savedCols = weekSizeRef.current.cols;
    const useSavedCols = savedCols && savedCols.length === colCount;
    const savedRows = weekSizeRef.current.rows;
    const useSavedRows = savedRows && savedRows.length === weekData.length;
    const frameWidth = containerRef.current?.closest('.sheet-scroll')?.clientWidth || 0;
    const fittedSession = frameWidth > 320
      ? dayColumnWidth(frameWidth, Math.max(1, noteCol - FIXED_COLS), zoomRef.current / 100)
      : SESSION_COL_WIDTH;
    const colWidths = Array.from({ length: colCount }, (_, index) => (
      useSavedCols && savedCols[index] > 0 ? savedCols[index] : defaultWeekColWidth(index, noteCol, fittedSession)
    ));
    const alertRow = alertIndex;
    const wrappedHeights = measureWeekHeights(weekData, colWidths, { alertRow, noteCol });
    const hot = new window.Handsontable(containerRef.current, {
      data: weekData,
      nestedHeaders: [topHeaders, subHeaders],
      // rowHeaders hoặc fixedColumnsStart > 0 làm HOT dựng lại clone trái (lệch hàng với master).
      rowHeaders: false,
      height: wrappedHeights.reduce((sum, row) => sum + row, 0) + 56,
      width: colWidths.reduce((sum, col) => sum + col, 0) + 4,
      licenseKey: HANDSONTABLE_LICENSE_KEY,
      stretchH: 'none',
      fixedRowsTop: freezeRows,
      fixedColumnsStart: 0,
      stickyColumnsStart: freezeCols,
      wordWrap: false,
      autoRowSize: false,
      autoColumnSize: false,
      viewportRowRenderingOffset: 2,
      viewportColumnRenderingOffset: 2,
      colWidths,
      rowHeights(index) {
        const measured = wrappedHeights[index] || 30;
        if (useSavedRows && savedRows[index] > measured) return savedRows[index];
        return measured;
      },
      manualColumnResize: true,
      manualRowResize: true,
      contextMenu: {
        items: {
          row_above: {},
          row_below: {},
          remove_row: {},
          col_left: {},
          col_right: {},
          remove_col: {},
          hsep_merge: '---------',
          ...mergeMenuItems((instance) => {
            if (readOnlyRef.current) return;
            const next = userMerges(instance, alertMergeRef.current);
            if (JSON.stringify(next) === JSON.stringify(weekMergesRef.current)) return;
            weekMergesRef.current = next;
            onWeekMergesRef.current?.(next);
          }),
          hsep2: '---------',
          undo: {},
          redo: {},
          copy: {},
          cut: {}
        }
      },
      copyPaste: true,
      undo: true,
      selectionMode: 'multiple',
      fillHandle: true,
      outsideClickDeselects: false,
      mergeCells: combineMerges([], weekMergesRef.current),
      ...rectSelectionHooks(),
      cells(row, col) {
        const cellProperties = {};
        const meta = weekEditRef.current;
        const desc = describeRef.current(row, col);
        const isAlert = meta.alertIndex >= 0 && row === meta.alertIndex;
        const isCath = row >= meta.cathStart && row < meta.cathStart + meta.cathRoles.length;
        const role = isCath ? meta.cathRoles[row - meta.cathStart] : null;
        const isNote = col === meta.noteCol;
        const isBalance = col === 1 || col === 2;
        const cathEditable = isCath && role?.source === 'local' && role?.key !== CATH_ADD_SLOT_KEY && (
          col === 0 || (col >= FIXED_COLS && col < meta.noteCol)
        );
        if (readOnlyRef.current || isAlert || (isCath && !cathEditable) || (!isCath && col < FIXED_COLS && !isBalance && !isNote)) {
          cellProperties.readOnly = true;
        }
        const wrapMode = desc?.style?.wrap;
        const naturalWrap = !isAlert && !isCath && (isNote || col >= FIXED_COLS) && wrapMode !== 'clip' && wrapMode !== 'overflow';
        cellProperties.wordWrap = isAlert || naturalWrap || wrapMode === 'wrap';
        if (naturalWrap) cellProperties.className = 'week-task';
        cellProperties.renderer = function weekRenderer(instance, td) {
          const live = weekEditRef.current;
          const liveNote = live.noteCol;
          const liveAlert = live.alertIndex >= 0 && row === live.alertIndex;
          const liveCath = row >= live.cathStart && row < live.cathStart + live.cathRoles.length;
          const liveRole = liveCath ? live.cathRoles[row - live.cathStart] : null;
          window.Handsontable.renderers.TextRenderer.apply(this, arguments);
          td.style.removeProperty('background-color');
          td.style.removeProperty('color');
          td.style.fontWeight = '';
          td.classList.remove('week-warning', 'week-task', 'week-cath-name');
          td.removeAttribute('title');
          pinWeekCell(instance, td, col);
          if (liveAlert) {
            const text = String(instance.getDataAtCell(row, col) || '').trim();
            if (text) td.classList.add('week-warning');
            return;
          }
          if (liveCath) {
            if (col === 0) td.classList.add('week-cath-name');
            if (col === 1 && !readOnlyRef.current && liveCath) {
              td.innerHTML = '';
              const isAddSlot = liveRole?.key === CATH_ADD_SLOT_KEY;
              const onAdd = isAddSlot ? () => openCathAddRef.current?.() : null;
              const onRemove = (!isAddSlot && liveRole?.source !== 'slot')
                ? () => {
                  if (window.confirm(`Xóa dòng ${liveRole.label}?`)) onCathDeleteRef.current?.(liveRole.key);
                }
                : null;
              td.appendChild(cathActionBar({
                onAdd,
                onRemove,
                removeTitle: liveRole?.label ? `Xóa ${liveRole.label}` : 'Xóa dòng',
              }));
            }
            const task = taskForRole(liveRole, taskListRef.current);
            const text = String(instance.getDataAtCell(row, col) || '').trim();
            const user = describeRef.current(row, col)?.style;
            const dayCell = col >= FIXED_COLS && col < liveNote;
            if (task && (col === 0 || (dayCell && text))) {
              if (!user?.bg && task.bgColor) td.style.setProperty('background-color', task.bgColor, 'important');
              if (!user?.color && task.textColor) td.style.setProperty('color', task.textColor, 'important');
              if (!user?.bold) td.style.fontWeight = '700';
            }
            paintCell(td, user);
            return;
          }
          if (naturalWrap) td.classList.add('week-task');
          if (!liveCath && col === 0) td.classList.add('week-staff-name');
          if (!liveCath && (col === 1 || col === 2)) td.classList.add('week-balance');
          if (col >= FIXED_COLS && col < liveNote) {
            const val = instance.getDataAtCell(row, col);
            const color = findTaskColor(taskListRef.current, val, roomNamesRef.current);
            const user = describeRef.current(row, col)?.style;
            if (color && !user?.bg) td.style.setProperty('background-color', color.bg || '#1f2937', 'important');
            if (color && !user?.color) td.style.setProperty('color', color.text || '#111827', 'important');
            if (color && !user?.bold) td.style.fontWeight = '700';
          }
          paintCell(td, describeRef.current(row, col)?.style);
        };
        return cellProperties;
      },
      afterGetColHeader(col, TH, headerLevel) {
        if (col >= 0 && (col < FIXED_COLS || col === noteCol)) {
          if (headerLevel === 1) {
            TH.style.display = 'none';
            TH.textContent = '';
            TH.classList.remove('ht-span-gap');
            pinWeekCell(this, TH, col, TH.colSpan || 1);
            return;
          }
          TH.rowSpan = 2;
          TH.classList.add('ht-span-label', 'ht-span-merged');
          const label = String(TH.textContent || '').trim();
          TH.replaceChildren();
          const span = document.createElement('span');
          span.className = 'col-title col-title--merged';
          span.textContent = label;
          TH.appendChild(span);
          pinWeekCell(this, TH, col, TH.colSpan || 1);
          return;
        }
        if (headerLevel === 0 && col >= FIXED_COLS && col < noteCol && (col - FIXED_COLS) % sessions.length === 0) {
          const day = weekDaysRef.current[Math.floor((col - FIXED_COLS) / sessions.length)];
          if (day?.dateStr && !String(day.dateStr).includes('NaN')) {
            TH.classList.add('ht-day-head');
            TH.innerHTML = `<div class="day-head">${day.dayName} (${day.dateStr})</div>`;
          }
        }
        if (headerLevel === 1 && col >= FIXED_COLS && col < noteCol) {
          TH.classList.add('ht-session-head');
        }
        pinWeekCell(this, TH, col, TH.colSpan || 1);
      },
      afterChange(changes, source) {
        if (readOnlyRef.current || source === 'loadData' || !changes) return;
        const meta = weekEditRef.current;
        changes.forEach(([row, col, oldVal, newVal]) => {
          if (oldVal === newVal) return;
          if (row >= meta.cathStart && row < meta.cathStart + meta.cathRoles.length) {
            const role = meta.cathRoles[row - meta.cathStart];
            if (!role) return;
            if (col === 0) {
              if (role.source === 'local') onCathRenameRef.current?.(role.key, newVal ?? '');
              return;
            }
            if (col >= FIXED_COLS && col < meta.noteCol) {
              const dayIdx = Math.floor((col - FIXED_COLS) / meta.sessions.length);
              const session = meta.sessions[(col - FIXED_COLS) % meta.sessions.length];
              onCathCellRef.current?.(meta.days[dayIdx]?.iso, role.key, session, newVal ?? '');
            }
            return;
          }
          if (row >= meta.doctorCount) return;
          if (col === meta.noteCol && oldVal !== newVal) {
            onNoteRef.current?.(meta.rowData[row][0], newVal ?? '');
            return;
          }
          if ((col === 1 || col === 2) && oldVal !== newVal) {
            const saved = onBalanceRef.current?.(meta.rowData[row][0], col === 1 ? 'bu' : 'phep', newVal);
            if (saved === false) this.setDataAtCell(row, col, oldVal ?? '', 'loadData');
          }
          if (col >= FIXED_COLS && col < meta.noteCol && oldVal !== newVal) {
            const shortName = meta.rowData[row][0];
            const dayIdx = Math.floor((col - FIXED_COLS) / meta.sessions.length);
            const session = meta.sessions[(col - FIXED_COLS) % meta.sessions.length];
            onUpdateRef.current?.(shortName, dayIdx, session, newVal ?? '');
          }
        });
      },
      afterColumnResize() {
        const widths = [];
        for (let index = 0; index < this.countCols(); index += 1) widths.push(this.getColWidth(index));
        weekSizeRef.current.manual = true;
        weekSizeRef.current.cols = widths;
        const meta = weekEditRef.current;
        const heights = measureWeekRowHeights(this, this.getData(), {
          alertRow: meta.alertIndex,
          noteCol: meta.noteCol,
          cathStart: meta.cathStart,
          cathCount: meta.cathRoles?.length || 0,
        }, weekSizeRef.current.rows);
        const changed = applyWeekRowHeights(this, heights, weekSizeRef.current.rows);
        if (changed) this.render();
        requestAnimationFrame(() => {
          syncWeekFrame(this);
          stickWeekFreeze(this);
        });
      },
      afterRowResize() {
        const heights = [];
        for (let index = 0; index < this.countRows(); index += 1) heights.push(this.getRowHeight(index));
        weekSizeRef.current.rows = heights;
        requestAnimationFrame(() => {
          syncWeekFrame(this);
          stickWeekFreeze(this);
        });
      },
      afterViewRender() {
        // HOT xóa transform của clone top mỗi lần vẽ — ghim lại ngay, không đợi frame sau.
        stickWeekFreeze(this);
      },
      afterSelectionEnd() {
        bridge.current.hot = this;
        bridge.current.describe = (row, col) => describeRef.current(row, col);
        bridge.current.getSelectedEntries = () => selectedEntries(this, describeRef.current);
        bridge.current.getActiveEntry = () => activeEntry(this, describeRef.current);
        const entries = selectedEntries(this, describeRef.current);
        const entry = activeEntry(this, describeRef.current);
        // Stash for toolbar — mobile taps often clear HOT selection before format runs.
        bridge.current.lastEntries = entries;
        bridge.current.lastActive = entry;
        uiRef.current.onActiveStyle?.(entry?.style || null);
        const ctl = formatCtl.current;
        if (!ctl?.armed) return;
        const painted = ctl.style || {};
        ctl.armed = false;
        uiRef.current.onPaint?.(entries, painted);
      }
    });

    hotInstanceRef.current = hot;
    if (shownPlanRef.current === 'week') {
      bridge.current.hot = hot;
      bridge.current.describe = (row, col) => describeRef.current(row, col);
      bridge.current.getSelectedEntries = () => selectedEntries(hot, describeRef.current);
      bridge.current.getActiveEntry = () => activeEntry(hot, describeRef.current);
    }

    const detachDrop = attachPaletteDrop(hot);
    const stopFit = watchSheetViewport(hot, () => zoomRef.current / 100, { lockHeight: true });
    const frame = containerRef.current?.closest('.sheet-scroll');
    let fitFrame = 0;
    const refitColumns = () => {
      fitWeekColumns(hot, {
        viewport: frame?.clientWidth || 0,
        zoom: zoomRef.current / 100,
        noteCol: weekEditRef.current.noteCol,
        manual: weekSizeRef.current.manual
      });
    };
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(fitFrame);
      fitFrame = requestAnimationFrame(refitColumns);
    });
    if (frame) observer.observe(frame);
    let pinFrame = 0;
    const onFrameScroll = () => {
      cancelAnimationFrame(pinFrame);
      pinFrame = requestAnimationFrame(() => stickWeekFreeze(hot));
    };
    const scrollers = frame ? weekScrollParents(frame) : [];
    scrollers.forEach((node) => node.addEventListener('scroll', onFrameScroll, { passive: true }));
    requestAnimationFrame(() => {
      refitColumns();
      syncWeekFrame(hot);
      stickWeekFreeze(hot);
    });
    const detachDrag = attachCellDragSwap(hot, {
      describe: (row, col) => describeRef.current(row, col),
      onPatchStyles: (prev, next) => {
        pushFormatUndo(hot, prev, next, (map) => patchRef.current(map));
      }
    });
    return () => {
      detachDrop();
      detachDrag();
      stopFit();
      cancelAnimationFrame(fitFrame);
      observer.disconnect();
      scrollers.forEach((node) => node.removeEventListener('scroll', onFrameScroll));
      cancelAnimationFrame(pinFrame);
      if (bridge.current.hot === hot) {
        bridge.current.hot = null;
        bridge.current.describe = () => null;
        bridge.current.getSelectedEntries = () => [];
        bridge.current.getActiveEntry = () => null;
      }
      hot.destroy();
      hotInstanceRef.current = null;
    };
    // Rebuild only when columns, row count, or the week itself change.
    // Cell text is patched in place by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridShape]);

  useEffect(() => {
    const hot = hotInstanceRef.current;
    patchHotCells(hot, weekData);
    if (!hot) return;
    const meta = weekEditRef.current;
    const heights = measureWeekRowHeights(hot, weekData, {
      alertRow: meta.alertIndex,
      noteCol: meta.noteCol,
      cathStart: meta.cathStart,
      cathCount: meta.cathRoles?.length || 0,
    }, weekSizeRef.current.rows);
    const changed = applyWeekRowHeights(hot, heights, weekSizeRef.current.rows);
    const align = () => {
      if (hot.isDestroyed) return;
      if (changed) hot.render();
      syncWeekFrame(hot);
      stickWeekFreeze(hot);
    };
    requestAnimationFrame(() => requestAnimationFrame(align));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paintKey]);

  useEffect(() => {
    if (plan !== 'week') return;
    stylesRef.current = scheduleData.cellStyles || {};
    hotInstanceRef.current?.render();
  }, [plan, scheduleData.cellStyles, taskList, readOnlyRef.current]);

  useEffect(() => {
    if (canSee(actor, plan)) return;
    const next = firstSheetPlan(actor);
    if (next) setPlan(next);
  }, [actor, plan]);

  useEffect(() => {
    const visibleWeek = canSee(actor, 'week');
    const visibleMonth = canSee(actor, 'month');
    const active = visibleWeek && plan === 'week'
      ? 'week'
      : (visibleMonth && plan === 'month' ? 'month' : plan);
    const prev = prevPlanRef.current;
    if (
      prev === 'month'
      && active === 'week'
      && !weekMasked
      && canEdit(actor, 'week')
      && onPourWeekFromMonth
    ) {
      onPourWeekFromMonth();
    }
    prevPlanRef.current = active;
  }, [plan, actor, onPourWeekFromMonth, weekMasked]);

  useEffect(() => {
    const hot = hotInstanceRef.current;
    if (!hot) return undefined;
    if (plan !== 'week') {
      hot.suspendRender?.();
      return undefined;
    }
    hot.resumeRender?.();
    bridge.current.hot = hot;
    bridge.current.describe = (row, col) => describeRef.current(row, col);
    bridge.current.getSelectedEntries = () => selectedEntries(hot, describeRef.current);
    bridge.current.getActiveEntry = () => activeEntry(hot, describeRef.current);
    const id = requestAnimationFrame(() => {
      hot.refreshDimensions?.();
      applySheetZoom(hot, zoomRef.current / 100);
      fitWeekColumns(hot, {
        viewport: hot.rootElement?.closest('.sheet-scroll')?.clientWidth || 0,
        zoom: zoomRef.current / 100,
        noteCol: weekEditRef.current.noteCol,
        manual: weekSizeRef.current.manual
      });
      syncWeekFrame(hot);
      hot.render();
    });
    return () => cancelAnimationFrame(id);
  }, [plan, zoom]);

  const activeSheetMeta = sheets.find(s => s.id === activeSheetId);

  const buildExportPayload = () => ({
    deptName: dept?.name,
    sheetLabel: activeSheetMeta?.name || 'Lich tuan',
    staffList: weekStaff,
    days,
    sessions,
    grid,
    taskList,
    roomNames,
    alertRows,
    cathRows,
    weekMerges: scheduleData.weekMerges || [],
    cellStyles: scheduleData.cellStyles || {},
    roomTable,
    freezeCols: scheduleData.freeze?.week?.cols,
    monthKey: activeMonth,
    monthGrid: scheduleData.monthGrid,
    monthRoles: visibleMonthRoles,
    columnOrder: scheduleData.monthColumnOrder,
    columnTitles: scheduleData.monthColumnTitles,
    daySessions: scheduleData.daySessions,
    monthMerges: scheduleData.monthMerges || []
  });

  const handleDownload = async (format) => {
    try {
      const payload = buildExportPayload();
      if (plan === 'week') {
        if (format === 'xlsx') {
          const { exportWeekScheduleToExcel } = await import('../services/scheduleExcelExport');
          await exportWeekScheduleToExcel(payload);
        } else if (format === 'pdf') {
          const { exportWeekScheduleToPdf } = await import('../services/schedulePdfExport');
          await exportWeekScheduleToPdf(payload);
        }
      } else if (plan === 'month') {
        if (format === 'xlsx') {
          const { exportMonthScheduleToExcel } = await import('../services/scheduleExcelExport');
          await exportMonthScheduleToExcel(payload);
        } else if (format === 'pdf') {
          const { exportMonthScheduleToPdf } = await import('../services/schedulePdfExport');
          await exportMonthScheduleToPdf(payload);
        }
      }
    } catch (error) {
      console.error('Download export failed:', error);
      window.alert('Không tải được file. Vui lòng thử lại.');
    }
  };

  const sheetPlans = [
    ['week', 'Lịch tuần'],
    ['month', 'Lịch tháng'],
    ['leave', 'Lịch nghỉ'],
    ['study', 'Lịch dạy học']
  ].filter(([id]) => canSee(actor, id));
  const activePlan = sheetPlans.some(([id]) => id === plan) ? plan : (sheetPlans[0]?.[0] || plan);
  const calMonth = activePlan === 'leave' ? activeLeaveMonth : activeStudyMonth;
  shownPlanRef.current = activePlan;
  const planLocked = !canEdit(actor, activePlan);
  const bookLocked = !canEdit(actor, 'week') && !canEdit(actor, 'month');

  const openPlan = (id) => {
    setPlan(id);
    if (id !== 'week') setWarm(prev => (prev[id] ? prev : { ...prev, [id]: true }));
  };

  return (
    <div className={`view-container ${painting ? 'is-painting' : ''}`}>
      <div className="view-header">
        <div className="view-header-row">
          <div className="view-header-title">
            <div className="plan-menu-bar" role="tablist" aria-label="Loại lịch">
              {sheetPlans.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  className={`plan-menu-item ${activePlan === id ? 'active' : ''}`}
                  aria-selected={activePlan === id}
                  onClick={() => openPlan(id)}
                >
                  {label}
                </button>
              ))}
              {activePlan !== 'week' && (
                <>
                  <span className="plan-menu-meta">
                    {formatMonthLabel(activePlan === 'month' ? activeMonth : calMonth)}
                  </span>
                  {activePlan === 'leave' && (
                    <LeaveLockHeaderControl
                      leaveLockAt={leaveLockAt}
                      canManage={canManageLeaveLock}
                      busy={leaveLockBusy}
                      onSave={onSaveLeaveLock}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          {activePlan === 'leave' && canEdit(actor, 'leave') && (
            <div className="leave-long-slot">
              <button type="button" className="action-btn" onClick={() => setLongNonce(value => value + 1)}>
                Nghỉ dài hạn
              </button>
            </div>
          )}
          {activePlan === 'study' && canEdit(actor, 'study') && (
            <div className="leave-long-slot">
              <button type="button" className="action-btn" onClick={() => setTeachNonce(value => value + 1)}>
                Dạy dài hạn
              </button>
            </div>
          )}

          {activePlan === 'week' ? (
            <div className="date-navigator plan-menu-bar" role="group" aria-label="Điều hướng tuần">
              <button type="button" className="plan-menu-item" onClick={() => onDateChange(-7)}>
                Tuần trước
              </button>
              <button type="button" className="plan-menu-item" onClick={onGoCurrentWeek}>
                Hiện tại
              </button>
              <button type="button" className="plan-menu-item" onClick={() => onDateChange(7)}>
                Tuần sau
              </button>
            </div>
          ) : activePlan === 'month' ? (
            <div className="date-navigator plan-menu-bar" role="group" aria-label="Điều hướng tháng">
              <button type="button" className="plan-menu-item" onClick={() => onMonthKeyChange(activeMonth, -1)}>
                Tháng trước
              </button>
              <button type="button" className="plan-menu-item" onClick={() => onMonthKeyChange(currentMonthKey(), 0)}>
                Hiện tại
              </button>
              <button type="button" className="plan-menu-item" onClick={() => onMonthKeyChange(activeMonth, 1)}>
                Tháng sau
              </button>
            </div>
          ) : (
            <div className="date-navigator plan-menu-bar" role="group" aria-label="Điều hướng tháng">
              <button
                type="button"
                className="plan-menu-item"
                onClick={() => {
                  const base = activePlan === 'leave' ? activeLeaveMonth : activeStudyMonth;
                  const change = activePlan === 'leave' ? onLeaveMonthKeyChange : onStudyMonthKeyChange;
                  change?.(base, -1);
                }}
              >
                Tháng trước
              </button>
              <button
                type="button"
                className="plan-menu-item"
                onClick={() => {
                  const change = activePlan === 'leave' ? onLeaveMonthKeyChange : onStudyMonthKeyChange;
                  change?.(currentMonthKey(), 0);
                }}
              >
                Hiện tại
              </button>
              <button
                type="button"
                className="plan-menu-item"
                onClick={() => {
                  const base = activePlan === 'leave' ? activeLeaveMonth : activeStudyMonth;
                  const change = activePlan === 'leave' ? onLeaveMonthKeyChange : onStudyMonthKeyChange;
                  change?.(base, 1);
                }}
              >
                Tháng sau
              </button>
            </div>
          )}
        </div>

        {(activePlan === 'week' || activePlan === 'month') && (
          <SheetToolbar
            bridge={bridge}
            patchRef={patchRef}
            formatCtl={formatCtl}
            painting={painting}
            setPainting={setPainting}
            zoom={zoom}
            onZoom={setZoom}
            onActiveStyle={setActiveStyle}
            daySessions={scheduleData.daySessions}
            onFreeze={(patch) => onFreeze?.(activePlan === 'month' ? 'month' : 'week', patch)}
            onAutoSchedule={activePlan === 'week' && canEdit(actor, 'week') ? onAutoSchedule : undefined}
            onPublishWeek={activePlan === 'week' && canManagePublish ? onPublishWeek : undefined}
            onUnpublishWeek={activePlan === 'week' && canManagePublish ? onUnpublishWeek : undefined}
            weekPublished={weekPublished}
            onDaySessions={canEdit(actor, activePlan) ? onDaySessions : undefined}
            onDownload={handleDownload}
            locked={planLocked}
            taskColorEdit={activePlan === 'month' ? monthTaskColorEdit : null}
            groupFilter={activePlan === 'month' ? {
              groups: monthFilterGroups,
              selected: monthGroupKeys,
              onToggle: toggleMonthGroup,
              onReset: () => setMonthGroupKeys(null)
            } : null}
          />
        )}
      </div>

      {activePlan === 'week' && weekMasked && (
        <div className="week-draft-banner" role="status">
          Tuần này chưa công bố. Bạn sẽ thấy lịch sau khi Mod/Admin bấm Public.
        </div>
      )}
      {activePlan === 'week' && !weekMasked && canManagePublish && !weekPublished && (
        <div className="week-draft-banner week-draft-banner--mod" role="status">
          Bản nháp — User trong khoa chưa thấy tuần này. Bấm Public khi đã chốt.
        </div>
      )}

      {activePlan === 'leave' && leaveLockBanner && (
        <div
          className={`week-draft-banner${leaveLockBanner.leaveLockedForMember ? ' week-draft-banner--mod' : ''}`}
          role="status"
        >
          {leaveLockBanner.leaveLockedForMember
            ? `Đã khóa lịch nghỉ (hạn ${leaveLockBanner.leaveLabel}). Liên hệ Mod để chỉnh giúp.`
            : `Hạn khóa lịch nghỉ: ${leaveLockBanner.leaveLabel}. Tháng: ${leaveLockBanner.monthLabel}.`}
        </div>
      )}

      {activePlan === 'month' && monthRolesFilteredEmpty && (
        <div className="week-draft-banner week-draft-banner--mod" role="status">
          Đã lọc hết nhóm nhiệm vụ — trên toolbar bật lại tất cả nhóm (hoặc bỏ lọc).
        </div>
      )}
      {activePlan === 'month' && !monthRolesFilteredEmpty && monthRolesMissingRows && (
        <div className="week-draft-banner week-draft-banner--mod" role="status">
          Thiếu danh sách nhiệm vụ lịch tháng nhưng vẫn còn ô dữ liệu — app đã khôi phục dòng NV từ lưới. Đồng bộ/lưu để giữ.
        </div>
      )}
      {activePlan === 'month' && scheduleData.monthRolesRecovered && !monthRolesMissingRows && (
        <div className="week-draft-banner" role="status">
          Đã khôi phục dòng nhiệm vụ lịch tháng từ dữ liệu ô — đồng bộ để lưu lên Sheet.
        </div>
      )}
      <div className={`plan-scroll${activePlan === 'leave' || activePlan === 'study' ? ' is-open' : ''}`}>
      {(warm.leave || activePlan === 'leave') && (
        <DayCalendar
          mode="leave"
          hidden={activePlan !== 'leave'}
          monthKey={activeLeaveMonth}
          entries={leaveEntries}
          staffList={staffList}
          onSave={
            planLocked || activePlan !== 'leave' || leaveReadOnly ? undefined : onSaveLeave
          }
          onDelete={
            planLocked || activePlan !== 'leave' || leaveReadOnly ? undefined : onDeleteLeave
          }
          longNonce={activePlan === 'leave' && !planLocked && !leaveReadOnly ? longNonce : 0}
          readOnly={planLocked || activePlan !== 'leave' || leaveReadOnly}
        />
      )}
      {(warm.study || activePlan === 'study') && (
        <DayCalendar
          mode="study"
          hidden={activePlan !== 'study'}
          monthKey={activeStudyMonth}
          entries={studyEntries}
          staffList={staffList}
          taskList={taskList}
          onSave={planLocked || activePlan !== 'study' ? undefined : onSaveStudy}
          onDelete={planLocked || activePlan !== 'study' ? undefined : onDeleteStudy}
          longNonce={activePlan === 'study' && !planLocked ? teachNonce : 0}
          readOnly={planLocked || activePlan !== 'study'}
        />
      )}
      </div>
      <div className={`sheet-scroll${activePlan === 'week' || activePlan === 'month' ? ' is-open' : ''}`}>
      <div className="sheet-workbook" hidden={activePlan !== 'week' && activePlan !== 'month'}>
        <div className="sheet-zoom">
          <div ref={containerRef} className={`sheet-grid-host week-sheet${activePlan === 'week' ? '' : ' is-parked'}`} />
          {(warm.month || activePlan === 'month') && (
            <MonthSheet
              visible={activePlan === 'month'}
              monthKey={activeMonth}
              monthGrid={scheduleData.monthGrid}
              roles={visibleMonthRoles}
              columnOrder={scheduleData.monthColumnOrder}
              columnTitles={scheduleData.monthColumnTitles}
              daySessions={scheduleData.daySessions}
              monthMerges={scheduleData.monthMerges}
              cellStyles={scheduleData.cellStyles}
              bridge={bridge}
              formatCtl={formatCtl}
              uiRef={uiRef}
              onUpdateCell={activePlan === 'month' && !planLocked ? onUpdateMonthCell : undefined}
              onRequestAdd={activePlan === 'month' && !planLocked ? () => setAddOpen(true) : undefined}
              readOnly={activePlan !== 'month' || planLocked}
              onDeleteRole={onDeleteMonthRole}
              onReorderRole={onReorderMonthRole}
              onInsertRole={onInsertMonthRole}
              onRenameRole={onRenameMonthRole}
              onInsertColumn={onInsertMonthColumn}
              onRemoveColumn={onRemoveMonthColumn}
              onRenameColumn={onRenameMonthColumn}
              onUpdateCustomCell={onUpdateMonthCustomCell}
              onMerges={onMonthMerges}
              taskList={taskList}
              freezeRows={Number(scheduleData.freeze?.month?.rows) || 0}
              freezeCols={scheduleData.freeze?.month?.cols}
              zoom={zoom}
            />
          )}
        </div>
        <SheetTabs
          sheets={sheets.map(sheet => ({
            ...sheet,
            label: `Tuần từ: ${buildWeekDays(sheet.startDate)[0]?.dateStr} đến ${buildWeekDays(sheet.startDate)[6]?.dateStr}`
          }))}
          activeSheetId={activeSheetId}
          onSelect={onSelectSheet}
          onAdd={onAddSheet}
          onRename={onRenameSheet}
          onDuplicate={onDuplicateSheet}
          onDelete={onDeleteSheet}
          onMove={onMoveSheet}
          onSetColor={onColorSheet}
          locked={bookLocked}
        />
      </div>

      <div className="room-assignments-container" hidden={activePlan !== 'week' || weekMasked}>
        <div className="room-title">Phân công bệnh phòng</div>
        <RoomSheet
          active={activePlan === 'week' && !weekMasked}
          table={roomTable}
          grid={grid}
          staffList={staffList}
          doctorSource={weekStaff}
          hiddenDoctors={hiddenRoomDoctors}
          taskList={taskList}
          cellStyles={scheduleData.cellStyles}
          bridge={bridge}
          formatCtl={formatCtl}
          uiRef={uiRef}
          onChange={!canEdit(actor, 'week') || weekMasked ? undefined : onUpdateRooms}
          readOnly={!canEdit(actor, 'week') || weekMasked}
        />
      </div>
      </div>

      {addOpen && activePlan === 'month' && (
        <MonthRolePickerModal
          monthRoles={scheduleData.monthRoles || []}
          taskList={taskList}
          onClose={() => setAddOpen(false)}
          onPick={onAddMonthRole}
        />
      )}
      {cathAddOpen && (activePlan === 'week' || warm.week) && (
        <MonthRolePickerModal
          title="Thêm dòng task lưới tuần"
          hint="Chọn dòng lịch tháng hoặc task khoa. Lưới tuần đổ dữ liệu từ lịch tháng theo kí hiệu task — không tạo task mới."
          monthRoles={cathTakenRoles}
          sheetRoles={monthRolesForCathPick}
          taskList={taskList}
          onClose={() => setCathAddOpen(false)}
          onPick={onAddCathRole}
        />
      )}
    </div>
  );
}
