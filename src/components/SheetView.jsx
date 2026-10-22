import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
import { buildWeekDays, defaultWeekSheetName } from '../logic/schedulerEngine';
import { leadingTask, orderCellText } from '../logic/cellOrder';

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
  onUpdateNote
}) {
  const containerRef = useRef(null);
  const hotInstanceRef = useRef(null);
  const stylesRef = useRef(scheduleData.cellStyles || {});
  const taskListRef = useRef(taskList);
  const onUpdateRef = useRef(onUpdateCell);
  const onNoteRef = useRef(onUpdateNote);
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
  const [calMonth, setCalMonth] = useState(currentMonthKey);
  const [longNonce, setLongNonce] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [painting, setPainting] = useState(false);
  const [activeStyle, setActiveStyle] = useState(null);
  const [scrolledMonth, setScrolledMonth] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  const { days, grid, roomWarnings, warnings } = scheduleData;
  const alertRows = [...(warnings || []), ...(roomWarnings || [])];
  const roomTable = roomTableOf(scheduleData);
  const activeMonth = monthKey || currentMonthKey();
  const shownMonth = plan === 'month' ? (scrolledMonth || activeMonth) : activeMonth;

  stylesRef.current = scheduleData.cellStyles || {};
  taskListRef.current = taskList;
  onUpdateRef.current = onUpdateCell;
  onNoteRef.current = onUpdateNote;
  patchRef.current = onPatchStyles;
  weekMergesRef.current = scheduleData.weekMerges || [];
  onWeekMergesRef.current = onWeekMerges;
  bridge.current.styles = scheduleData.cellStyles || {};
  uiRef.current.styles = scheduleData.cellStyles || {};
  uiRef.current.onActiveStyle = (style) => setActiveStyle(style);
  uiRef.current.onVisibleMonth = (key) => setScrolledMonth(prev => (prev === key ? prev : key));
  uiRef.current.onPaint = (entries, style) => {
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
  const roomLabelIndex = (roomTable.labels || []).findIndex(label => String(label || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .includes('phong'));
  const roomNames = (roomTable.matrix?.[roomLabelIndex >= 0 ? roomLabelIndex : 1] || [])
    .map(item => String(item || '').trim())
    .filter(Boolean);
  roomNamesRef.current = roomNames;
  const rowData = staffList.map(s => {
    const sData = grid[s.shortName] || {};
    const row = [s.shortName, s.buBalance, s.phepBalance];
    for (let d = 0; d < 7; d += 1) {
      sessions.forEach(id => row.push(orderCellText(sData[d]?.[id] || '', taskList, roomNames)));
    }
    row.push(sData.note || '');
    return row;
  });
  const noteCol = FIXED_COLS + 7 * sessions.length;
  const weekWidth = noteCol + 1;
  const freezeRows = Math.max(0, Number(scheduleData.freeze?.week?.rows) || 0);
  const freezeCols = Math.max(0, Number(scheduleData.freeze?.week?.cols) || 0);
  const alertCol = Math.min(freezeCols, Math.max(0, weekWidth - 1));
  const weekData = [
    ...rowData,
    ...alertRows.map((text) => {
      const row = new Array(weekWidth).fill('');
      row[alertCol] = text;
      return row;
    })
  ];

  const topHeaders = [
    'BÁC SĨ',
    'BÙ',
    'PHÉP',
    ...days.map(d => ({
      label: d.holidayName ? `${d.dayName} (${d.dateStr}) · ${d.holidayName}` : `${d.dayName} (${d.dateStr})`,
      colspan: sessions.length
    })),
    'Ghi chú'
  ];
  const subHeaders = ['', '', '', ...days.flatMap(() => sessions.map(sessionLabel)), ''];

  const dataKey = JSON.stringify(rowData);
  const headerKey = `${sessions.join('')}|${days.map(d => `${d.dateStr}|${d.holidayName || ''}`).join(',')}`;

  describeRef.current = (row, col) => {
    const staff = staffList[row];
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
    if (plan !== 'week') return undefined;
    if (!containerRef.current || !window.Handsontable) return undefined;

    if (hotInstanceRef.current) {
      hotInstanceRef.current.destroy();
      hotInstanceRef.current = null;
    }

    const alertMerges = alertRows.map((_, index) => ({
      row: staffList.length + index,
      col: alertCol,
      rowspan: 1,
      colspan: Math.max(1, (weekData[0]?.length || 1) - alertCol)
    }));
    alertMergeRef.current = alertMerges;

    const colCount = weekData[0]?.length || 0;
    const savedCols = weekSizeRef.current.cols;
    const useSavedCols = savedCols && savedCols.length === colCount;
    const savedRows = weekSizeRef.current.rows;
    const useSavedRows = savedRows && savedRows.length === weekData.length;
    const hot = new window.Handsontable(containerRef.current, {
      data: weekData,
      nestedHeaders: [topHeaders, subHeaders],
      rowHeaders: true,
      height: Math.min(640, 86 + staffList.length * 32 + alertRows.length * 24),
      width: '100%',
      licenseKey: 'non-commercial-and-evaluation',
      stretchH: 'none',
      fixedRowsTop: freezeRows,
      fixedColumnsStart: freezeCols,
      wordWrap: true,
      autoRowSize: !useSavedRows,
      autoColumnSize: false,
      colWidths(index) {
        if (useSavedCols && savedCols[index] > 0) return savedCols[index];
        return defaultWeekColWidth(index, noteCol);
      },
      ...(useSavedRows ? { rowHeights: savedRows } : {}),
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
      mergeCells: combineMerges(alertMerges, weekMergesRef.current),
      ...rectSelectionHooks(),
      cells(row, col) {
        const cellProperties = {};
        const desc = describeRef.current(row, col);
        const isAlert = row >= staffList.length;
        const isNote = col === noteCol;
        if (isAlert || (!isNote && col < FIXED_COLS)) cellProperties.readOnly = true;
        const wrapMode = desc?.style?.wrap;
        const naturalWrap = !isAlert && (isNote || col >= FIXED_COLS) && wrapMode !== 'clip' && wrapMode !== 'overflow';
        cellProperties.wordWrap = naturalWrap || wrapMode === 'wrap';
        if (naturalWrap) cellProperties.className = 'week-task';
        cellProperties.renderer = function weekRenderer(instance, td) {
          window.Handsontable.renderers.TextRenderer.apply(this, arguments);
          td.style.removeProperty('background-color');
          td.style.removeProperty('color');
          td.style.fontWeight = '';
          td.classList.remove('week-warning', 'week-task');
          if (row >= staffList.length) {
            td.classList.add('week-warning');
            if (col < alertCol) {
              td.textContent = '';
              return;
            }
            if (col === alertCol) {
              const text = td.textContent;
              td.textContent = '';
              const label = document.createElement('div');
              label.className = 'week-warning-text';
              label.textContent = text;
              td.appendChild(label);
            }
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
          const holiday = day.holidayName
            ? `<div class="day-holiday">${day.holidayName}</div>`
            : '';
          TH.innerHTML = `<div class="day-head">${day.dayName} (${day.dateStr})${holiday}</div>`;
          if (day.isHoliday) TH.classList.add('ht-holiday');
        }
      },
      afterChange(changes, source) {
        if (source === 'loadData' || !changes) return;
        changes.forEach(([row, col, oldVal, newVal]) => {
          if (row >= staffList.length) return;
          if (col === noteCol && oldVal !== newVal) {
            onNoteRef.current?.(rowData[row][0], newVal ?? '');
            return;
          }
          if (col >= FIXED_COLS && col < noteCol && oldVal !== newVal) {
            const shortName = rowData[row][0];
            const dayIdx = Math.floor((col - FIXED_COLS) / sessions.length);
            const session = sessions[(col - FIXED_COLS) % sessions.length];
            onUpdateRef.current(shortName, dayIdx, session, newVal ?? '');
          }
        });
      },
      afterColumnResize() {
        const widths = [];
        for (let index = 0; index < this.countCols(); index += 1) widths.push(this.getColWidth(index));
        weekSizeRef.current.cols = widths;
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
    bridge.current.hot = hot;
    bridge.current.describe = (row, col) => describeRef.current(row, col);
    bridge.current.getSelectedEntries = () => selectedEntries(hot, describeRef.current);
    bridge.current.getActiveEntry = () => activeEntry(hot, describeRef.current);

    const detachDrop = attachPaletteDrop(hot);
    return () => {
      detachDrop();
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
  }, [plan, dataKey, headerKey, currentStartDate, alertRows.join('|'), freezeRows, freezeCols]);

  useEffect(() => {
    if (plan !== 'week') return;
    stylesRef.current = scheduleData.cellStyles || {};
    hotInstanceRef.current?.render();
  }, [plan, scheduleData.cellStyles, taskList]);

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
        <div className="view-header-title">
          <div className="plan-tabs" role="tablist">
            {[
              ['week', 'Lịch tuần'],
              ['month', 'Lịch tháng'],
              ['leave', 'Lịch nghỉ'],
              ['study', 'Lịch học']
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                className={`plan-tab ${plan === id ? 'active' : ''}`}
                onClick={() => setPlan(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {plan !== 'week' && (
            <div className="sub-header-info">
              <span><strong>{formatMonthLabel(plan === 'month' ? shownMonth : calMonth)}</strong></span>
            </div>
          )}
        </div>

        {plan === 'leave' && (
          <div className="leave-long-slot">
            <button type="button" className="action-btn" onClick={() => setLongNonce(value => value + 1)}>
              Nghỉ dài hạn
            </button>
          </div>
        )}

        {(plan === 'week' || plan === 'month') && (
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
            onDaySessions={onDaySessions}
            onFreeze={(patch) => onFreeze?.(plan === 'month' ? 'month' : 'week', patch)}
          />
        )}

        {plan === 'week' ? (
          <div className="date-navigator">
            <button type="button" className="action-btn" onClick={() => onDateChange(-7)}>
              <ChevronLeft size={16} /> Tuần trước
            </button>
            <button type="button" className="action-btn current" onClick={onGoCurrentWeek}>
              Hiện tại
            </button>
            <button type="button" className="action-btn" onClick={() => onDateChange(7)}>
              Tuần sau <ChevronRight size={16} />
            </button>
          </div>
        ) : plan === 'month' ? (
          <div className="date-navigator">
            <button type="button" className="action-btn" onClick={() => onMonthKeyChange(activeMonth, -1)}>
              <ChevronLeft size={16} /> Tháng trước
            </button>
            <button type="button" className="action-btn current" onClick={() => onMonthKeyChange(currentMonthKey(), 0)}>
              Hiện tại
            </button>
            <button type="button" className="action-btn" onClick={() => onMonthKeyChange(activeMonth, 1)}>
              Tháng sau <ChevronRight size={16} />
            </button>
          </div>
        ) : (
          <div className="date-navigator">
            <button type="button" className="action-btn" onClick={() => setCalMonth(key => shiftMonthKey(key, -1))}>
              <ChevronLeft size={16} /> Tháng trước
            </button>
            <button type="button" className="action-btn current" onClick={() => setCalMonth(currentMonthKey())}>
              Hiện tại
            </button>
            <button type="button" className="action-btn" onClick={() => setCalMonth(key => shiftMonthKey(key, 1))}>
              Tháng sau <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {plan === 'leave' || plan === 'study' ? (
        <DayCalendar
          mode={plan}
          monthKey={calMonth}
          entries={plan === 'leave' ? leaveEntries : studyEntries}
          staffList={staffList}
          onSave={plan === 'leave' ? onSaveLeave : onSaveStudy}
          onDelete={plan === 'leave' ? onDeleteLeave : onDeleteStudy}
          longNonce={plan === 'leave' ? longNonce : 0}
        />
      ) : (
      <div className="sheet-workbook">
        <div className="sheet-zoom" style={{ zoom: zoom / 100 }}>
          {plan === 'week' ? (
            <div ref={containerRef} className="sheet-grid-host" />
          ) : (
            <MonthSheet
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
              onUpdateCell={onUpdateMonthCell}
              onRequestAdd={() => setAddOpen(true)}
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
            />
          )}
        </div>
        <SheetTabs
          sheets={sheets.map((sheet) => ({
            ...sheet,
            weekRange: defaultWeekSheetName(sheet.startDate)
          }))}
          activeSheetId={activeSheetId}
          onSelect={onSelectSheet}
          onAdd={onAddSheet}
          onRename={onRenameSheet}
          onDuplicate={onDuplicateSheet}
          onDelete={onDeleteSheet}
          onMove={onMoveSheet}
          onSetColor={onColorSheet}
        />
      </div>
      )}

      {plan === 'week' && (
        <div className="room-assignments-container">
          <div className="room-title">Phân công bệnh phòng</div>
          <RoomSheet
            table={roomTable}
            grid={grid}
            staffList={staffList}
            taskList={taskList}
            cellStyles={scheduleData.cellStyles}
            bridge={bridge}
            formatCtl={formatCtl}
            uiRef={uiRef}
            onChange={onUpdateRooms}
          />
        </div>
      )}

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
