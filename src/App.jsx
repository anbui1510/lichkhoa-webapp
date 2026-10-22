import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { TaskPalette } from './components/TaskPalette';
import { SheetView } from './components/SheetView';
import { CalendarView } from './components/CalendarView';
import { FairnessDashboard } from './components/FairnessDashboard';
import { StaffManager } from './components/StaffManager';
import { TaskManager } from './components/TaskManager';

import { getInitialStore, saveStore } from './store/dbStore';
import { getCategoriesForDept } from './store/constants';
import { generateWeeklySchedule, buildWeekDays, defaultWeekSheetName, emptyWeekGrid } from './logic/schedulerEngine';
import { roomTableOf } from './components/RoomSheet';
import { mondayOf, columnSpecs, currentMonthKey, customCellKey, normalizeDaySessions, shiftMonthKey, resolveMonthRoles, sessionCellKey } from './logic/monthSchedule';
import { matchTask } from './logic/taskMatch';

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
    leaveCuts: { bu: {}, phep: {} }
  };
}

function weekRecord(sh) {
  return {
    grid: sh.grid,
    warnings: sh.warnings || [],
    roomWarnings: sh.roomWarnings || [],
    buGrants: sh.buGrants || {},
    leaveCuts: sh.leaveCuts || { bu: {}, phep: {} }
  };
}

function openWeek(sh, startDate, staff) {
  const weeks = { ...(sh.weeks || {}) };
  if (sh.startDate) weeks[sh.startDate] = weekRecord(sh);
  const saved = weeks[startDate];
  return {
    ...sh,
    weeks,
    startDate,
    ...(saved || {
      grid: emptyWeekGrid(staff, sh.daySessions),
      warnings: [],
      roomWarnings: [],
      buGrants: {},
      leaveCuts: { bu: {}, phep: {} }
    }),
    leaveCuts: (saved && saved.leaveCuts) || { bu: {}, phep: {} }
  };
}

function weekSources(sheets) {
  const sources = [];
  (sheets || []).forEach((sheet) => {
    sources.push({ startDate: sheet.startDate, grid: sheet.grid });
    Object.entries(sheet.weeks || {}).forEach(([startDate, saved]) => {
      sources.push({ startDate, grid: saved?.grid });
    });
  });
  return sources;
}

function foldSheetName(value) {
  return String(value || '').trim().toLowerCase();
}

/** Tên sheet không trùng — Sheet 1, Sheet 2… hoặc "Tên gốc (1)" như Google Sheets. */
function nextSheetName(sheets, base = 'Sheet') {
  const taken = new Set(sheets.map(s => foldSheetName(s.name)));
  const free = (candidate) => !taken.has(foldSheetName(candidate));

  if (free(base)) return base;

  if (/^sheet$/i.test(base.trim())) {
    for (let n = 1; n < 1000; n += 1) {
      const candidate = `Sheet ${n}`;
      if (free(candidate)) return candidate;
    }
  }

  for (let n = 1; n < 1000; n += 1) {
    const candidate = `${base} (${n})`;
    if (free(candidate)) return candidate;
  }
  return `${base} (${Date.now()})`;
}

function isLegacySheetTabName(name) {
  return /^sheet\s*\d+$/i.test(String(name || '').trim());
}

/** Đổi Sheet 1, Sheet 2… cũ trong localStorage sang Lịch tuần dd/mm - dd/mm. */
function migrateLegacySheetNames(sheets) {
  const next = [];
  for (const sheet of sheets) {
    if (!isLegacySheetTabName(sheet.name)) {
      next.push(sheet);
      continue;
    }
    const startDate = sheet.startDate || DEFAULT_START_DATE;
    const name = nextSheetName(next, defaultWeekSheetName(startDate));
    next.push({ ...sheet, name });
  }
  return next;
}

// Đảm bảo mỗi khoa có ít nhất 1 sheet
function ensureSheets(store) {
  const sheetsByDept = { ...(store.sheetsByDept || {}) };
  store.departments.forEach(dept => {
    const st = sheetsByDept[dept.id];
    if (!st || !st.sheets || st.sheets.length === 0) {
      const id = `sheet_${dept.id}_1`;
      sheetsByDept[dept.id] = {
        activeSheetId: id,
        sheets: [{ id, name: defaultWeekSheetName(DEFAULT_START_DATE), ...blankSheetContent(dept, DEFAULT_START_DATE) }]
      };
    } else {
      const sheets = migrateLegacySheetNames(st.sheets);
      sheetsByDept[dept.id] = {
        ...st,
        sheets,
        activeSheetId: sheets.some(s => s.id === st.activeSheetId) ? st.activeSheetId : sheets[0].id
      };
    }
  });
  return { ...store, sheetsByDept };
}

