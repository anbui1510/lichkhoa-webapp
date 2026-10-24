import React, { useEffect, useRef, useState } from 'react';
import { SheetTabs } from './SheetTabs';
import { MonthSheet } from './MonthSheet';
import { SheetToolbar } from './SheetToolbar';
import { DayCalendar } from './DayCalendar';
import { TaskEditorModal } from './TaskEditorModal';
import { RoomSheet, roomTableOf } from './RoomSheet';
import { rectSelectionHooks } from '../logic/rectSelection';
import { combineMerges, mergeMenuItems, userMerges } from '../logic/merges';
import { activeEntry, expandSharedTaskStyles, paintCell, pushFormatUndo, selectedEntries } from '../logic/cellFormat';
import { currentMonthKey, formatMonthLabel, normalizeDaySessions, sessionLabel, shiftMonthKey } from '../logic/monthSchedule';
import { attachPaletteDrop } from '../logic/paletteDrop';
import { attachCellDragSwap } from '../logic/cellDragSwap';
import { revealSheet, watchSheetViewport } from '../logic/sheetViewport';
import { buildSessionAlertRow, lockConflictMessages } from '../logic/warningResolve';
import { buildWeekDays, missingFixedTaskMessages } from '../logic/schedulerEngine';
import { leadingTask, orderCellText } from '../logic/cellOrder';
import { canEdit, canSee, firstSheetPlan } from '../logic/access';
import { traineeCovers, traineeOnWeek } from '../logic/traineePeriod';
import { alertMuted } from '../logic/taskAlert';

const FIXED_COLS = 3;

function findTaskColor(taskList, raw, roomNames) {
  const task = leadingTask(raw, taskList, roomNames);
  return task ? { bg: task.bgColor, text: task.textColor } : null;
}

const NAME_COL_WIDTH = 78;
const BALANCE_COL_WIDTH = 72;
const SESSION_COL_WIDTH = 112;
const NOTE_COL_WIDTH = 220;

