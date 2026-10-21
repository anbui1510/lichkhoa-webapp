import React, { useEffect, useRef, useState } from 'react';
import {
  Paintbrush, Undo2, Redo2, Minus, Plus, Bold, Italic, Underline,
  Baseline, PaintBucket, AlignLeft, AlignCenter, AlignRight,
  AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd,
  WrapText, ChevronDown, Clock
} from 'lucide-react';
import { COLOR_ROWS, DEFAULT_FONT, ZOOM_STEPS, cleanStyle, expandSharedTaskStyles, pushFormatUndo } from '../logic/cellFormat';
import { DAY_SESSIONS, normalizeDaySessions } from '../logic/monthSchedule';

function FreezeIcon() {
  return (
    <svg className="tb-freeze-icon" width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="1.15" y="1.15" width="15.7" height="15.7" rx="1.3" fill="none" stroke="currentColor" strokeWidth="1.35" />
      <path d="M1.15 6.15h15.7M1.15 11.15h15.7M6.15 1.15v15.7M11.85 6.15v10.7" fill="none" stroke="currentColor" strokeWidth="1.15" />
      <rect x="1.7" y="1.7" width="4.15" height="14.6" fill="currentColor" opacity="0.28" />
    </svg>
  );
}

function keepGridSelection(event) {
  const tag = event.target?.tagName;
  if (tag === 'SELECT' || tag === 'INPUT' || event.target?.closest?.('.session-menu')) return;
  event.preventDefault();
}

