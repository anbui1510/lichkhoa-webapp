import React, { useEffect, useState } from 'react';
import { UserPlus, Upload, Trash2, Pencil, X, Plus } from 'lucide-react';
import { TITLE_OPTIONS, POSITION_OPTIONS, derivePositionFromTitle, getQuotaForTitle } from '../store/constants';
import { useConfirm } from './ConfirmDialog';

const EMPTY_FORM = {
  name: '',
  shortName: '',
  title: 'BS CK1',
  position: 'BS Cột 2',
  dutyQuota: 6,
  buBalance: 0,
  phepBalance: 12,
  email: '',
  taskDuties: []
};

const WEEKDAYS = [
  { id: 0, label: 'T2' },
  { id: 1, label: 'T3' },
  { id: 2, label: 'T4' },
  { id: 3, label: 'T5' },
  { id: 4, label: 'T6' },
  { id: 5, label: 'T7' },
  { id: 6, label: 'CN' }
];

function normalizeDuties(list) {
  if (!Array.isArray(list)) return [];
  return list.map((row, index) => ({
    id: row.id || `duty_${index}`,
    taskId: row.taskId || '',
    days: WEEKDAYS.map(day => day.id).filter(id => (row.days || []).includes(id)),
    substituteId: row.substituteId || '',
    enabled: row.enabled !== false
  }));
}

