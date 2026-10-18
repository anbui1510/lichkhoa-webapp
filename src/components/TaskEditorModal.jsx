import React, { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { useConfirm } from './ConfirmDialog';
import { taskOptionLabel } from '../logic/taskMatch';

const NEW_CATEGORY_OPTION = '__NEW_CATEGORY__';

const EMPTY_FORM = {
  code: '',
  name: '',
  category: 'THUONG_TRUC',
  triggerRT: false,
  delta: 0,
  bgColor: '#3b82f6',
  textColor: '#ffffff',
  description: '',
  fixedDays: [],
  owners: []
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

function dayList(value) {
  const raw = Array.isArray(value) ? value : [];
  return WEEKDAYS.map(day => day.id).filter(id => raw.includes(id));
}

function ownerList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function taskForm(task) {
  return {
    code: task.code || '',
    name: task.name || '',
    category: task.category || 'CHUYEN_MON',
    triggerRT: !!task.triggerRT,
    delta: task.delta ?? 0,
    bgColor: task.bgColor || '#3b82f6',
    textColor: task.textColor || '#ffffff',
    description: task.description || '',
    fixedDays: dayList(task.fixedDays),
    owners: ownerList(task.owners)
  };
}

export function TaskEditorModal({
  title,
  hint,
  taskList,
  categories,
  initialTask,
  submitLabel = 'Lưu Task',
  onClose,
  onSave,
  onAddCategory,
  onDeleteCategory,
  staffList = []
}) {
  const [form, setForm] = useState(() => initialTask ? taskForm(initialTask) : EMPTY_FORM);
  const [linkedTask, setLinkedTask] = useState(null);
  const [suggestFor, setSuggestFor] = useState(null);
  const [formError, setFormError] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [confirm, confirmDialog] = useConfirm();

  const selectedCategory = categories.find(c => c.key === form.category);
  const query = (suggestFor === 'name' ? form.name : form.code).trim().toLowerCase();
  const suggestions = query
    ? taskList.filter(task =>
      task.code.toLowerCase().includes(query) || task.name.toLowerCase().includes(query)
    ).slice(0, 8)
    : [];

  const resetCategoryInput = () => {
    setIsAddingCategory(false);
    setNewCategoryName('');
  };

  const applyTask = (task) => {
    setLinkedTask(task);
    setForm(taskForm(task));
    setSuggestFor(null);
    setFormError('');
  };

  const handleCategorySelect = (value) => {
    if (value === NEW_CATEGORY_OPTION) {
      setIsAddingCategory(true);
      setNewCategoryName('');
      return;
    }
    resetCategoryInput();
    setForm(current => ({ ...current, category: value }));
  };

  const handleSaveNewCategory = async () => {
    const label = newCategoryName.trim();
    if (!label) {
      setFormError('Vui lòng nhập tên nhóm nghiệp vụ mới.');
      return;
    }
    if (categories.some(c => c.label.toLowerCase() === label.toLowerCase())) {
      setFormError(`Nhóm nghiệp vụ "${label}" đã tồn tại.`);
      return;
    }
    const ok = await confirm({
      variant: 'primary',
      title: 'Lưu nhóm nghiệp vụ mới',
      message: <>Thêm nhóm <strong>“{label}”</strong> vào danh sách Nhóm Nghiệp Vụ của khoa?</>,
      confirmText: 'Lưu'
    });
    if (!ok) return;
    const key = `CUSTOM_${Date.now()}`;
    onAddCategory({ key, label });
    setForm(current => ({ ...current, category: key }));
    setFormError('');
    resetCategoryInput();
  };

  const handleDeleteCategory = async () => {
    if (!selectedCategory?.custom) return;
    const usedBy = taskList.filter(t => t.category === selectedCategory.key);
    if (usedBy.length > 0) {
      await confirm({
        variant: 'info',
        alertOnly: true,
        title: 'Không thể xóa nhóm nghiệp vụ',
        message: <>Nhóm <strong>“{selectedCategory.label}”</strong> đang có {usedBy.length} task ({usedBy.map(t => t.code).join(', ')}). Hãy chuyển các task này sang nhóm khác trước khi xóa.</>
      });
      return;
    }
    const ok = await confirm({
      variant: 'danger',
      title: 'Xóa nhóm nghiệp vụ',
      message: <>Bạn có chắc muốn xóa nhóm <strong>“{selectedCategory.label}”</strong>?</>,
      confirmText: 'Xóa'
    });
    if (!ok) return;
    onDeleteCategory(selectedCategory.key);
    setForm(current => ({ ...current, category: 'THUONG_TRUC' }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const code = form.code.trim();
    const name = form.name.trim();
    if (!code || !name) return;
    if (isAddingCategory) {
      setFormError('Vui lòng Lưu hoặc Hủy nhóm nghiệp vụ mới đang nhập trước khi lưu task.');
      return;
    }
    const duplicate = !linkedTask && taskList.find(t => t.code.toLowerCase() === code.toLowerCase() && t.id !== initialTask?.id);
    if (duplicate) {
      setFormError(`Ký hiệu "${code}" đã được dùng cho task "${duplicate.name}". Chọn task đó trong gợi ý để dùng lại.`);
      setSuggestFor('code');
      return;
    }
    const payload = {
      code,
      name,
      category: form.category,
      triggerRT: form.triggerRT,
      delta: Number(form.delta),
      bgColor: form.bgColor,
      textColor: form.textColor,
      description: form.description.trim(),
      fixedDays: dayList(form.fixedDays),
      owners: ownerList(form.owners)
    };
    const ok = await confirm({
      variant: 'primary',
      title: linkedTask ? 'Dùng task đã có' : (initialTask ? 'Xác nhận lưu thay đổi' : 'Xác nhận thêm task'),
      message: linkedTask
        ? <>Thêm <strong>{taskOptionLabel(linkedTask)}</strong> vào cuối mỗi khối tuần?</>
        : <>Lưu task <strong>{code} – {name}</strong>?</>,
      confirmText: 'Lưu'
    });
    if (!ok) return;
    onSave(payload, linkedTask);
  };

  return (
    <div className="modal-overlay" onMouseDown={(event) => event.stopPropagation()}>
      <div className="modal-content" role="dialog" aria-modal="true">
        <div className="modal-header">
          <span>{title}</span>
          <button type="button" className="icon-btn" onClick={onClose} title="Đóng"><X size={18} /></button>
        </div>
        {hint && <p className="form-hint">{hint}</p>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Ký Hiệu Viết Tắt (trên Lịch):</label>
              <input
                className="form-input"
                required
                autoFocus
                value={form.code}
                onChange={(event) => {
                  setLinkedTask(null);
                  setForm({ ...form, code: event.target.value });
                  setFormError('');
                  setSuggestFor('code');
                }}
                onFocus={() => setSuggestFor('code')}
                placeholder="VD: RO, SN, TN..."
              />
              {suggestFor === 'code' && suggestions.length > 0 && (
                <SuggestList tasks={suggestions} onPick={applyTask} />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Tên Nghiệp Vụ / Công Việc:</label>
              <input
                className="form-input"
                required
                value={form.name}
                onChange={(event) => {
                  setLinkedTask(null);
                  setForm({ ...form, name: event.target.value });
                  setSuggestFor('name');
                }}
                onFocus={() => setSuggestFor('name')}
                placeholder="VD: Phòng khám ROBO"
              />
              {suggestFor === 'name' && suggestions.length > 0 && (
                <SuggestList tasks={suggestions} onPick={applyTask} />
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Nhóm Nghiệp Vụ:</label>
            <select
              className="form-select"
              value={isAddingCategory ? NEW_CATEGORY_OPTION : form.category}
              onChange={(event) => handleCategorySelect(event.target.value)}
            >
              {categories.map((c, i) => (
                <option key={c.key} value={c.key}>{i + 1}. {c.label}</option>
              ))}
              <option value={NEW_CATEGORY_OPTION}>＋ Thêm mới nghiệp vụ...</option>
            </select>
            {isAddingCategory && (
              <div className="inline-add-row">
                <input
                  className="form-input"
                  value={newCategoryName}
                  onChange={(event) => { setNewCategoryName(event.target.value); setFormError(''); }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') { event.preventDefault(); handleSaveNewCategory(); }
                    if (event.key === 'Escape') { event.preventDefault(); resetCategoryInput(); }
                  }}
                  placeholder="Nhập tên nhóm nghiệp vụ mới"
                />
                <button type="button" className="action-btn primary" onClick={handleSaveNewCategory}>Lưu</button>
                <button type="button" className="action-btn" onClick={resetCategoryInput}>Hủy</button>
              </div>
            )}
            {!isAddingCategory && selectedCategory?.custom && (
              <button type="button" className="link-btn danger" onClick={handleDeleteCategory}>
                <Trash2 size={13} /> Xóa nhóm “{selectedCategory.label}”
              </button>
            )}
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Nghỉ Ra Trực (RT) sáng hôm sau?</label>
              <select className="form-select" value={form.triggerRT ? 'YES' : 'NO'} onChange={(event) => setForm({ ...form, triggerRT: event.target.value === 'YES' })}>
                <option value="NO">Không</option>
                <option value="YES">Có – sáng hôm sau tự xếp RT</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Biến Động Quỹ Bù / Phép:</label>
              <select className="form-select" value={String(form.delta)} onChange={(event) => setForm({ ...form, delta: event.target.value })}>
                <option value="0">0 (Không biến động)</option>
                <option value="-0.5">-0.5 (Trừ 0.5 ngày Bù/Phép)</option>
                <option value="0.5">+0.5 (Cộng 0.5 ngày Bù)</option>
                <option value="1">+1.0 (Cộng 1.0 ngày Bù)</option>
              </select>
            </div>
          </div>
          <div className="form-hint">
            <strong>RT = Ra Trực</strong>: bác sĩ trực đêm được nghỉ bắt buộc buổi sáng hôm sau.
            Chọn “Có” cho các ca trực qua đêm (VD: VG – Vào Gác) để hệ thống tự điền RT vào sáng ngày kế tiếp.
          </div>

          <div className="form-group">
            <label className="form-label">Ngày cố định trong tuần:</label>
            <div className="choice-row" role="group" aria-label="Ngày cố định">
              {WEEKDAYS.map(day => (
                <button
                  key={day.id}
                  type="button"
                  className={form.fixedDays.includes(day.id) ? 'active' : ''}
                  aria-pressed={form.fixedDays.includes(day.id)}
                  onClick={() => setForm(current => ({
                    ...current,
                    fixedDays: current.fixedDays.includes(day.id)
                      ? current.fixedDays.filter(id => id !== day.id)
                      : [...current.fixedDays, day.id]
                  }))}
                >
                  {day.label}
                </button>
              ))}
            </div>
            <p className="form-hint">Chọn một hoặc nhiều ngày. Task này sẽ được giữ cố định vào các ngày đã chọn.</p>
          </div>

          <div className="form-group">
            <label className="form-label">Trách nhiệm:</label>
            <div className="choice-row owners" role="group" aria-label="Trách nhiệm">
              {staffList.map(person => (
                <button
                  key={person.id}
                  type="button"
                  className={form.owners.includes(person.id) ? 'active' : ''}
                  aria-pressed={form.owners.includes(person.id)}
                  title={person.name}
                  onClick={() => setForm(current => ({
                    ...current,
                    owners: current.owners.includes(person.id)
                      ? current.owners.filter(id => id !== person.id)
                      : [...current.owners, person.id]
                  }))}
                >
                  {person.shortName}
                </button>
              ))}
            </div>
            <p className="form-hint">Chọn người được quyền phụ trách task này. Có thể chọn nhiều người.</p>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Màu Nền Ô:</label>
              <input type="color" className="form-input" style={{ height: 40 }} value={form.bgColor} onChange={(event) => setForm({ ...form, bgColor: event.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Màu Chữ:</label>
              <input type="color" className="form-input" style={{ height: 40 }} value={form.textColor} onChange={(event) => setForm({ ...form, textColor: event.target.value })} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Mô Tả Chi Tiết Nghiệp Vụ <span className="optional-tag">(không bắt buộc)</span>:</label>
            <textarea
              className="form-input"
              rows={4}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="VD: Thời gian, địa điểm, yêu cầu chuyên môn, người phối hợp, lưu ý khi thực hiện..."
            />
          </div>

          {formError && <div className="form-error">{formError}</div>}

          <div className="modal-actions">
            <button type="button" className="action-btn" onClick={onClose}>Hủy</button>
            <button type="submit" className="action-btn primary">{submitLabel}</button>
          </div>
        </form>
      </div>
      {confirmDialog}
    </div>
  );
}

function SuggestList({ tasks, onPick }) {
  return (
    <div className="task-suggest" role="listbox">
      {tasks.map(task => (
        <button key={task.id} type="button" className="task-suggest-item" onMouseDown={(event) => event.preventDefault()} onClick={() => onPick(task)}>
          <span className="code-pill" style={{ background: task.bgColor, color: task.textColor }}>{task.code}</span>
          <span>{task.name}</span>
        </button>
      ))}
    </div>
  );
}
