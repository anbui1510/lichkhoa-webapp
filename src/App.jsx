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
import { generateWeeklySchedule, buildWeekDays } from './logic/schedulerEngine';
import { mondayOf, columnSpecs, currentMonthKey, customCellKey, normalizeDaySessions, shiftMonthKey, resolveMonthRoles, sessionCellKey } from './logic/monthSchedule';
import { matchTask } from './logic/taskMatch';

const DEFAULT_START_DATE = '2026-09-14'; // Monday 14/09/2026

// ---------- Sheet helpers ----------
function generateSheetContent(dept, startDate) {
  const { days, logs, ...rest } = generateWeeklySchedule({
    startDate,
    staffList: dept.staff,
    taskList: dept.tasks,
    rules: dept.rules || {}
  });
  return { startDate, ...rest };
}

function blankSheetContent(dept, startDate) {
  const grid = {};
  dept.staff.forEach(s => {
    grid[s.shortName] = {};
    for (let d = 0; d < 7; d++) grid[s.shortName][d] = { S: '', C: '', isRT: false };
  });
  return { startDate, grid, roomAssignments: {}, roomWarnings: [], warnings: [] };
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
  store.departments.forEach(dept => {
    const st = sheetsByDept[dept.id];
    if (!st || !st.sheets || st.sheets.length === 0) {
      const id = `sheet_${dept.id}_1`;
      sheetsByDept[dept.id] = {
        activeSheetId: id,
        sheets: [{ id, name: 'Sheet 1', ...generateSheetContent(dept, DEFAULT_START_DATE) }]
      };
    } else if (!st.sheets.some(s => s.id === st.activeSheetId)) {
      sheetsByDept[dept.id] = { ...st, activeSheetId: st.sheets[0].id };
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
    updateActiveSheet(sh => ({ ...sh, ...generateSheetContent(activeDept, sh.startDate) }));
    alert(`✨ Tự động xếp lịch thành công cho "${activeSheet.name}"! Đã nạp Lịch Tháng Master, Ra Trực (RT) và tính toán Cân Bằng Tải.`);
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

  // Date Navigation (re-runs the scheduler for the new week on the active sheet)
  const handleDateChange = (daysDelta) => {
    const curr = new Date(activeSheet.startDate);
    curr.setDate(curr.getDate() + daysDelta);
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, '0');
    const d = String(curr.getDate()).padStart(2, '0');
    const newStart = `${y}-${m}-${d}`;
    updateActiveSheet(sh => ({ ...sh, ...generateSheetContent(activeDept, newStart) }));
  };

  const handleGoCurrentWeek = () => {
    const newStart = mondayOf(new Date());
    updateActiveSheet(sh => ({ ...sh, ...generateSheetContent(activeDept, newStart) }));
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
    updateSheetState(st => ({
      activeSheetId: id,
      sheets: [...st.sheets, { id, name: nextSheetName(st.sheets), ...blankSheetContent(activeDept, activeSheet.startDate) }]
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
      copy.name = nextSheetName(st.sheets, `Bản sao của ${source.name}`.slice(0, 32));
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
    updateActiveDept(d => ({ ...d, tasks: d.tasks.map(t => (t.id === updatedTask.id ? updatedTask : t)) }));
  };

  const handleDeleteTask = (taskId) => {
    updateActiveDept(d => ({ ...d, tasks: d.tasks.filter(t => t.id !== taskId) }));
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