function defaultWeekColWidth(index, noteCol) {
  if (index === 0) return NAME_COL_WIDTH;
  if (index < FIXED_COLS) return BALANCE_COL_WIDTH;
  if (index === noteCol) return NOTE_COL_WIDTH;
  return SESSION_COL_WIDTH;
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
  const heights = (table || []).map((line, rowIndex) => {
    const warning = rowIndex === alertRow;
    probe.style.lineHeight = warning ? '1.35' : '1.25';
    probe.style.padding = '4px 5px';
    probe.style.fontWeight = warning ? '600' : '700';
    let max = warning ? 28 : 30;
    (line || []).forEach((text, col) => {
      const value = String(text || '');
      if (!value.trim() || (!warning && col < FIXED_COLS)) return;
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

function alignFrozenPanes(hot) {
  const root = hot?.rootElement;
  if (!root) return;
  const master = root.querySelector('.ht_master .htCore');
  const left = root.querySelector('.ht_clone_left .htCore');
  const corner = root.querySelector('.ht_clone_top_left_corner .htCore');
  const leftPane = root.querySelector('.ht_clone_left');
  const paneWidth = leftPane ? leftPane.getBoundingClientRect().width : 0;
  root.style.setProperty('--freeze-pane', `${Math.round(paneWidth)}px`);
  if (!master || !left) return;
  const apply = (sourceRows, targetRows) => {
    sourceRows.forEach((row, index) => {
      const target = targetRows[index];
      if (!target) return;
      const height = row.getBoundingClientRect().height;
      if (height <= 0) return;
      target.style.height = `${height}px`;
    });
  };
  apply([...master.querySelectorAll('thead tr')], [...(corner?.querySelectorAll('thead tr') || [])]);
  apply([...master.querySelectorAll('tbody tr')], [...left.querySelectorAll('tbody tr')]);
}

export function SheetView({
  dept,
  staffList,
  taskList,
  scheduleData,
  onUpdateCell,
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
  onMonthKeyChange,
  onUpdateMonthCell,
  onPatchStyles,
  onAddMonthRole,
  onInsertMonthRole,
  onRenameMonthRole,
  onDeleteMonthRole,
  onInsertMonthColumn,
  onRemoveMonthColumn,
  onRenameMonthColumn,
  onUpdateMonthCustomCell,
  onMonthMerges,
  categories,
  onAddTask,
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
  actor
}) {
  const containerRef = useRef(null);
  const hotInstanceRef = useRef(null);
  const stylesRef = useRef(scheduleData.cellStyles || {});
  const taskListRef = useRef(taskList);
  const onUpdateRef = useRef(onUpdateCell);
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
  const [warm, setWarm] = useState({ month: false, leave: false, study: false });
  const [calMonth, setCalMonth] = useState(currentMonthKey);
  const [longNonce, setLongNonce] = useState(0);
  const [zoom, setZoom] = useState(100);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const readOnlyRef = useRef(false);
  readOnlyRef.current = !canEdit(actor, 'week');
  const shownPlanRef = useRef('week');
  const [painting, setPainting] = useState(false);
  const [activeStyle, setActiveStyle] = useState(null);
  const [scrolledMonth, setScrolledMonth] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  const { days, grid, roomWarnings, warnings } = scheduleData;
  const roomTable = roomTableOf(scheduleData, staffList);
  const activeMonth = monthKey || currentMonthKey();
  const shownMonth = plan === 'month' ? (scrolledMonth || activeMonth) : activeMonth;

  stylesRef.current = scheduleData.cellStyles || {};
  taskListRef.current = taskList;
  onUpdateRef.current = onUpdateCell;
  onNoteRef.current = onUpdateNote;
  onBalanceRef.current = onUpdateBalance;
  patchRef.current = onPatchStyles;
  weekMergesRef.current = scheduleData.weekMerges || [];
  onWeekMergesRef.current = onWeekMerges;
  bridge.current.styles = scheduleData.cellStyles || {};
  uiRef.current.styles = scheduleData.cellStyles || {};
  uiRef.current.onActiveStyle = (style) => setActiveStyle(style);
  uiRef.current.onVisibleMonth = (key) => setScrolledMonth(prev => (prev === key ? prev : key));
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

  const sessions = normalizeDaySessions(scheduleData.daySessions);
  const weekStaff = staffList.filter(person => traineeOnWeek(person, days));
  const alertRows = [
    ...(warnings || []),
    ...(roomWarnings || []),
    ...lockConflictMessages({ grid, staffList: weekStaff, days, sessions, taskList }),
    ...missingFixedTaskMessages({ grid, staffList: weekStaff, days, sessions, taskList })
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
  const noteCol = FIXED_COLS + 7 * sessions.length;
  const weekWidth = noteCol + 1;
  const freezeRows = Math.max(0, Number(scheduleData.freeze?.week?.rows) || 0);
  const freezeCols = Math.max(0, Number(scheduleData.freeze?.week?.cols) || 0);
  const alertLine = alertRows.length
    ? buildSessionAlertRow(alertRows, {
      days, sessions, weekWidth, noteCol, leaveEntries, studyEntries, grid, staffList, taskList
    })
    : null;
  const weekData = alertLine ? [...rowData, alertLine] : [...rowData];

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

  const dataKey = JSON.stringify(rowData);
  const headerKey = `${sessions.join('')}|${days.map(d => d.dateStr).join(',')}`;

  describeRef.current = (row, col) => {
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
    const colWidths = Array.from({ length: colCount }, (_, index) => (
      useSavedCols && savedCols[index] > 0 ? savedCols[index] : defaultWeekColWidth(index, noteCol)
    ));
    const alertRow = alertLine ? staffList.length : -1;
    const wrappedHeights = measureWeekHeights(weekData, colWidths, { alertRow, noteCol });
    const hot = new window.Handsontable(containerRef.current, {
      data: weekData,
      nestedHeaders: [topHeaders, subHeaders],
      rowHeaders(index) {
        return index >= staffList.length ? '' : index + 1;
      },
      height: Math.min(720, 86 + staffList.length * 32 + (alertLine ? 88 : 0)),
      width: '100%',
      licenseKey: 'non-commercial-and-evaluation',
      stretchH: 'none',
      fixedRowsTop: freezeRows,
      fixedColumnsStart: freezeCols,
      wordWrap: true,
      autoRowSize: !alertLine && !useSavedRows,
      autoColumnSize: false,
      colWidths(index) {
        if (useSavedCols && savedCols[index] > 0) return savedCols[index];
        return defaultWeekColWidth(index, noteCol);
      },
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
        const desc = describeRef.current(row, col);
        const isAlert = row >= staffList.length;
        const isNote = col === noteCol;
        const isBalance = col === 1 || col === 2;
        if (readOnlyRef.current || isAlert || (col < FIXED_COLS && !isBalance && !isNote)) cellProperties.readOnly = true;
        const wrapMode = desc?.style?.wrap;
        const naturalWrap = !isAlert && (isNote || col >= FIXED_COLS) && wrapMode !== 'clip' && wrapMode !== 'overflow';
        cellProperties.wordWrap = isAlert || naturalWrap || wrapMode === 'wrap';
        if (naturalWrap) cellProperties.className = 'week-task';
        cellProperties.renderer = function weekRenderer(instance, td) {
          window.Handsontable.renderers.TextRenderer.apply(this, arguments);
          td.style.removeProperty('background-color');
          td.style.removeProperty('color');
          td.style.fontWeight = '';
          td.classList.remove('week-warning', 'week-task');
          if (row >= staffList.length) {
            const text = String(instance.getDataAtCell(row, col) || '').trim();
            if (text) td.classList.add('week-warning');
            return;
          }
          if (naturalWrap) td.classList.add('week-task');
          if (col >= FIXED_COLS && col < noteCol) {
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
        if (col >= 0 && (col < FIXED_COLS || col === noteCol) && headerLevel === 0) {
          TH.classList.add('ht-span-label');
          const label = TH.textContent;
          TH.replaceChildren();
          const span = document.createElement('span');
          span.className = 'col-title';
          span.textContent = label;
          TH.appendChild(span);
        }
        if (col >= 0 && (col < FIXED_COLS || col === noteCol) && headerLevel === 1) {
          TH.classList.add('ht-span-gap');
          TH.textContent = '';
        }
        if (headerLevel === 0 && col >= FIXED_COLS && col < noteCol && (col - FIXED_COLS) % sessions.length === 0) {
          const day = days[Math.floor((col - FIXED_COLS) / sessions.length)];
          if (!day) return;
          TH.innerHTML = `<div class="day-head">${day.dayName} (${day.dateStr})</div>`;
        }
      },
      afterChange(changes, source) {
        if (readOnlyRef.current || source === 'loadData' || !changes) return;
        changes.forEach(([row, col, oldVal, newVal]) => {
          if (row >= weekStaff.length) return;
          if (col === noteCol && oldVal !== newVal) {
            onNoteRef.current?.(rowData[row][0], newVal ?? '');
            return;
          }
          if ((col === 1 || col === 2) && oldVal !== newVal) {
            const saved = onBalanceRef.current?.(rowData[row][0], col === 1 ? 'bu' : 'phep', newVal);
            if (saved === false) this.setDataAtCell(row, col, oldVal ?? '', 'loadData');
          }
          if (col >= FIXED_COLS && col < noteCol && oldVal !== newVal) {
            const shortName = rowData[row][0];
            const dayIdx = Math.floor((col - FIXED_COLS) / sessions.length);
            const session = sessions[(col - FIXED_COLS) % sessions.length];
            onUpdateRef.current?.(shortName, dayIdx, session, newVal ?? '');
          }
        });
      },
      afterColumnResize() {
        const widths = [];
        for (let index = 0; index < this.countCols(); index += 1) widths.push(this.getColWidth(index));
        weekSizeRef.current.cols = widths;
        const heights = measureWeekHeights(weekData, widths, { alertRow, noteCol });
        const plugin = this.getPlugin('manualRowResize');
        if (!plugin?.setManualSize) return;
        let changed = false;
        heights.forEach((height, index) => {
          const kept = Math.max(height, weekSizeRef.current.rows?.[index] || 0);
          if (this.getRowHeight(index) === kept) return;
          plugin.setManualSize(index, kept);
          changed = true;
        });
        if (changed) this.render();
      },
      afterRowResize() {
        const heights = [];
        for (let index = 0; index < this.countRows(); index += 1) heights.push(this.getRowHeight(index));
        weekSizeRef.current.rows = heights;
      },
      afterViewRender() {
        alignFrozenPanes(this);
      },
      afterSelectionEnd() {
        bridge.current.hot = this;
        bridge.current.describe = (row, col) => describeRef.current(row, col);
        bridge.current.getSelectedEntries = () => selectedEntries(this, describeRef.current);
        bridge.current.getActiveEntry = () => activeEntry(this, describeRef.current);
        const entry = activeEntry(this, describeRef.current);
        uiRef.current.onActiveStyle?.(entry?.style || null);
        const ctl = formatCtl.current;
        if (!ctl?.armed) return;
        const entries = selectedEntries(this, describeRef.current);
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
    const stopFit = watchSheetViewport(hot, () => zoomRef.current / 100);
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
      if (bridge.current.hot === hot) {
        bridge.current.hot = null;
        bridge.current.describe = () => null;
        bridge.current.getSelectedEntries = () => [];
        bridge.current.getActiveEntry = () => null;
      }
      hot.destroy();
      hotInstanceRef.current = null;
    };
    // Grid is rebuilt when the week data or column headers change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey, headerKey, currentStartDate, alertRows.join('|'), freezeRows, freezeCols]);

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
    if (plan !== 'week') return undefined;
    const hot = hotInstanceRef.current;
    if (!hot) return undefined;
    bridge.current.hot = hot;
    bridge.current.describe = (row, col) => describeRef.current(row, col);
    bridge.current.getSelectedEntries = () => selectedEntries(hot, describeRef.current);
    bridge.current.getActiveEntry = () => activeEntry(hot, describeRef.current);
    const id = requestAnimationFrame(() => {
      revealSheet(hot, zoomRef.current / 100);
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
    weekMerges: scheduleData.weekMerges || [],
    cellStyles: scheduleData.cellStyles || {},
    roomTable,
    freezeCols: scheduleData.freeze?.week?.cols,
    monthKey: activeMonth,
    monthGrid: scheduleData.monthGrid,
    monthRoles: scheduleData.monthRoles,
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
    ['study', 'Lịch học']
  ].filter(([id]) => canSee(actor, id));
  const activePlan = sheetPlans.some(([id]) => id === plan) ? plan : (sheetPlans[0]?.[0] || plan);
  shownPlanRef.current = activePlan;
  const planLocked = !canEdit(actor, activePlan);
  const bookLocked = !canEdit(actor, 'week') && !canEdit(actor, 'month');

  const openPlan = (id) => {
    setPlan(id);
    if (id !== 'week') setWarm(prev => (prev[id] ? prev : { ...prev, [id]: true }));
  };

  useEffect(() => {
    const warmAll = () => setWarm({ month: true, leave: true, study: true });
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(warmAll, { timeout: 400 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(warmAll, 160);
    return () => window.clearTimeout(id);
  }, []);

  const saveMonthTask = (payload, linkedTask) => {
    if (linkedTask) {
      onAddMonthRole(linkedTask);
    } else {
      const task = { id: `task_${Date.now()}`, ...payload };
      onAddTask(task);
      onAddMonthRole(task);
    }
    setAddOpen(false);
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
                <span className="plan-menu-meta">
                  {formatMonthLabel(activePlan === 'month' ? shownMonth : calMonth)}
                </span>
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
              <button type="button" className="plan-menu-item" onClick={() => setCalMonth(key => shiftMonthKey(key, -1))}>
                Tháng trước
              </button>
              <button type="button" className="plan-menu-item" onClick={() => setCalMonth(currentMonthKey())}>
                Hiện tại
              </button>
              <button type="button" className="plan-menu-item" onClick={() => setCalMonth(key => shiftMonthKey(key, 1))}>
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
            onDaySessions={canEdit(actor, activePlan) ? onDaySessions : undefined}
            onDownload={handleDownload}
            locked={planLocked}
          />
        )}
      </div>

      {(warm.leave || activePlan === 'leave') && (
        <DayCalendar
          mode="leave"
          hidden={activePlan !== 'leave'}
          monthKey={calMonth}
          entries={leaveEntries}
          staffList={staffList}
          onSave={planLocked || activePlan !== 'leave' ? undefined : onSaveLeave}
          onDelete={planLocked || activePlan !== 'leave' ? undefined : onDeleteLeave}
          longNonce={activePlan === 'leave' && !planLocked ? longNonce : 0}
          readOnly={planLocked || activePlan !== 'leave'}
        />
      )}
      {(warm.study || activePlan === 'study') && (
        <DayCalendar
          mode="study"
          hidden={activePlan !== 'study'}
          monthKey={calMonth}
          entries={studyEntries}
          staffList={staffList}
          onSave={planLocked || activePlan !== 'study' ? undefined : onSaveStudy}
          onDelete={planLocked || activePlan !== 'study' ? undefined : onDeleteStudy}
          readOnly={planLocked || activePlan !== 'study'}
        />
      )}
      <div className="sheet-workbook" hidden={activePlan !== 'week' && activePlan !== 'month'}>
        <div className="sheet-zoom">
          <div ref={containerRef} className={`sheet-grid-host${activePlan === 'week' ? '' : ' is-parked'}`} />
          {(warm.month || activePlan === 'month') && (
            <MonthSheet
              visible={activePlan === 'month'}
              monthKey={activeMonth}
              monthGrid={scheduleData.monthGrid}
              roles={scheduleData.monthRoles}
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

      <div className="room-assignments-container" hidden={activePlan !== 'week'}>
        <div className="room-title">Phân công bệnh phòng</div>
        <RoomSheet
          active={activePlan === 'week'}
          table={roomTable}
          grid={grid}
          staffList={staffList}
          taskList={taskList}
          cellStyles={scheduleData.cellStyles}
          bridge={bridge}
          formatCtl={formatCtl}
          uiRef={uiRef}
          onChange={readOnlyRef.current ? undefined : onUpdateRooms}
          readOnly={!canEdit(actor, 'week')}
        />
      </div>

      {addOpen && (
        <TaskEditorModal
          title="Thêm Nghiệp Vụ / Task Mới"
          hint="Task mới được thêm vào cuối mọi khối tuần và vào danh mục task của khoa. Gõ để chọn task đã có (ký hiệu và tên)."
          submitLabel="Lưu Task"
          taskList={taskList}
          categories={categories}
          staffList={staffList}
          onClose={() => setAddOpen(false)}
          onSave={saveMonthTask}
          onAddCategory={onAddCategory}
          onDeleteCategory={onDeleteCategory}
        />
      )}
    </div>
  );
}