export function SheetToolbar({
  bridge,
  patchRef,
  formatCtl,
  painting,
  setPainting,
  zoom,
  onZoom,
  activeStyle,
  onActiveStyle,
  daySessions,
  onDaySessions,
  onFreeze
}) {
  const [menu, setMenu] = useState(null);
  const barRef = useRef(null);
  const style = activeStyle || {};

  useEffect(() => {
    if (!menu) return undefined;
    const close = (event) => {
      if (!barRef.current?.contains(event.target)) setMenu(null);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [menu]);

  useEffect(() => {
    if (!painting) return undefined;
    const cancel = (event) => {
      if (event.key === 'Escape') {
        formatCtl.current.armed = false;
        setPainting(false);
      }
    };
    window.addEventListener('keydown', cancel);
    return () => window.removeEventListener('keydown', cancel);
  }, [painting, formatCtl, setPainting]);

  const withSelection = (mutator) => {
    const hot = bridge.current.hot;
    const describe = bridge.current.describe;
    if (!hot || !describe) return;
    const entries = bridge.current.getSelectedEntries();
    if (!entries.length) return;
    const prev = {};
    const next = {};
    entries.forEach((entry) => {
      prev[entry.key] = entry.style ? { ...entry.style } : null;
      next[entry.key] = cleanStyle(mutator({ ...(entry.style || {}) }));
    });
    expandSharedTaskStyles(bridge.current.styles || {}, prev, next);
    pushFormatUndo(hot, prev, next, (map) => patchRef.current(map));
    const active = bridge.current.getActiveEntry?.();
    if (active && Object.prototype.hasOwnProperty.call(next, active.key)) {
      onActiveStyle?.(next[active.key]);
    }
    setMenu(null);
  };

  const every = (prop, value) => {
    const entries = bridge.current.getSelectedEntries?.() || [];
    return entries.length > 0 && entries.every(entry => (value == null ? entry.style?.[prop] : entry.style?.[prop] === value));
  };

  const undo = () => bridge.current.hot?.getPlugin?.('undoRedo')?.undo?.();
  const redo = () => bridge.current.hot?.getPlugin?.('undoRedo')?.redo?.();

  const copyFormat = () => {
    const entry = bridge.current.getActiveEntry?.();
    formatCtl.current = { armed: true, style: entry?.style ? { ...entry.style } : {} };
    setPainting(true);
    setMenu(null);
  };

  const fontSize = style.fontSize || DEFAULT_FONT;

  const readFreeze = () => {
    const settings = bridge.current.hot?.getSettings?.() || {};
    return {
      rows: Number(settings.fixedRowsTop) || 0,
      cols: Number(settings.fixedColumnsStart ?? settings.fixedColumnsLeft) || 0
    };
  };

  const selectionCount = (axis) => {
    const hot = bridge.current.hot;
    const selected = hot?.getSelectedLast?.();
    if (!hot || !selected) return null;
    const start = selected[axis === 'row' ? 0 : 1];
    const end = selected[axis === 'row' ? 2 : 3];
    if (start == null || start < 0) return null;
    const index = Math.max(start, end ?? start);
    const limit = axis === 'row' ? hot.countRows() : hot.countCols();
    const count = Math.max(0, Math.min(index + 1, limit));
    const visual = axis === 'row' ? hot.getRowHeader?.(index) : count;
    return { count, label: visual == null || visual === '' ? count : visual };
  };

  const applyFreeze = (patch) => {
    const hot = bridge.current.hot;
    if (!hot) return;
    const current = readFreeze();
    const rows = Math.max(0, Math.min(patch.rows ?? current.rows, hot.countRows()));
    const cols = Math.max(0, Math.min(patch.cols ?? current.cols, hot.countCols()));
    hot.updateSettings({ fixedRowsTop: rows, fixedColumnsStart: cols });
    onFreeze?.({ rows, cols });
    setMenu(null);
  };

  const frozen = menu === 'freeze' ? readFreeze() : { rows: 0, cols: 0 };
  const rowTarget = menu === 'freeze' ? selectionCount('row') : null;
  const colTarget = menu === 'freeze' ? selectionCount('col') : null;
  const selectedSessions = normalizeDaySessions(daySessions);
  const toggleSession = (id) => {
    const next = selectedSessions.includes(id)
      ? selectedSessions.filter(item => item !== id)
      : [...selectedSessions, id];
    if (!next.length) return;
    onDaySessions?.(next);
  };

  return (
    <div className={`sheet-toolbar ${painting ? 'is-painting' : ''}`} ref={barRef} onMouseDown={keepGridSelection}>
      <button type="button" className={`tb-btn ${painting ? 'active' : ''}`} title="Sao chép định dạng" onClick={copyFormat}>
        <Paintbrush size={16} />
      </button>
      <span className="tb-sep" />
      <button type="button" className="tb-btn" title="Hoàn tác (Ctrl+Z)" onClick={undo}>
        <Undo2 size={16} />
      </button>
      <button type="button" className="tb-btn" title="Làm lại (Ctrl+Y)" onClick={redo}>
        <Redo2 size={16} />
      </button>
      <span className="tb-sep" />
      <label className="tb-zoom" title="Thu phóng">
        <select value={zoom} onChange={(event) => onZoom(Number(event.target.value))} aria-label="Thu phóng">
          {ZOOM_STEPS.map(step => (
            <option key={step} value={step}>{step}%</option>
          ))}
        </select>
      </label>
      <span className="tb-sep" />
      <button
        type="button"
        className="tb-btn"
        title="Giảm cỡ chữ"
        onClick={() => withSelection(current => ({ ...current, fontSize: Math.max(8, (current.fontSize || DEFAULT_FONT) - 1) }))}
      >
        <Minus size={14} />
      </button>
      <span className="tb-font-size" title="Cỡ chữ">{fontSize}</span>
      <button
        type="button"
        className="tb-btn"
        title="Tăng cỡ chữ"
        onClick={() => withSelection(current => ({ ...current, fontSize: Math.min(36, (current.fontSize || DEFAULT_FONT) + 1) }))}
      >
        <Plus size={14} />
      </button>
      <span className="tb-sep" />
      <button type="button" className={`tb-btn ${style.bold ? 'active' : ''}`} title="In đậm" onClick={() => withSelection(current => ({ ...current, bold: !every('bold') }))}>
        <Bold size={16} />
      </button>
      <button type="button" className={`tb-btn ${style.italic ? 'active' : ''}`} title="In nghiêng" onClick={() => withSelection(current => ({ ...current, italic: !every('italic') }))}>
        <Italic size={16} />
      </button>
      <button type="button" className={`tb-btn ${style.underline ? 'active' : ''}`} title="Gạch dưới" onClick={() => withSelection(current => ({ ...current, underline: !every('underline') }))}>
        <Underline size={16} />
      </button>
      <ColorButton
        title="Màu văn bản"
        icon={<Baseline size={16} />}
        marker={style.color || '#f8fafc'}
        open={menu === 'text'}
        onToggle={() => setMenu(menu === 'text' ? null : 'text')}
        onPick={(color) => withSelection(current => ({ ...current, color: color || undefined }))}
      />
      <ColorButton
        title="Màu ô"
        icon={<PaintBucket size={16} />}
        marker={style.bg || 'transparent'}
        open={menu === 'fill'}
        onToggle={() => setMenu(menu === 'fill' ? null : 'fill')}
        onPick={(color) => withSelection(current => ({ ...current, bg: color || undefined }))}
      />
      <span className="tb-sep" />
      <MenuButton
        title="Căn ngang"
        open={menu === 'h'}
        onToggle={() => setMenu(menu === 'h' ? null : 'h')}
        icon={style.hAlign === 'left' ? <AlignLeft size={16} /> : style.hAlign === 'right' ? <AlignRight size={16} /> : <AlignCenter size={16} />}
      >
        <button type="button" onClick={() => withSelection(current => ({ ...current, hAlign: 'left' }))}><AlignLeft size={15} /> Căn trái</button>
        <button type="button" onClick={() => withSelection(current => ({ ...current, hAlign: 'center' }))}><AlignCenter size={15} /> Căn giữa</button>
        <button type="button" onClick={() => withSelection(current => ({ ...current, hAlign: 'right' }))}><AlignRight size={15} /> Căn phải</button>
      </MenuButton>
      <MenuButton
        title="Căn dọc"
        open={menu === 'v'}
        onToggle={() => setMenu(menu === 'v' ? null : 'v')}
        icon={style.vAlign === 'top' ? <AlignVerticalJustifyStart size={16} /> : style.vAlign === 'bottom' ? <AlignVerticalJustifyEnd size={16} /> : <AlignVerticalJustifyCenter size={16} />}
      >
        <button type="button" onClick={() => withSelection(current => ({ ...current, vAlign: 'top' }))}><AlignVerticalJustifyStart size={15} /> Đầu</button>
        <button type="button" onClick={() => withSelection(current => ({ ...current, vAlign: 'middle' }))}><AlignVerticalJustifyCenter size={15} /> Giữa</button>
        <button type="button" onClick={() => withSelection(current => ({ ...current, vAlign: 'bottom' }))}><AlignVerticalJustifyEnd size={15} /> Dưới cùng</button>
      </MenuButton>
      <MenuButton
        title="Xuống dòng"
        open={menu === 'w'}
        onToggle={() => setMenu(menu === 'w' ? null : 'w')}
        icon={<WrapText size={16} />}
      >
        <button type="button" onClick={() => withSelection(current => ({ ...current, wrap: 'overflow' }))}>Tràn</button>
        <button type="button" onClick={() => withSelection(current => ({ ...current, wrap: 'wrap' }))}>Xuống dòng</button>
        <button type="button" onClick={() => withSelection(current => ({ ...current, wrap: 'clip' }))}>Cắt bớt</button>
      </MenuButton>
      <span className="tb-sep" />
      <div className="tb-pop">
        <button
          type="button"
          className={`tb-btn tb-session ${menu === 'freeze' ? 'active' : ''}`}
          title="Cố định hàng hoặc cột"
          onClick={() => setMenu(menu === 'freeze' ? null : 'freeze')}
        >
          <FreezeIcon /> Cố định
        </button>
        {menu === 'freeze' && (
          <div className="tb-menu tb-freeze" role="menu">
            <div className="tb-menu-note">Đang ghim {frozen.rows} hàng, {frozen.cols} cột</div>
            <div className="tb-menu-label">Hàng</div>
            <button type="button" className={frozen.rows === 0 ? 'is-current' : ''} onClick={() => applyFreeze({ rows: 0 })}>Không ghim hàng</button>
            <button type="button" className={frozen.rows === 1 ? 'is-current' : ''} onClick={() => applyFreeze({ rows: 1 })}>1 hàng</button>
            <button type="button" className={frozen.rows === 2 ? 'is-current' : ''} onClick={() => applyFreeze({ rows: 2 })}>2 hàng</button>
            <button type="button" disabled={!rowTarget} onClick={() => applyFreeze({ rows: rowTarget.count })}>
              {rowTarget ? `Đến hàng ${rowTarget.label}` : 'Đến hàng đang chọn'}
            </button>
            <div className="tb-menu-label">Cột</div>
            <button type="button" className={frozen.cols === 0 ? 'is-current' : ''} onClick={() => applyFreeze({ cols: 0 })}>Không ghim cột</button>
            <button type="button" className={frozen.cols === 1 ? 'is-current' : ''} onClick={() => applyFreeze({ cols: 1 })}>1 cột</button>
            <button type="button" className={frozen.cols === 2 ? 'is-current' : ''} onClick={() => applyFreeze({ cols: 2 })}>2 cột</button>
            <button type="button" disabled={!colTarget} onClick={() => applyFreeze({ cols: colTarget.count })}>
              {colTarget ? `Đến cột ${colTarget.label}` : 'Đến cột đang chọn'}
            </button>
          </div>
        )}
      </div>
      <div className="session-menu tb-pop">
        <button
          type="button"
          className={`tb-btn tb-session ${menu === 'sessions' ? 'active' : ''}`}
          title="Thêm buổi"
          onClick={() => setMenu(menu === 'sessions' ? null : 'sessions')}
        >
          <Clock size={15} /> Buổi
        </button>
        {menu === 'sessions' && (
          <div className="session-menu-list" role="menu">
            {DAY_SESSIONS.map(item => (
              <label key={item.id}>
                <input
                  type="checkbox"
                  checked={selectedSessions.includes(item.id)}
                  disabled={selectedSessions.length === 1 && selectedSessions.includes(item.id)}
                  onChange={() => toggleSession(item.id)}
                />
                {item.label}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MenuButton({ title, icon, open, onToggle, children }) {
  return (
    <div className="tb-pop">
      <button type="button" className={`tb-btn tb-caret ${open ? 'active' : ''}`} title={title} onClick={onToggle}>
        {icon}
        <ChevronDown size={12} />
      </button>
      {open && <div className="tb-menu">{children}</div>}
    </div>
  );
}

function ColorButton({ title, icon, marker, open, onToggle, onPick }) {
  return (
    <div className="tb-pop">
      <button type="button" className={`tb-btn tb-color ${open ? 'active' : ''}`} title={title} onClick={onToggle}>
        {icon}
        <i style={{ background: marker }} />
      </button>
      {open && (
        <div className="tb-menu tb-colors">
          <button type="button" className="tb-reset" onClick={() => onPick(null)}>Đặt lại</button>
          {COLOR_ROWS.map((row, index) => (
            <div key={index} className="tb-color-row">
              {row.map(color => (
                <button
                  key={color}
                  type="button"
                  className="tb-swatch"
                  style={{ background: color }}
                  title={color}
                  onClick={() => onPick(color)}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
