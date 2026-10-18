import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, Copy, FileSpreadsheet } from 'lucide-react';
import { DEPARTMENT_TEMPLATES } from '../store/dbStore';
import { useConfirm } from './ConfirmDialog';
import { TaskEditorModal } from './TaskEditorModal';

export function TaskManager({
  taskList,
  categories,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onLoadTemplate,
  onAddCategory,
  onDeleteCategory,
  staffList = [],
  autoOpenAdd,
  onAutoOpenHandled
}) {
  const [editing, setEditing] = useState(null);
  const [confirm, confirmDialog] = useConfirm();
  const isNew = editing === 'NEW' || editing?.copyOf;

  const categoryLabel = (key) => {
    const idx = categories.findIndex(c => c.key === key);
    return idx >= 0 ? `${idx + 1}. ${categories[idx].label}` : key;
  };

  useEffect(() => {
    if (autoOpenAdd) {
      setEditing('NEW');
      onAutoOpenHandled?.();
    }
  }, [autoOpenAdd]);

  const handleSave = (payload, linkedTask) => {
    if (isNew && linkedTask) {
      onUpdateTask({ ...linkedTask, ...payload });
    } else if (isNew) {
      onAddTask({ id: `task_${Date.now()}`, ...payload });
    } else {
      onUpdateTask({ ...editing, ...payload });
    }
    setEditing(null);
  };

  const uniqueCode = (code) => {
    const base = String(code || '').trim();
    const taken = new Set(taskList.map(task => task.code.toLowerCase()));
    if (!taken.has(base.toLowerCase())) return base;
    for (let i = 2; i < 100; i += 1) {
      const candidate = `${base}${i}`;
      if (!taken.has(candidate.toLowerCase())) return candidate;
    }
    return `${base}-${Date.now()}`;
  };

  const handleCopy = (task) => {
    setEditing({
      copyOf: task.id,
      sourceCode: task.code,
      code: uniqueCode(task.code),
      name: task.name,
      category: task.category,
      triggerRT: task.triggerRT,
      delta: task.delta,
      bgColor: task.bgColor,
      textColor: task.textColor,
      description: task.description,
      fixedDays: task.fixedDays,
      owners: task.owners
    });
  };

  const handleDelete = async (t) => {
    const ok = await confirm({
      variant: 'danger',
      title: 'Xác nhận xóa task',
      message: <>Bạn có chắc muốn xóa task <strong>{t.code} – {t.name}</strong>? Thao tác này không thể hoàn tác.</>,
      confirmText: 'Xóa'
    });
    if (ok) onDeleteTask(t.id);
  };

  const handleLoadTemplate = async (template, label) => {
    const ok = await confirm({
      variant: 'danger',
      title: `Nạp mẫu ${label}`,
      message: <>Toàn bộ <strong>{taskList.length} task</strong> hiện tại sẽ bị thay thế bằng danh mục mẫu của {label}. Tiếp tục?</>,
      confirmText: 'Nạp mẫu'
    });
    if (ok) onLoadTemplate(template.tasks);
  };

  return (
    <div className="view-container">
      <div className="section-header">
        <div>
          <h2 className="view-title">Quản Lý Danh Mục Task &amp; Nghiệp Vụ</h2>
          <div className="sub-header-info">{taskList.length} task • {categories.length} nhóm nghiệp vụ</div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="action-btn primary" onClick={() => setEditing('NEW')}>
            <Plus size={16} /> Thêm Task Mới
          </button>
          <button className="action-btn" onClick={() => handleLoadTemplate(DEPARTMENT_TEMPLATES.TIM_MACH, 'Khoa Tim Mạch')}>
            <FileSpreadsheet size={16} /> Nạp Mẫu Khoa Tim Mạch
          </button>
          <button className="action-btn" onClick={() => handleLoadTemplate(DEPARTMENT_TEMPLATES.TIEU_HOA, 'Khoa Tiêu Hóa')}>
            <FileSpreadsheet size={16} /> Nạp Mẫu Khoa Tiêu Hóa
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ký Hiệu</th>
              <th>Tên Nghiệp Vụ</th>
              <th>Nhóm Nghiệp Vụ</th>
              <th title="Ra Trực: sáng hôm sau tự động được nghỉ">Sinh RT Hôm Sau</th>
              <th>Biến Động Quỹ</th>
              <th>Hiển Thị Màu</th>
              <th className="col-actions">Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {taskList.map(t => (
              <tr key={t.id}>
                <td><span className="code-pill">{t.code}</span></td>
                <td>
                  <div style={{ fontWeight: 500 }}>{t.name}</div>
                  {t.description && <div className="task-desc" title={t.description}>{t.description}</div>}
                </td>
                <td className="text-muted-cell">{categoryLabel(t.category)}</td>
                <td>{t.triggerRT ? <span className="num-positive">Có</span> : <span className="text-muted-cell">Không</span>}</td>
                <td>{t.delta ? `${t.delta > 0 ? '+' : ''}${t.delta} ngày` : '0'}</td>
                <td>
                  <span className="color-preview" style={{ background: t.bgColor || '#374151', color: t.textColor || '#fff' }}>
                    {t.code} - {t.name}
                  </span>
                </td>
                <td className="col-actions">
                  <button className="icon-btn edit" title="Sửa task" onClick={() => setEditing(t)}>
                    <Pencil size={15} />
                  </button>
                  <button className="icon-btn" title="Sao chép task" onClick={() => handleCopy(t)}>
                    <Copy size={15} />
                  </button>
                  <button className="icon-btn danger" title="Xóa task" onClick={() => handleDelete(t)}>
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {taskList.length === 0 && (
              <tr>
                <td colSpan={7} className="empty-cell">Chưa có task nào. Bấm “Thêm Task Mới” hoặc nạp danh mục mẫu.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <TaskEditorModal
          title={editing === 'NEW' ? 'Thêm Nghiệp Vụ / Task Mới' : (editing.copyOf ? `Sao chép Task: ${editing.sourceCode}` : `Sửa Task: ${editing.code}`)}
          hint={editing?.copyOf ? 'Bản sao giữ nguyên thông tin task gốc. Đổi ký hiệu nếu cần, rồi lưu thành task mới.' : undefined}
          initialTask={editing === 'NEW' ? null : editing}
          submitLabel={isNew ? 'Lưu Task' : 'Lưu Thay Đổi'}
          taskList={taskList}
          categories={categories}
          staffList={staffList}
          onClose={() => setEditing(null)}
          onSave={handleSave}
          onAddCategory={onAddCategory}
          onDeleteCategory={onDeleteCategory}
        />
      )}

      {confirmDialog}
    </div>
  );
}
