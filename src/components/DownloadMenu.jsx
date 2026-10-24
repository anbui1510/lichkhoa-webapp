import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';

const OPTIONS = [
  { id: 'xlsx', label: 'Microsoft Excel (.xlsx)' },
  { id: 'pdf', label: 'PDF (.pdf)' }
];

export function DownloadMenu({ onPick, disabled, variant = 'default' }) {
  const isToolbar = variant === 'toolbar';
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState(null);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  useLayoutEffect(() => {
    if (!open) {
      setPanelStyle(null);
      return;
    }
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;

    const margin = 8;
    const gap = 6;
    const tr = trigger.getBoundingClientRect();
    const width = panel.offsetWidth || 220;
    const height = panel.offsetHeight || 88;

    let left;
    let top;
    let flipX = false;

    if (isToolbar) {
      left = tr.left;
      top = tr.bottom + gap;
      if (left + width > window.innerWidth - margin) {
        left = Math.max(margin, tr.right - width);
      }
      if (top + height > window.innerHeight - margin) {
        top = Math.max(margin, tr.top - height - gap);
      }
    } else {
      left = tr.right + gap;
      top = tr.top;
      if (left + width > window.innerWidth - margin) {
        left = tr.left - width - gap;
        flipX = true;
      }
      if (left < margin) left = margin;
      if (top + height > window.innerHeight - margin) {
        top = Math.max(margin, window.innerHeight - height - margin);
      }
    }

    setPanelStyle({
      position: 'fixed',
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
      zIndex: 2000,
      '--flip-x': flipX ? '1' : '0'
    });
  }, [open, isToolbar]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (id) => {
    setOpen(false);
    onPick?.(id);
  };

  return (
    <div className={`download-menu ${isToolbar ? 'download-menu--toolbar' : ''} ${open ? 'is-open' : ''}`} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={isToolbar ? 'tb-btn tb-caret download-menu-trigger' : 'action-btn download-menu-trigger'}
        disabled={disabled}
        title="Tải xuống"
        aria-label="Tải xuống"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
      >
        <Download size={16} />
        {isToolbar ? (
          <ChevronDown size={12} className="download-menu-caret" aria-hidden />
        ) : (
          <ChevronRight size={14} className="download-menu-caret" aria-hidden />
        )}
      </button>
      {open && (
        <div
          ref={panelRef}
          className="download-menu-panel"
          role="menu"
          style={panelStyle || { visibility: 'hidden' }}
        >
          {OPTIONS.map(option => (
            <button
              key={option.id}
              type="button"
              role="menuitem"
              className="download-menu-item"
              onClick={() => pick(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
