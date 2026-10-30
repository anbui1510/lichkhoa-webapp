import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  ClipboardList,
  LayoutDashboard,
  Moon,
  MoreHorizontal,
  Stethoscope,
  Sun,
  Table,
  User,
  X
} from 'lucide-react';
import { MobileWeekAgenda } from './MobileWeekAgenda';
import { writeForcedUiMode } from '../../logic/uiMode';

const TAB_META = {
  SHEET: { icon: Table, label: 'Lịch' },
  CALENDAR: { icon: Calendar, label: 'Calendar' },
  DASHBOARD: { icon: LayoutDashboard, label: 'Dashboard' },
  STAFF: { icon: Stethoscope, label: 'Bác sĩ' },
  TASKS: { icon: ClipboardList, label: 'Task' },
  ACCOUNT: { icon: User, label: 'Tài khoản' }
};

function primaryTabs(views) {
  const list = views || [];
  const primary = [];
  if (list.includes('SHEET')) primary.push('SHEET');
  if (list.includes('CALENDAR')) primary.push('CALENDAR');
  if (list.includes('DASHBOARD') && primary.length < 3) primary.push('DASHBOARD');
  return primary.slice(0, 3);
}

function overflowTabs(views, primary) {
  const set = new Set(primary);
  return (views || []).filter((id) => !set.has(id));
}

export function MobileShell({
  activeDept,
  departments,
  onSelectDept,
  activeView,
  onSelectView,
  views,
  theme,
  onToggleTheme,
  onOpenAccount,
  childrenByView,
  scheduleProps
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = useMemo(() => primaryTabs(views), [views]);
  const overflow = useMemo(() => overflowTabs(views, primary), [views, primary]);
  const showMore = overflow.length > 0 || true;

  useEffect(() => {
    document.body.classList.add('mobile-ui');
    return () => document.body.classList.remove('mobile-ui');
  }, []);

  const selectView = (id) => {
    setMoreOpen(false);
    onSelectView(id);
  };

  const forceDesktop = () => {
    writeForcedUiMode('desktop');
    window.location.reload();
  };

  const body = activeView === 'SHEET'
    ? <MobileWeekAgenda {...scheduleProps} />
    : childrenByView[activeView] || null;

  return (
    <div className="mobile-shell">
      <header className="mobile-topbar">
        <div className="mobile-brand">
          <span className="mobile-brand-title">Lịch khoa</span>
          <select
            className="mobile-dept-select"
            value={activeDept?.id}
            onChange={(e) => onSelectDept(e.target.value)}
            aria-label="Chọn khoa"
          >
            {(departments || []).map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>
        <div className="mobile-top-actions">
          <button
            type="button"
            className="mobile-icon-btn"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Nền sáng' : 'Nền tối'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            type="button"
            className="mobile-icon-btn"
            onClick={() => onOpenAccount?.()}
            aria-label="Tài khoản"
          >
            <User size={18} />
          </button>
        </div>
      </header>

      <main className="mobile-body">
        {body}
      </main>

      {moreOpen && (
        <div className="mobile-more-sheet" role="dialog" aria-label="Thêm mục">
          <div className="mobile-more-backdrop" onClick={() => setMoreOpen(false)} />
          <div className="mobile-more-panel">
            <div className="mobile-more-head">
              <strong>Thêm</strong>
              <button type="button" className="mobile-icon-btn" onClick={() => setMoreOpen(false)} aria-label="Đóng">
                <X size={18} />
              </button>
            </div>
            <ul className="mobile-more-list">
              {overflow.map((id) => {
                const meta = TAB_META[id] || { icon: MoreHorizontal, label: id };
                const Icon = meta.icon;
                return (
                  <li key={id}>
                    <button type="button" className="mobile-more-item" onClick={() => selectView(id)}>
                      <Icon size={18} /> {meta.label}
                    </button>
                  </li>
                );
              })}
              <li>
                <button type="button" className="mobile-more-item" onClick={() => { setMoreOpen(false); onOpenAccount?.(); }}>
                  <User size={18} /> Tài khoản
                </button>
              </li>
              <li>
                <button type="button" className="mobile-more-item subtle" onClick={forceDesktop}>
                  <LayoutDashboard size={18} /> Giao diện máy tính
                </button>
              </li>
            </ul>
          </div>
        </div>
      )}

      <nav className="mobile-bottom-nav" aria-label="Điều hướng chính">
        {primary.map((id) => {
          const meta = TAB_META[id];
          const Icon = meta.icon;
          const active = activeView === id;
          return (
            <button
              key={id}
              type="button"
              className={`mobile-nav-item${active ? ' active' : ''}`}
              onClick={() => selectView(id)}
            >
              <Icon size={20} />
              <span>{meta.label}</span>
            </button>
          );
        })}
        {showMore && (
          <button
            type="button"
            className={`mobile-nav-item${moreOpen || overflow.includes(activeView) || activeView === 'ACCOUNT' ? ' active' : ''}`}
            onClick={() => setMoreOpen((open) => !open)}
          >
            <MoreHorizontal size={20} />
            <span>Thêm</span>
          </button>
        )}
      </nav>
    </div>
  );
}