export function StaffManager({
  staffList,
  taskList = [],
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  onBulkImport,
  autoOpenAdd,
  onAutoOpenHandled
}) {
  // editing: null (đóng) | 'NEW' (thêm mới) | object nhân sự đang sửa
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [confirm, confirmDialog] = useConfirm();

  const isNew = editing === 'NEW';

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setEditing('NEW');
  };

  const openEdit = (s) => {
    setForm({
      name: s.name || '',
      shortName: s.shortName || '',
      title: s.title || 'BS CK1',
      position: s.position || derivePositionFromTitle(s.title),
      dutyQuota: s.dutyQuota ?? getQuotaForTitle(s.title),
      buBalance: s.buBalance ?? 0,
      phepBalance: s.phepBalance ?? 0,
      email: s.email || '',
      taskDuties: normalizeDuties(s.taskDuties)
    });
    setFormError('');
    setEditing(s);
  };

  const closeModal = () => setEditing(null);

  // Mở form Thêm khi bấm nút "+ BS Mới" trên thanh điều hướng
  useEffect(() => {
    if (autoOpenAdd) {
      openAdd();
      onAutoOpenHandled?.();
    }
  }, [autoOpenAdd]);

  const updateDuty = (id, patch) => {
    setForm(current => ({
      ...current,
      taskDuties: current.taskDuties.map(row => (row.id === id ? { ...row, ...patch } : row))
    }));
  };

  const addDuty = () => {
    setForm(current => ({
      ...current,
      taskDuties: [...current.taskDuties, {
        id: `duty_${Date.now()}`,
        taskId: '',
        days: [],
        substituteId: '',
        enabled: true
      }]
    }));
  };

  const removeDuty = (id) => {
    setForm(current => ({
      ...current,
      taskDuties: current.taskDuties.filter(row => row.id !== id)
    }));
  };

  const handleTitleChange = (title) => {
    setForm(f => ({ ...f, title, dutyQuota: getQuotaForTitle(title, f.dutyQuota) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    const shortName = form.shortName.trim().toUpperCase();
    if (!name || !shortName) return;

    const duplicate = staffList.find(s =>
      s.shortName.toUpperCase() === shortName && (isNew || s.id !== editing.id)
    );
    if (duplicate) {
      setFormError(`Tên viết tắt "${shortName}" đã được dùng cho ${duplicate.name}. Vui lòng chọn tên khác.`);
      return;
    }

    const ok = await confirm({
      variant: 'primary',
      title: isNew ? 'Xác nhận thêm nhân sự' : 'Xác nhận lưu thay đổi',
      message: isNew
        ? <>Thêm <strong>{name}</strong> ({shortName}) vào danh sách bác sĩ?</>
        : <>Lưu thay đổi thông tin của <strong>{name}</strong> ({shortName})?</>,
      confirmText: 'Lưu'
    });
    if (!ok) return;

    const payload = {
      name,
      shortName,
      title: form.title,
      position: form.position,
      dutyQuota: Number(form.dutyQuota) || 0,
      buBalance: Number(form.buBalance) || 0,
      phepBalance: Number(form.phepBalance) || 0,
      email: form.email.trim() || `${shortName.toLowerCase()}@hospital.vn`,
      taskDuties: normalizeDuties(form.taskDuties).filter(row => row.taskId)
    };

    if (isNew) {
      onAddStaff({ id: `doc_${Date.now()}`, ...payload });
    } else {
      onUpdateStaff({ ...editing, ...payload }, editing.shortName);
    }
    closeModal();
  };

  const handleDelete = async (s) => {
    const ok = await confirm({
      variant: 'danger',
      title: 'Xác nhận xóa nhân sự',
      message: <>Bạn có chắc muốn xóa <strong>{s.name}</strong> ({s.shortName}) khỏi danh sách? Thao tác này không thể hoàn tác.</>,
      confirmText: 'Xóa'
    });
    if (ok) onDeleteStaff(s.id);
  };

  const handleBulkSubmit = () => {
    if (!bulkText.trim()) return;
    const lines = bulkText.split('\n');
    const newStaff = [];
    lines.forEach((line, idx) => {
      const parts = line.split('\t').length > 1 ? line.split('\t') : line.split(',');
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const shortName = parts[1].trim().toUpperCase();
        const title = parts[2]?.trim() || 'BS CK1';
        const position = parts[3]?.trim() || derivePositionFromTitle(title);
        if (name && shortName) {
          newStaff.push({
            id: `doc_bulk_${Date.now()}_${idx}`,
            name,
            shortName,
            title,
            position,
            dutyQuota: getQuotaForTitle(title),
            buBalance: 0,
            phepBalance: 12,
            email: `${shortName.toLowerCase()}@hospital.vn`
          });
        }
      }
    });

    if (newStaff.length > 0) {
      onBulkImport(newStaff);
      setBulkText('');
      setIsBulkModalOpen(false);
    }
  };

  return (
    <div className="view-container">
      <div className="section-header">
        <div>
          <h2 className="view-title">Quản Lý Bác Sĩ &amp; Nhân Sự</h2>
          <div className="sub-header-info">{staffList.length} nhân sự trong khoa</div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="action-btn primary" onClick={openAdd}>
            <UserPlus size={16} /> Thêm Bác Sĩ Mới
          </button>
          <button className="action-btn" onClick={() => setIsBulkModalOpen(true)}>
            <Upload size={16} /> Nhập Hàng Loạt Từ Excel
          </button>
        </div>
      </div>

      {/* Staff Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Họ và Tên</th>
              <th>Tên Viết Tắt</th>
              <th>Chức Danh</th>
              <th>Vị Trí</th>
              <th>Định Mức Ca</th>
              <th>Quỹ Bù</th>
              <th>Quỹ Phép</th>
              <th>Email</th>
              <th className="col-actions">Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {staffList.map(s => (
              <tr key={s.id}>
                <td style={{ fontWeight: 600 }}>{s.name}</td>
                <td><span className="code-pill">{s.shortName}</span></td>
                <td>{s.title}</td>
                <td><span className="position-pill">{s.position || derivePositionFromTitle(s.title)}</span></td>
                <td>{s.dutyQuota} ca/tháng</td>
                <td className="num-positive">{s.buBalance}</td>
                <td className="num-negative">{s.phepBalance}</td>
                <td className="text-muted-cell">{s.email}</td>
                <td className="col-actions">
                  <button className="icon-btn edit" title="Sửa thông tin" onClick={() => openEdit(s)}>
                    <Pencil size={15} />
                  </button>
                  <button className="icon-btn danger" title="Xóa nhân sự" onClick={() => handleDelete(s)}>
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {staffList.length === 0 && (
              <tr>
                <td colSpan={9} className="empty-cell">Chưa có nhân sự nào. Bấm “Thêm Bác Sĩ Mới” để bắt đầu.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Staff Modal */}
      {editing && (
        <div className="modal-overlay">
          <div className="modal-content staff-editor">
            <div className="modal-header">
              <span>{isNew ? 'Thêm Bác Sĩ / Nhân Viên Mới' : `Sửa Thông Tin: ${editing.name}`}</span>
              <button className="icon-btn" onClick={closeModal} title="Đóng"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Họ và Tên Đầy Đủ:</label>
                <input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="VD: Bùi Đạt Thịnh" />
              </div>

              <div className="form-group">
                <label className="form-label">Tên Viết Tắt (Ký hiệu ô Lịch):</label>
                <input
                  className="form-input"
                  required
                  value={form.shortName}
                  onChange={e => { setForm({ ...form, shortName: e.target.value }); setFormError(''); }}
                  placeholder="VD: THỊNH"
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Chức Danh:</label>
                  <select className="form-select" value={form.title} onChange={e => handleTitleChange(e.target.value)}>
                    {TITLE_OPTIONS.map(t => (
                      <option key={t.value} value={t.value}>{t.value} ({t.quota} ca/tháng)</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Vị Trí:</label>
                  <select className="form-select" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })}>
                    {POSITION_OPTIONS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label className="form-label">Định Mức Ca / Tháng:</label>
                  <input type="number" min="0" className="form-input" value={form.dutyQuota} onChange={e => setForm({ ...form, dutyQuota: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Quỹ Bù:</label>
                  <input type="number" step="0.5" className="form-input" value={form.buBalance} onChange={e => setForm({ ...form, buBalance: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Quỹ Phép:</label>
                  <input type="number" step="0.5" className="form-input" value={form.phepBalance} onChange={e => setForm({ ...form, phepBalance: e.target.value })} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email Nhận Lịch:</label>
                <input type="email" className="form-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="thinh.bd@hospital.vn" />
              </div>

              <div className="form-group">
                <label className="form-label">Task của nhân sự:</label>
                <div className="staff-task-table">
                  <div className="staff-task-head">
                    <span>Task</span>
                    <span>Ngày trong tuần</span>
                    <span>Người thay thế</span>
                    <span>Bật</span>
                  </div>
                  {form.taskDuties.map(row => {
                    const taken = new Set(form.taskDuties.filter(item => item.id !== row.id).map(item => item.taskId));
                    return (
                      <div key={row.id} className={`staff-task-row ${row.enabled ? '' : 'off'}`}>
                        <select
                          className="form-select"
                          value={row.taskId}
                          onChange={e => updateDuty(row.id, { taskId: e.target.value })}
                        >
                          <option value="">Chọn task</option>
                          {taskList.map(task => (
                            <option key={task.id} value={task.id} disabled={taken.has(task.id)}>
                              {task.code} – {task.name}
                            </option>
                          ))}
                        </select>
                        <div className="choice-row compact" role="group" aria-label="Ngày trong tuần">
                          {WEEKDAYS.map(day => (
                            <button
                              key={day.id}
                              type="button"
                              className={row.days.includes(day.id) ? 'active' : ''}
                              aria-pressed={row.days.includes(day.id)}
                              onClick={() => updateDuty(row.id, {
                                days: row.days.includes(day.id)
                                  ? row.days.filter(id => id !== day.id)
                                  : [...row.days, day.id]
                              })}
                            >
                              {day.label}
                            </button>
                          ))}
                        </div>
                        <select
                          className="form-select"
                          value={row.substituteId}
                          onChange={e => updateDuty(row.id, { substituteId: e.target.value })}
                        >
                          <option value="">Không</option>
                          {staffList.filter(person => isNew || person.id !== editing.id).map(person => (
                            <option key={person.id} value={person.id}>{person.shortName}</option>
                          ))}
                        </select>
                        <div className="staff-task-switch">
                          <label className="switch" title={row.enabled ? 'Đang bật' : 'Đang tắt'}>
                            <input
                              type="checkbox"
                              checked={row.enabled}
                              onChange={e => updateDuty(row.id, { enabled: e.target.checked })}
                            />
                            <span />
                          </label>
                          <button type="button" className="icon-btn danger" title="Xóa task" onClick={() => removeDuty(row.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button type="button" className="action-btn" onClick={addDuty}>
                  <Plus size={16} /> Thêm task
                </button>
              </div>

              {formError && <div className="form-error">{formError}</div>}

              <div className="modal-actions">
                <button type="button" className="action-btn" onClick={closeModal}>Hủy</button>
                <button type="submit" className="action-btn primary">{isNew ? 'Lưu Nhân Sự' : 'Lưu Thay Đổi'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {isBulkModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span>Nhập Hàng Loạt Danh Sách Nhân Viên từ Excel</span>
              <button className="icon-btn" onClick={() => setIsBulkModalOpen(false)} title="Đóng"><X size={18} /></button>
            </div>
            <div className="form-hint">
              Dán dữ liệu copy từ Excel/Google Sheets theo định dạng từng dòng:{' '}
              <code>Họ và Tên [Tab] Tên Viết Tắt [Tab] Chức Danh [Tab] Vị Trí</code>
              {' '}(Chức Danh và Vị Trí có thể bỏ trống).
            </div>
            <textarea
              rows={8}
              className="form-input"
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              placeholder={`Bùi Đạt Thịnh\tTHỊNH\tBS CK1\tBS Cột 2\nPhan Tiến Lợi\tLỢI\tTrưởng Khoa\tBS Trưởng Khoa\nLương Hoài Ân\tÂN\tBS Trẻ\tBS Cột 1`}
            />
            <div className="modal-actions">
              <button className="action-btn" onClick={() => setIsBulkModalOpen(false)}>Hủy</button>
              <button className="action-btn primary" onClick={handleBulkSubmit}>Nạp Dữ Liệu Excel</button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog}
    </div>
  );
}
