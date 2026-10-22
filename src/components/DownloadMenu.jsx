import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight, Download } from 'lucide-react';

const OPTIONS = [
  { id: 'xlsx', label: 'Microsoft Excel (.xlsx)' },
  { id: 'pdf', label: 'PDF (.pdf)' }
];

export function DownloadMenu({ onPick, disabled }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

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
    <div className={`download-menu ${open ? 'is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="action-btn download-menu-trigger"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
      >
        <Download size={16} />
        Tải xuống
        <ChevronRight size={14} className="download-menu-caret" aria-hidden />
      </button>
      {open && (
        <div className="download-menu-panel" role="menu">
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
