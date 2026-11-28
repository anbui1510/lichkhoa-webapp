import React, { useState } from 'react';
import {
  WEEK_SHORT,
  addDays,
  cleanRepeat,
  monthlyDateLabel,
  monthlyWeekdayLabel,
  presetRule,
  repeatPresetOf,
  repeatSummary,
  weeklyLabel,
  weekdayIndex,
  yearlyLabel,
} from '../logic/leaveRepeat';

/**
 * Chọn kiểu lặp lại (giống lịch nghỉ) — dùng cho khóa lịch tháng.
 */
export function LockRepeatFields({ anchorIso, repeat, onChange, disabled = false }) {
  const fromIso = anchorIso || new Date().toISOString().slice(0, 10);
  const repeatValue = repeat?.freq ? (repeat.preset || 'custom') : 'none';
  const [repeatEdit, setRepeatEdit] = useState(null);

  const chooseRepeat = (value) => {
    if (value === 'custom') {
      const current = repeat?.freq ? repeat : presetRule('weekly', fromIso);
      setRepeatEdit({
        freq: current.freq || 'week',
        interval: current.interval || 1,
        byDay: current.byDay?.length ? [...current.byDay] : [weekdayIndex(fromIso)],
        monthMode: current.monthMode || 'date',
        end: current.end || 'never',
        until: current.until || addDays(fromIso, 30),
        count: current.count || 13,
      });
      return;
    }
    onChange?.(value === 'none' ? null : presetRule(value, fromIso));
  };

  const finishRepeat = () => {
    let next = { ...repeatEdit, preset: 'custom' };
    if (next.end === 'until' && (!next.until || next.until < fromIso)) next = { ...next, until: fromIso };
    const cleaned = cleanRepeat(next, fromIso);
    if (cleaned) cleaned.preset = repeatPresetOf(cleaned, fromIso);
    onChange?.(cleaned);
    setRepeatEdit(null);
  };

  const toggleRepeatDay = (day) => {
    const current = repeatEdit.byDay || [];
    const next = current.includes(day) ? current.filter((item) => item !== day) : [...current, day];
    setRepeatEdit({ ...repeatEdit, byDay: next.length ? next : [day] });
  };

  return (
  <>
      <div className="form-group">
        Lặp lại
        <select value={repeatValue} disabled={disabled} onChange={(event) => chooseRepeat(event.target.value)}>
          <option value="none">Không lặp lại</option>
          <option value="daily">Hàng ngày</option>
          <option value="weekly">{weeklyLabel(fromIso)}</option>
          <option value="monthly">{monthlyWeekdayLabel(fromIso)}</option>
          <option value="yearly">{yearlyLabel(fromIso)}</option>
          <option value="weekdays">Mỗi ngày trong tuần (từ thứ Hai tới thứ Sáu)</option>
          <option value="custom">Tùy chỉnh...</option>
        </select>
        {repeat?.freq ? (
          <p className="day-cal-study-long-hint">{repeatSummary(repeat, fromIso)}</p>
        ) : null}
        {repeat?.freq ? (
          <button type="button" className="day-cal-repeat-edit" disabled={disabled} onClick={() => chooseRepeat('custom')}>
            Sửa cách lặp
          </button>
        ) : null}
      </div>

      {repeatEdit && (
        <div className="modal-overlay repeat-overlay" onMouseDown={() => setRepeatEdit(null)}>
          <div className="modal-content day-cal-form repeat-dialog" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <span>Lặp lại tùy chỉnh</span>
              <button type="button" className="day-cal-close" onClick={() => setRepeatEdit(null)}>×</button>
            </div>
            <div className="form-group">
              Lặp lại mỗi
              <div className="repeat-every">
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={repeatEdit.interval}
                  onChange={(event) => setRepeatEdit({ ...repeatEdit, interval: Math.max(1, Number(event.target.value) || 1) })}
                />
                <select
                  value={repeatEdit.freq}
                  onChange={(event) => {
                    const freq = event.target.value;
                    setRepeatEdit({
                      ...repeatEdit,
                      freq,
                      byDay: freq === 'week' && !(repeatEdit.byDay || []).length ? [weekdayIndex(fromIso)] : repeatEdit.byDay,
                    });
                  }}
                >
                  <option value="day">ngày</option>
                  <option value="week">tuần</option>
                  <option value="month">tháng</option>
                  <option value="year">năm</option>
                </select>
              </div>
            </div>
            {repeatEdit.freq === 'week' && (
              <div className="form-group">
                Lặp lại vào
                <div className="repeat-days" role="group" aria-label="Ngày trong tuần">
                  {WEEK_SHORT.map((label, day) => (
                    <button
                      key={label}
                      type="button"
                      className={(repeatEdit.byDay || []).includes(day) ? 'active' : ''}
                      aria-pressed={(repeatEdit.byDay || []).includes(day)}
                      onClick={() => toggleRepeatDay(day)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {repeatEdit.freq === 'month' && (
              <label className="form-group">
                Cách lặp trong tháng
                <select value={repeatEdit.monthMode} onChange={(event) => setRepeatEdit({ ...repeatEdit, monthMode: event.target.value })}>
                  <option value="date">{monthlyDateLabel(fromIso)}</option>
                  <option value="weekday">{monthlyWeekdayLabel(fromIso)}</option>
                </select>
              </label>
            )}
            <fieldset className="form-group repeat-end">
              <legend>Kết thúc</legend>
              <label>
                <input type="radio" name="month-lock-repeat-end" checked={repeatEdit.end === 'never'} onChange={() => setRepeatEdit({ ...repeatEdit, end: 'never' })} />
                Không bao giờ
              </label>
              <label>
                <input type="radio" name="month-lock-repeat-end" checked={repeatEdit.end === 'until'} onChange={() => setRepeatEdit({ ...repeatEdit, end: 'until' })} />
                Vào ngày
                <input
                  type="date"
                  value={repeatEdit.until || ''}
                  min={fromIso}
                  disabled={repeatEdit.end !== 'until'}
                  onChange={(event) => setRepeatEdit({ ...repeatEdit, until: event.target.value, end: 'until' })}
                />
              </label>
              <label>
                <input type="radio" name="month-lock-repeat-end" checked={repeatEdit.end === 'count'} onChange={() => setRepeatEdit({ ...repeatEdit, end: 'count' })} />
                Sau
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={repeatEdit.count}
                  disabled={repeatEdit.end !== 'count'}
                  onChange={(event) => setRepeatEdit({ ...repeatEdit, count: Math.max(1, Number(event.target.value) || 1), end: 'count' })}
                />
                <span>lần</span>
              </label>
            </fieldset>
            <div className="day-cal-actions">
              <button type="button" className="action-btn" onClick={() => setRepeatEdit(null)}>Hủy</button>
              <button type="button" className="action-btn primary" onClick={finishRepeat}>Xong</button>
            </div>
          </div>
        </div>
      )}
  </>
  );
}