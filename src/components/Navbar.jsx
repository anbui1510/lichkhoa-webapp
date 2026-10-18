import React from 'react';
import { Calendar, Table, LayoutDashboard, Sparkles, Moon, Sun, Stethoscope, ClipboardList } from 'lucide-react';

export function Navbar({ 
  activeDept, 
  departments, 
  onSelectDept, 
  activeView, 
  onSelectView, 
  theme, 
  onToggleTheme,
  onAutoSchedule
}) {
  return (
    <header className="navbar">
      <div className="brand-logo">
        <div className="brand-icon">
          <Calendar size={22} />
        </div>
        <div>
          <span>Smart Scheduler</span>
          <span style={{ fontSize: '0.7rem', display: 'block', color: 'var(--accent-blue)', fontWeight: 500 }}>
            Xếp Lịch Khoa Bệnh Viện
          </span>
        </div>
      </div>

      {/* Department Selector */}
      <div className="dept-selector-wrapper">
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Khoa:</span>
        <select 
          className="dept-select" 
          value={activeDept?.id} 
          onChange={(e) => onSelectDept(e.target.value)}
        >
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* View Switcher */}
      <div className="nav-views">
        <button 
          className={`nav-btn ${activeView === 'SHEET' ? 'active' : ''}`}
          onClick={() => onSelectView('SHEET')}
        >
          <Table size={16} /> Bảng Sheet
        </button>

        <button 
          className={`nav-btn ${activeView === 'CALENDAR' ? 'active' : ''}`}
          onClick={() => onSelectView('CALENDAR')}
        >
          <Calendar size={16} /> Lịch Google
        </button>

        <button 
          className={`nav-btn ${activeView === 'DASHBOARD' ? 'active' : ''}`}
          onClick={() => onSelectView('DASHBOARD')}
        >
          <LayoutDashboard size={16} /> Dashboard
        </button>

        <button 
          className={`nav-btn ${activeView === 'STAFF' ? 'active' : ''}`}
          onClick={() => onSelectView('STAFF')}
        >
          <Stethoscope size={16} /> Quản Lý BS
        </button>

        <button 
          className={`nav-btn ${activeView === 'TASKS' ? 'active' : ''}`}
          onClick={() => onSelectView('TASKS')}
        >
          <ClipboardList size={16} /> Quản Lý Task
        </button>
      </div>

      {/* Action Buttons */}
      <div className="nav-actions">
        <button className="action-btn primary" onClick={onAutoSchedule}>
          <Sparkles size={16} /> Tự Động Xếp Lịch
        </button>

        <button className="action-btn" onClick={onToggleTheme} title="Đổi giao diện Sáng/Tối">
          {theme === 'dark' ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#6366f1" />}
        </button>
      </div>
    </header>
  );
}
