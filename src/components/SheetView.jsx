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
import { buildWeekDays } from '../logic/schedulerEngine';

const FIXED_COLS = 3;

function findTaskColor(taskList, raw) {
  const mainCode = String(raw || '').split(',')[0].trim().toLowerCase();
  if (!mainCode) return null;
  const task = taskList.find(t => String(t.code).toLowerCase() === mainCode);
  return task ? { bg: task.bgColor, text: task.textColor } : null;
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
  onDeleteStudy
}) {
  const containerRef = useRef(null);
  const hotInstanceRef = useRef(null);
  const stylesRef = useRef(scheduleData.cellStyles || {});
  const taskListRef = useRef(taskList);
  const onUpdateRef = useRef(onUpdateCell);
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
  const rowData = staffList.map(s => {
    const sData = grid[s.shortName] || {};
    const row = [s.shortName, s.buBalance, s.phepBalance];
    for (let d = 0; d < 7; d += 1) {
      sessions.forEach(id => row.push(sData[d]?.[id] || ''));
    }
    return row;
  });
  const weekWidth = 3 + 7 * sessions.length;
  const weekData = [
    ...rowData,
    ...alertRows.map((text) => {
      const row = new Array(weekWidth).fill('');
      row[0] = text;
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
    }))
  ];
  const subHeaders = ['', '', '', ...days.flatMap(() => sessions.map(sessionLabel))];

  const dataKey = JSON.stringify(rowData);
  const headerKey = `${sessions.join('')}|${days.map(d => `${d.dateStr}|${d.holidayName || ''}`).join(',')}`;

  describeRef.current = (row, col) => {
    const staff = staffList[row];
    if (!staff || col < 0) return null;
    let key = null;
    if (col === 0) key = `w|${staff.shortName}|label`;
    else if (col === 1) key = `w|${staff.shortName}|bu`;
    else if (col === 2) key = `w|${staff.shortName}|phep`;
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
      col: 0,
      rowspan: 1,
      colspan: weekData[0]?.length || 1
    }));
    alertMergeRef.current = alertMerges;

    const hot = new window.Handsontable(containerRef.current, {
      data: weekData,
      nestedHeaders: [topHeaders, subHeaders],
      rowHeaders: true,
      height: Math.min(640, 88 + weekData.length * 30),
      width: '100%',
      licenseKey: 'non-commercial-and-evaluation',
      stretchH: 'all',
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
        if (col < FIXED_COLS || isAlert) cellProperties.readOnly = true;
        if (desc?.style?.wrap === 'wrap') cellProperties.wordWrap = true;
        else cellProperties.wordWrap = false;
        cellProperties.renderer = function weekRenderer(instance, td) {
          window.Handsontable.renderers.TextRenderer.apply(this, arguments);
          td.style.removeProperty('background-color');
          td.style.removeProperty('color');
          td.style.fontWeight = '';
          td.classList.remove('week-warning');
          if (row >= staffList.length) {
            td.classList.add('week-warning');
            return;
          }
          if (col >= FIXED_COLS) {
            const val = instance.getDataAtCell(row, col);
            const color = findTaskColor(taskListRef.current, val);
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
        if (col < FIXED_COLS && headerLevel === 0) {
          TH.rowSpan = 2;
          TH.classList.add('ht-frozen-head');
        }
        if (col < FIXED_COLS && headerLevel === 1) {
          TH.style.display = 'none';
        }
        if (headerLevel === 0 && col >= FIXED_COLS && (col - FIXED_COLS) % sessions.length === 0) {
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
          if (col >= FIXED_COLS && oldVal !== newVal) {
            const shortName = rowData[row][0];
            const dayIdx = Math.floor((col - FIXED_COLS) / sessions.length);
            const session = sessions[(col - FIXED_COLS) % sessions.length];
            onUpdateRef.current(shortName, dayIdx, session, newVal ?? '');
          }
        });
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
  }, [plan, dataKey, headerKey, currentStartDate, alertRows.join('|')]);

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
