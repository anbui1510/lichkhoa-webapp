import React, { useCallback, useState } from 'react';
import { AlertTriangle, Save, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

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
  const confirmVariant = variant === 'danger' ? 'destructive' : 'default';

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (open) return;
        if (alertOnly) onConfirm();
        else onCancel();
      }}
    >
      <DialogContent showCloseButton={false} className="sm:max-w-md" role="alertdialog">
        <DialogHeader>
          <div className="flex gap-3">
            <div
              className={
                variant === 'danger'
                  ? 'flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive'
                  : variant === 'info'
                    ? 'flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground'
                    : 'flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'
              }
            >
              <Icon size={20} />
            </div>
            <div className="min-w-0 space-y-1.5">
              <DialogTitle>{title}</DialogTitle>
              {message ? <DialogDescription>{message}</DialogDescription> : null}
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="border-0 bg-transparent sm:justify-end">
          {!alertOnly && (
            <Button type="button" variant="outline" onClick={onCancel}>
              {cancelText}
            </Button>
          )}
          <Button type="button" variant={confirmVariant} autoFocus onClick={onConfirm}>
            {alertOnly ? 'Đã hiểu' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
    setState((prev) => {
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
