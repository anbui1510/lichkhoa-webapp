import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Save, Info } from 'lucide-react';

const ICONS = {
  danger: AlertTriangle,
  primary: Save,
  info: Info
};

export function ConfirmDialog({
  title,
  message,
  confirmText = 'Đồng ý',
  cancelText = 'Hủy',
  variant = 'primary', // 'primary' | 'danger' | 'info'
  alertOnly = false,
  onConfirm,
  onCancel
}) {
  const Icon = ICONS[variant] || Info;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        alertOnly ? onConfirm() : onCancel();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [alertOnly, onConfirm, onCancel]);

  return createPortal(
    <div className="modal-overlay confirm-overlay" onMouseDown={(e) => e.stopPropagation()}>
      <div className="modal-content confirm-dialog" role="alertdialog" aria-modal="true">
        <div className="confirm-head">
          <div className={`confirm-icon ${variant}`}>
            <Icon size={20} />
          </div>
          <div>
            <div className="confirm-title">{title}</div>
            {message && <div className="confirm-message">{message}</div>}
          </div>
        </div>
        <div className="confirm-actions">
          {!alertOnly && (
            <button type="button" className="action-btn" onClick={onCancel}>{cancelText}</button>
          )}
          <button
            type="button"
            autoFocus
            className={`action-btn ${variant === 'danger' ? 'danger' : 'primary'}`}
            onClick={onConfirm}
          >
            {alertOnly ? 'Đã hiểu' : confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Hook trả về [confirm, dialogElement].
 * confirm(options) => Promise<boolean>; render dialogElement ở cuối component.
 */
export function useConfirm() {
  const [state, setState] = useState(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setState({ ...options, resolve });
    });
  }, []);

  const close = useCallback((result) => {
    setState(prev => {
      prev?.resolve(result);
      return null;
    });
  }, []);

  const handleConfirm = useCallback(() => close(true), [close]);
  const handleCancel = useCallback(() => close(false), [close]);

  const dialog = state ? (
    <ConfirmDialog
      {...state}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return [confirm, dialog];
}