export function App() {
  const [store, setStore] = useState(() => ensureSheets(getInitialStore()));
  const [activeView, setActiveView] = useState('SHEET'); // 'SHEET' | 'CALENDAR' | 'DASHBOARD' | 'STAFF' | 'TASKS'
  const [theme, setTheme] = useState('light');

  // Active Department Data
  const activeDept = store.departments.find(d => d.id === store.activeDeptId) || store.departments[0];
  const staffList = activeDept?.staff || [];
  const taskList = activeDept?.tasks || [];
  const categories = useMemo(() => getCategoriesForDept(activeDept), [activeDept]);

  // Active Sheet Data
  const sheetState = store.sheetsByDept[activeDept.id];
  const sheets = sheetState.sheets;
  const activeSheet = sheets.find(s => s.id === sheetState.activeSheetId) || sheets[0];
  const scheduleData = useMemo(
    () => ({ ...activeSheet, days: buildWeekDays(activeSheet.startDate) }),
    [activeSheet]
  );

  // Save Store on change
  useEffect(() => {
    saveStore(store);
  }, [store]);

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
    if (next === 'light') {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    } else {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    }
  };

  // Department Selection
  const handleSelectDept = (deptId) => {
    setStore(prev => ensureSheets({ ...prev, activeDeptId: deptId }));
  };

  // Run Auto-Scheduler Engine on the active sheet
  const handleAutoSchedule = () => {
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
      roomTable: roomTableOf(activeSheet),
      sheets: weekSources(sheets),
      existingNotes
    });
    const before = activeSheet.buGrants || {};
    const after = result.buGrants || {};
    const afterCuts = result.leaveCuts || { bu: {}, phep: {} };
    const sheetId = activeSheet.id;
    const deptId = activeDept.id;
    setStore(prev => {
      const st = prev.sheetsByDept[deptId];
      const sh = st.sheets.find(item => item.id === sheetId) || st.sheets[0];
      const nextSheet = {
        ...sh,
        grid: result.grid,
        warnings: result.warnings,
        roomWarnings: result.roomWarnings,
        buGrants: after,
        leaveCuts: afterCuts,
        weeks: {
          ...(sh.weeks || {}),
          [sh.startDate]: {
            grid: result.grid,
            warnings: result.warnings,
            roomWarnings: result.roomWarnings,
            buGrants: after,
            leaveCuts: afterCuts
          }
        }
      };
      return {
        ...prev,
        departments: prev.departments.map(dept => dept.id !== deptId ? dept : {
          ...dept,
          staff: dept.staff.map(person => {
            const name = person.shortName;
            const grantDelta = (Number(after[name]) || 0) - (Number(before[name]) || 0);
            const buCutDelta = (Number(afterCuts.bu?.[name]) || 0) - (Number(previousCuts.bu?.[name]) || 0);
            const phepCutDelta = (Number(afterCuts.phep?.[name]) || 0) - (Number(previousCuts.phep?.[name]) || 0);
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

  // Manual Cell Edit from Sheet View
  const handleUpdateCell = (shortName, dayIdx, session, newVal) => {
    const value = newVal == null ? '' : String(newVal);

    updateActiveSheet(sh => {
      const grid = { ...sh.grid };
      const row = { ...(grid[shortName] || {}) };
      const cell = { ...(row[dayIdx] || { S: '', C: '' }) };
      cell[session] = value;
      row[dayIdx] = cell;
      grid[shortName] = row;
      return { ...sh, grid };
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

  const handleUpdateNote = (shortName, newVal) => {
    const value = newVal == null ? '' : String(newVal);
    updateActiveSheet(sh => {
      const grid = { ...sh.grid };
      const row = { ...(grid[shortName] || {}) };
      row.note = value;
      grid[shortName] = row;
      return { ...sh, grid };
    });
  };

  const handleDateChange = (daysDelta) => {
    const [y, m, d] = activeSheet.startDate.split('-').map(Number);
    const curr = new Date(y, m - 1, d);
    curr.setDate(curr.getDate() + daysDelta);
    const newStart = mondayOf(curr);
    updateActiveSheet(sh => openWeek(sh, newStart, staffList));
  };

  const handleGoCurrentWeek = () => {
    updateActiveSheet(sh => openWeek(sh, mondayOf(new Date()), staffList));
  };

  const handleMonthKeyChange = (baseKey, delta) => {
    const next = delta === 0 ? currentMonthKey() : shiftMonthKey(baseKey, delta);
    updateActiveSheet(sh => ({ ...sh, monthKey: next }));
  };

  const handleWeekMerges = (weekMerges) => {
    updateActiveSheet(sh => ({ ...sh, weekMerges }));
  };

  const handleMonthMerges = (monthMerges) => {
    updateActiveSheet(sh => ({ ...sh, monthMerges }));
  };

  const handleDaySessions = (daySessions) => {
    updateActiveSheet(sh => ({ ...sh, daySessions: normalizeDaySessions(daySessions) }));
  };

  const handleFreeze = (scope, patch) => {
    updateActiveSheet(sh => {
      const freeze = { ...(sh.freeze || {}) };
      freeze[scope] = { ...(freeze[scope] || {}), ...patch };
      return { ...sh, freeze };
    });
  };

  const saveDeptList = (field, entry) => {
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
    updateActiveDept(dept => ({
      ...dept,
      [field]: (dept[field] || []).filter(item => item.id !== id)
    }));
  };

  const handleUpdateRooms = (roomTable) => {
    updateActiveSheet(sh => ({ ...sh, roomTable }));
  };

  const handleUpdateMonthCell = (iso, roleKey, session, value) => {
    updateActiveSheet(sh => ({
      ...sh,
      monthGrid: { ...(sh.monthGrid || {}), [sessionCellKey(iso, roleKey, session)]: value ?? '' }
    }));
  };

  const handleUpdateMonthCustomCell = (id, weekStart, slot, value) => {
    updateActiveSheet(sh => ({
      ...sh,
      monthGrid: { ...(sh.monthGrid || {}), [customCellKey(id, weekStart, slot)]: value ?? '' }
    }));
  };

  const handleInsertMonthColumn = (index, side) => {
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
    updateActiveSheet(sh => ({
      ...sh,
      monthColumnTitles: { ...(sh.monthColumnTitles || {}), [key]: String(title || '').trim() || 'Cột mới' }
    }));
  };

  const handleRemoveMonthColumn = (key) => {
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
    updateActiveSheet(sh => {
      const cellStyles = { ...(sh.cellStyles || {}) };
      Object.entries(updates || {}).forEach(([key, value]) => {
        if (!value) delete cellStyles[key];
        else cellStyles[key] = value;
      });
      return { ...sh, cellStyles };
    });
  };

  const handleAddMonthRole = (taskOrLabel) => {
    const task = taskOrLabel && typeof taskOrLabel === 'object' ? taskOrLabel : null;
    const label = task ? String(task.code || '').trim() : String(taskOrLabel || '').trim();
    if (!label) return;
    updateActiveSheet(sh => ({
      ...sh,
      monthRoles: [...resolveMonthRoles(sh.monthRoles), {
        key: `role_${Date.now()}`,
        label,
        taskId: task?.id || null
      }]
    }));
  };

  const handleInsertMonthRole = (index) => {
    updateActiveSheet(sh => {
      const roles = resolveMonthRoles(sh.monthRoles);
      const next = [...roles];
      const at = Math.max(0, Math.min(Number(index) || 0, next.length));
      next.splice(at, 0, { key: `role_${Date.now()}`, label: '', taskId: null });
      return { ...sh, monthRoles: next };
    });
  };

  const handleRenameMonthRole = (roleKey, raw) => {
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
    const id = `sheet_${Date.now()}`;
    const startDate = activeSheet.startDate;
    updateSheetState(st => ({
      activeSheetId: id,
      sheets: [...st.sheets, {
        id,
        name: nextSheetName(st.sheets, defaultWeekSheetName(startDate)),
        ...blankSheetContent(activeDept, startDate)
      }]
    }));
  };

  const handleRenameSheet = (sheetId, name) => {
    updateSheetState(st => ({
      ...st,
      sheets: st.sheets.map(sh => (sh.id === sheetId ? { ...sh, name } : sh))
    }));
  };

  const handleDuplicateSheet = (sheetId) => {
    const id = `sheet_${Date.now()}`;
    updateSheetState(st => {
      const idx = st.sheets.findIndex(sh => sh.id === sheetId);
      if (idx < 0) return st;
      const source = st.sheets[idx];
      const copy = JSON.parse(JSON.stringify(source));
      copy.id = id;
      copy.name = nextSheetName(st.sheets, defaultWeekSheetName(source.startDate));
      const nextSheets = [...st.sheets];
      nextSheets.splice(idx + 1, 0, copy);
      return { activeSheetId: id, sheets: nextSheets };
    });
  };

  const handleMoveSheet = (sheetId, direction) => {
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
    updateSheetState(st => ({
      ...st,
      sheets: st.sheets.map(sh => (sh.id === sheetId ? { ...sh, color: color || undefined } : sh))
    }));
  };

  const handleDeleteSheet = (sheetId) => {
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
  const handleAddStaff = (newStaffObj) => {
    updateActiveDept(d => ({ ...d, staff: [...d.staff, newStaffObj] }));
  };

  const handleUpdateStaff = (updatedStaff, oldShortName) => {
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
    updateActiveDept(d => ({ ...d, staff: d.staff.filter(s => s.id !== staffId) }));
  };

  const handleBulkImportStaff = (newStaffList) => {
    updateActiveDept(d => ({ ...d, staff: [...d.staff, ...newStaffList] }));
  };

  // ---------- Task Management Actions ----------
  const handleAddTask = (newTaskObj) => {
    updateActiveDept(d => ({ ...d, tasks: [...d.tasks, newTaskObj] }));
  };

  const handleUpdateTask = (updatedTask) => {
    updateActiveDept(d => ({ ...d, tasks: d.tasks.map(item => item.id === updatedTask.id ? updatedTask : item) }));
  };

  const handleDeleteTask = (taskId) => {
    updateActiveDept(d => ({ ...d, tasks: d.tasks.filter(t => t.id !== taskId) }));
  };

  const handleReorderTasks = (tasks) => {
    updateActiveDept(d => ({ ...d, tasks }));
  };

  const handleLoadTaskTemplate = (templateTasks) => {
    updateActiveDept(d => ({ ...d, tasks: templateTasks }));
  };

  const handleAddCategory = (category) => {
    updateActiveDept(d => ({ ...d, customCategories: [...(d.customCategories || []), category] }));
  };

  const handleDeleteCategory = (categoryKey) => {
    updateActiveDept(d => ({
      ...d,
      customCategories: (d.customCategories || []).filter(c => c.key !== categoryKey)
    }));
  };

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <Navbar
        activeDept={activeDept}
        departments={store.departments}
        onSelectDept={handleSelectDept}
        activeView={activeView}
        onSelectView={setActiveView}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onAutoSchedule={handleAutoSchedule}
      />

      {/* Main Content Workspace */}
      <main className="main-content">
        {/* Left Sidebar Task Palette Bar */}
        <TaskPalette tasks={taskList} categories={categories} staff={staffList} />

        {/* Dynamic View Component */}
        {activeView === 'SHEET' && (
          <SheetView
            dept={activeDept}
            staffList={staffList}
            taskList={taskList}
            scheduleData={scheduleData}
            onUpdateCell={handleUpdateCell}
            onUpdateNote={handleUpdateNote}
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
            onMonthKeyChange={handleMonthKeyChange}
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
          />
        )}

        {activeView === 'CALENDAR' && (
          <CalendarView
            dept={activeDept}
            staffList={staffList}
            taskList={taskList}
            scheduleData={scheduleData}
          />
        )}

        {activeView === 'DASHBOARD' && (
          <FairnessDashboard
            dept={activeDept}
            staffList={staffList}
            scheduleData={scheduleData}
          />
        )}

        {activeView === 'STAFF' && (
          <StaffManager
            staffList={staffList}
            taskList={taskList}
            onAddStaff={handleAddStaff}
            onUpdateStaff={handleUpdateStaff}
            onDeleteStaff={handleDeleteStaff}
            onBulkImport={handleBulkImportStaff}
          />
        )}

        {activeView === 'TASKS' && (
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
          />
        )}
      </main>
    </div>
  );
}
