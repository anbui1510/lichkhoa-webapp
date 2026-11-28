import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { ModalPortal } from './ModalPortal';
import { MONTH_ROLES } from '../logic/monthSchedule';
import {
  monthRoleFromPreset,
  monthRoleFromTask,
  roleShortLabel,
  taskForRole,
  taskOptionLabel,
} from '../logic/taskMatch';

function roleAlreadyOnSheet(role, monthRoles, taskList) {
  const list = monthRoles || [];
  if (list.some((item) => item.key === role.key)) return true;
  if (role.taskId && list.some((item) => item.taskId === role.taskId)) return true;
  const short = roleShortLabel(role, taskList);
  return list.some((item) => roleShortLabel(item, taskList) === short);
}

/**
 * Chọn dòng nhiệm vụ lịch tháng từ mẫu hoặc task đã có — không tạo task mới.
 */
export function MonthRolePickerModal({
  monthRoles = [],
  taskList = [],
  onClose,
  onPick,
}) {
  const [query, setQuery] = useState('');

  const presets = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MONTH_ROLES.filter((preset) => {
      if (monthRoles.some((role) => role.key === preset.key)) return false;
      if (!q) return true;
      const hay = `${preset.key} ${preset.label}`.toLowerCase();
      return hay.includes(q);
    });
  }, [monthRoles, query]);

  const tasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    const usedTaskIds = new Set((monthRoles || []).map((role) => role.taskId).filter(Boolean));
    return (taskList || []).filter((task) => {
      if (!task?.code) return false;
      if (usedTaskIds.has(task.id)) return false;
      const role = monthRoleFromTask(task);
      if (monthRoles.some((item) => item.key === role.key)) return false;
      if (!q) return true;
      const hay = `${task.code} ${task.name || ''} ${task.category || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [monthRoles, query, taskList]);

  const pickPreset = (preset) => {
    const role = monthRoleFromPreset(preset, taskList);
    if (roleAlreadyOnSheet(role, monthRoles, taskList)) return;
    onPick(role);
    onClose();
  };

  const pickTask = (task) => {
    const role = monthRoleFromTask(task);
    if (roleAlreadyOnSheet(role, monthRoles, taskList)) return;
    onPick(role);
    onClose();
  };

  return (
    <ModalPortal>
      <div className="modal-overlay" role="presentation" onClick={onClose}>
        <div
          className="modal-content month-role-picker"
          role="dialog"
          aria-labelledby="month-role-picker-title"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="modal-header">
            <h2 id="month-role-picker-title">Thêm dòng nhiệm vụ lịch tháng</h2>
            <button type="button" className="modal-close" onClick={onClose} aria-label="Đóng">
              <X size={18} />
            </button>
          </div>
          <p className="modal-hint">
            Chọn dòng từ mẫu hoặc task đã có trong Quản lý task. Không tạo task mới — dữ liệu lưu
            trên sổ (Sheet) khi đã liên kết Google Sheet.
          </p>
          <input
            type="search"
            className="form-input month-role-picker-search"
            placeholder="Lọc: TC, RO, Trực chính…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
          />
          <div className="month-role-picker-body">
            {presets.length > 0 && (
              <section>
                <h3 className="month-role-picker-section">Mẫu dòng lịch tháng</h3>
                <ul className="month-role-picker-list">
                  {presets.map((preset) => {
                    const linked = taskForRole(monthRoleFromPreset(preset, taskList), taskList);
                    return (
                      <li key={preset.key}>
                        <button type="button" className="month-role-picker-item" onClick={() => pickPreset(preset)}>
                          <span className="month-role-picker-label">{preset.label}</span>
                          {linked ? (
                            <span className="month-role-picker-meta">{taskOptionLabel(linked)}</span>
                          ) : (
                            <span className="month-role-picker-meta is-muted">Chưa gắn mã task</span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
            {tasks.length > 0 && (
              <section>
                <h3 className="month-role-picker-section">Task khoa</h3>
                <ul className="month-role-picker-list">
                  {tasks.map((task) => (
                    <li key={task.id}>
                      <button type="button" className="month-role-picker-item" onClick={() => pickTask(task)}>
                        <span className="month-role-picker-label">{taskOptionLabel(task)}</span>
                        <span className="month-role-picker-meta">
                          {task.scope === 'month' ? 'Lịch tháng' : task.encodeDuty ? 'Gắn trực' : 'Tuần/tháng'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {!presets.length && !tasks.length && (
              <p className="month-role-picker-empty">Không còn dòng hoặc task phù hợp để thêm.</p>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="action-btn" onClick={onClose}>
              Đóng
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}