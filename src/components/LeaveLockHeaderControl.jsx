import React, { useEffect, useState } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  formatLockAtLabel,
  fromDatetimeLocalValue,
  isLeaveWindowOpen,
  toDatetimeLocalValue,
} from '../logic/editWindows';

/**
 * F-214 — khóa lịch nghỉ trên thanh tiêu đề tab Lịch nghỉ (cạnh tháng).
 */
export function LeaveLockHeaderControl({
  leaveLockAt,
  canManage = false,
  busy = false,
  onSave,
}) {
  const open = isLeaveWindowOpen({ leaveLockAt });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [localAt, setLocalAt] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setLocalAt(toDatetimeLocalValue(leaveLockAt));
  }, [leaveLockAt, dialogOpen]);

  const persist = async (patch) => {
    setError('');
    try {
      await onSave?.(patch);
      setDialogOpen(false);
    } catch (err) {
      setError(err?.message || 'Không lưu được hạn khóa.');
    }
  };

  const statusLabel = open ? 'Đang mở' : `Khóa ${formatLockAtLabel(leaveLockAt)}`;

  return (
    <>
      <button
        type="button"
        className={`plan-leave-lock${open ? '' : ' plan-leave-lock--closed'}`}
        disabled={!canManage}
        title={
          canManage
            ? 'Cài hạn khóa lịch nghỉ'
            : (open ? 'User được sửa lịch nghỉ' : 'Đã khóa — liên hệ Mod')
        }
        onClick={() => {
          if (canManage) setDialogOpen(true);
        }}
      >
        {open ? <Unlock size={14} aria-hidden /> : <Lock size={14} aria-hidden />}
        <span className="plan-leave-lock-label">{statusLabel}</span>
      </button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Khóa lịch nghỉ</DialogTitle>
            <DialogDescription>
              Sau thời điểm khóa, User không tự sửa lịch nghỉ — chỉ Mod/Admin. Để trống hạn = luôn mở.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="leave-lock-header-at">Khóa từ</Label>
            <Input
              id="leave-lock-header-at"
              type="datetime-local"
              value={localAt}
              disabled={busy}
              onChange={(event) => setLocalAt(event.target.value)}
            />
          </div>
          {error ? <div className="form-error">{error}</div> : null}
          <DialogFooter className="flex-wrap gap-2 sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => persist({ leaveLockAt: null })}
              >
                Mở cửa sổ
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => persist({ leaveLockAt: new Date().toISOString() })}
              >
                Khóa ngay
              </Button>
            </div>
            <Button
              type="button"
              disabled={busy}
              onClick={() => persist({ leaveLockAt: fromDatetimeLocalValue(localAt) })}
            >
              {busy ? 'Đang lưu…' : 'Lưu hạn'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}