import React from 'react';
import {
  Bell,
  Calendar,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Moon,
  Settings,
  Stethoscope,
  Sun,
  Table,
  User
} from 'lucide-react';

export function Navbar({
  activeDept,
  departments,
  onSelectDept,
  activeView,
  onSelectView,
  theme,
  onToggleTheme,
  onNotifications,
  onProfile,
  onSettings,
  onExit
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

      <div className="nav-actions">
        <button
          type="button"
          className="nav-icon-btn"
          title="Thông báo"
          aria-label="Thông báo"
          onClick={onNotifications}
        >
          <Bell size={18} />
        </button>
        <button
          type="button"
          className="nav-icon-btn"
          title="Hồ sơ cá nhân"
          aria-label="Hồ sơ cá nhân"
          onClick={onProfile}
        >
          <User size={18} />
        </button>
        <button
          type="button"
          className="nav-icon-btn"
          title="Cài đặt"
          aria-label="Cài đặt"
          onClick={onSettings}
        >
          <Settings size={18} />
        </button>
        <button
          type="button"
          className="nav-icon-btn"
          title="Thoát"
          aria-label="Thoát"
          onClick={onExit}
        >
          <LogOut size={18} />
        </button>
        <span className="nav-actions-sep" aria-hidden="true" />
        <button
          type="button"
          className="nav-icon-btn"
          onClick={onToggleTheme}
          title="Đổi giao diện Sáng/Tối"
          aria-label="Đổi giao diện Sáng/Tối"
        >
          {theme === 'dark' ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#6366f1" />}
        </button>
      </div>
    </header>
  );
}
