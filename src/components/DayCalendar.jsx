import React, { useEffect, useRef, useState } from 'react';
import { useConfirm } from './ConfirmDialog';

const WEEKDAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
const LEAVE_TYPES = [
  { id: 'P', label: 'Nghỉ Phép (P)' },
  { id: 'CT', label: 'Công tác (CT)' },
  { id: 'H', label: 'Học (H)' }
];
const SESSIONS = [
  { id: 'S', label: 'Sáng' },
  { id: 'C', label: 'Chiều' }
];

function monthCells(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  const first = new Date(year, month - 1, 1);
  const lead = (first.getDay() + 6) % 7;
  const count = new Date(year, month, 0).getDate();
  const cells = [];
  for (let index = 0; index < lead; index += 1) cells.push(null);
  for (let day = 1; day <= count; day += 1) {
    cells.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }
  while (cells.length % 7) cells.push(null);
  return cells;
}

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function covers(entry, iso) {
  const start = entry.from || entry.iso;
  const end = entry.to || entry.from || entry.iso;
  return Boolean(start && end && iso >= start && iso <= end);
}

function ordered(entries, iso) {
  return (entries || [])
    .filter(item => covers(item, iso))
    .slice()
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0) || String(a.id).localeCompare(String(b.id)));
}

function sessionIds(entry) {
  const raw = Array.isArray(entry?.sessions) && entry.sessions.length
    ? entry.sessions
    : [entry?.session === 'C' ? 'C' : 'S'];
  return SESSIONS.map(item => item.id).filter(id => raw.includes(id));
}

function sessionText(entry) {
  const ids = sessionIds(entry);
  return (ids.length ? ids : ['S']).map(id => (id === 'C' ? 'Chiều' : 'Sáng')).join(', ');
}

function defaultRange(monthKey) {
  const today = todayIso();
  const start = today.startsWith(monthKey) ? today : `${monthKey}-01`;
  return { from: start, to: start };
}

function blankLong(monthKey) {
  const range = defaultRange(monthKey);
  return { ...blankForm(range.from, 'leave'), long: true, from: range.from, to: range.to };
}

function blankForm(iso, mode) {
  return {
    iso,
    from: iso,
    to: iso,
    shortName: '',
    type: mode === 'leave' ? 'P' : '',
    topic: '',
    note: '',
    session: 'S',
    sessions: ['S']
  };
}

