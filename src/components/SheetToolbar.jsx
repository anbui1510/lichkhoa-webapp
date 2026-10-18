import React, { useEffect, useRef, useState } from 'react';
import {
  Paintbrush, Undo2, Redo2, Minus, Plus, Bold, Italic, Underline,
  Baseline, PaintBucket, AlignLeft, AlignCenter, AlignRight,
  AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd,
  WrapText, ChevronDown, Clock
} from 'lucide-react';
import { COLOR_ROWS, DEFAULT_FONT, ZOOM_STEPS, cleanStyle, expandSharedTaskStyles, pushFormatUndo } from '../logic/cellFormat';
import { DAY_SESSIONS, normalizeDaySessions } from '../logic/monthSchedule';

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
  onDaySessions
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