export function DayCalendar({ mode, monthKey, entries, staffList, onSave, onDelete, longNonce = 0 }) {
  const [draft, setDraft] = useState(null);
  const [confirm, confirmDialog] = useConfirm();
  const seenLong = useRef(0);
  const cells = monthCells(monthKey);
  const today = todayIso();
  const leave = mode === 'leave';
  const pickedSessions = sessionIds(draft);

  useEffect(() => {
    if (!longNonce || longNonce === seenLong.current) return;
    seenLong.current = longNonce;
    setDraft(blankLong(monthKey));
  }, [longNonce, monthKey]);

  const toggleSession = (id) => {
    const next = pickedSessions.includes(id)
      ? pickedSessions.filter(item => item !== id)
      : [...pickedSessions, id];
    if (!next.length) return;
    setDraft({ ...draft, sessions: next, session: next[0] });
  };

  const removeEntry = async (row) => {
    if (!leave) {
      onDelete(row.id);
      setDraft(current => (current?.id === row.id ? null : current));
      return;
    }
    const ok = await confirm({
      variant: 'danger',
      title: 'Xóa đăng ký nghỉ',
      message: `Xóa đăng ký của ${row.shortName || 'mục này'}?`,
      confirmText: 'Xóa',
      cancelText: 'Hủy'
    });
    if (!ok) return;
    onDelete(row.id);
    setDraft(current => (current?.id === row.id ? null : current));
  };

  const commit = (event) => {
    event.preventDefault();
    const shortName = draft.shortName.trim();
    if (!shortName) return;
    if (!leave && !draft.topic.trim()) return;
    const sessions = sessionIds(draft);
    if (leave && !sessions.length) return;
    const from = leave ? (draft.from || draft.iso) : undefined;
    const to = leave ? (draft.to || draft.from || draft.iso) : undefined;
    if (leave && (!from || !to || from > to)) return;
    onSave({
      id: draft.id || `${leave ? 'leave' : 'study'}_${Date.now()}`,
      iso: leave ? from : draft.iso,
      from,
      to,
      shortName,
      type: leave ? draft.type : '',
      topic: leave ? '' : draft.topic.trim(),
      note: draft.note.trim(),
      session: leave ? sessions[0] : (draft.session === 'C' ? 'C' : 'S'),
      sessions: leave ? sessions : undefined,
      createdAt: draft.createdAt || Date.now()
    });
    setDraft(null);
  };

  return (
    <div className="day-cal">
      <div className="day-cal-week">
        {WEEKDAYS.map(label => <div key={label}>{label}</div>)}
      </div>
      <div className="day-cal-grid">
        {cells.map((iso, index) => {
          if (!iso) return <div key={`empty-${index}`} className="day-cal-cell is-empty" />;
          const rows = ordered(entries, iso);
          const day = Number(iso.slice(8));
          return (
            <div key={iso} className={`day-cal-cell ${iso === today ? 'is-today' : ''}`}>
              <div className="day-cal-num">{day}</div>
              <div className="day-cal-rows">
                {rows.map(row => (
                  <div key={`${row.id}-${iso}`} className={`day-cal-row type-${leave ? row.type : 'study'}`}>
                    <button type="button" className="day-cal-row-main" onClick={() => setDraft({
                      ...row,
                      from: row.from || row.iso,
                      to: row.to || row.from || row.iso
                    })}>
                      <b>{row.shortName}</b>
                      <span>{leave ? row.type : row.topic}</span>
                      <span>{leave ? sessionText(row) : (row.session === 'C' ? 'Chiều' : 'Sáng')}</span>
                      {row.note ? <span className="day-cal-note">{row.note}</span> : null}
                    </button>
                    <button type="button" className="day-cal-remove" title="Xóa" onClick={() => removeEntry(row)}>×</button>
                  </div>
                ))}
              </div>
              <button type="button" className="day-cal-add" title="Thêm" onClick={() => setDraft(blankForm(iso, mode))}>+</button>
            </div>
          );
        })}
      </div>

      {draft && (
        <div className="modal-overlay" onMouseDown={() => setDraft(null)}>
          <form className="modal-content day-cal-form" onMouseDown={(event) => event.stopPropagation()} onSubmit={commit}>
            <div className="modal-header">
              <span>{draft.id ? 'Sửa đăng ký' : (draft.long ? 'Nghỉ dài hạn' : (leave ? 'Đăng ký nghỉ' : 'Thêm lịch học'))}</span>
              <button type="button" className="day-cal-close" onClick={() => setDraft(null)}>×</button>
            </div>
            {leave && (
              <div className="day-cal-range">
                <label className="form-group">
                  Từ ngày
                  <input type="date" value={draft.from || ''} required onChange={(event) => setDraft({ ...draft, from: event.target.value })} />
                </label>
                <label className="form-group">
                  Đến ngày
                  <input type="date" value={draft.to || ''} min={draft.from || undefined} required onChange={(event) => setDraft({ ...draft, to: event.target.value })} />
                </label>
              </div>
            )}
            <label className="form-group">
              Tên viết tắt
              <input
                list="day-cal-staff"
                value={draft.shortName}
                onChange={(event) => setDraft({ ...draft, shortName: event.target.value })}
                required
                autoFocus
              />
              <datalist id="day-cal-staff">
                {staffList.map(person => <option key={person.id} value={person.shortName}>{person.name}</option>)}
              </datalist>
            </label>
            {leave ? (
              <label className="form-group">
                Loại nghỉ phép
                <select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })}>
                  {LEAVE_TYPES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </label>
            ) : (
              <label className="form-group">
                Nội dung học
                <input value={draft.topic} onChange={(event) => setDraft({ ...draft, topic: event.target.value })} required />
              </label>
            )}
            <label className="form-group">
              Ghi chú
              <input value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} />
            </label>
            {leave ? (
              <div className="form-group">
                Buổi
                <div className="session-choice" role="group" aria-label="Buổi">
                  {SESSIONS.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      className={pickedSessions.includes(item.id) ? 'active' : ''}
                      aria-pressed={pickedSessions.includes(item.id)}
                      onClick={() => toggleSession(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <label className="form-group">
                Buổi
                <select value={draft.session} onChange={(event) => setDraft({ ...draft, session: event.target.value })}>
                  {SESSIONS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </label>
            )}
            <div className="day-cal-actions">
              {draft.id && (
                <button type="button" className="action-btn" onClick={() => removeEntry(draft)}>Xóa</button>
              )}
              <button type="submit" className="action-btn primary">Lưu</button>
            </div>
          </form>
        </div>
      )}
      {confirmDialog}
    </div>
  );
}
