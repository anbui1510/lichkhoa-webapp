import React, { useEffect, useMemo, useState } from 'react';
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
import { formatLockAtLabel, fromDatetimeLocalValue, toDatetimeLocalValue } from '../logic/editWindows';
import { isMonthWindowOpen } from '../logic/monthLockWindow';
import { LockRepeatFields } from './LockRepeatFields';

/**
 * F-215 — khóa lịch tháng trên thanh công cụ (tab Lịch tháng).
 */
export function MonthLockToolbarControl({
  monthOpenAt,
  monthLockAt,
  monthLockRepeat = null,
  canManage = false,
  busy = false,
  onSave,
}) {
  const config = useMemo(
    () => ({ monthOpenAt, monthLockAt, monthLockRepeat }),
    [monthOpenAt, monthLockAt, monthLockRepeat]
  );
  const open = isMonthWindowOpen(config);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [openLocal, setOpenLocal] = useState('');
  const [lockLocal, setLockLocal] = useState('');
  const [repeat, setRepeat] = useState(monthLockRepeat);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!dialogOpen) return;
    setOpenLocal(toDatetimeLocalValue(monthOpenAt));
    setLockLocal(toDatetimeLocalValue(monthLockAt));
    setRepeat(monthLockRepeat || null);
    setError('');
  }, [dialogOpen, monthOpenAt, monthLockAt, monthLockRepeat]);

  const anchorIso = (openLocal || lockLocal || '').slice(0, 10)
    || new Date().toISOString().slice(0, 10);

  const persist = async (patch) => {
    setError('');
    try {
      await onSave?.(patch);
      setDialogOpen(false);
    } catch (err) {
      setError(err?.message || 'Không lưu được hạn khóa lịch tháng.');
    }
  };

  const saveAll = () => {
    const monthOpen = fromDatetimeLocalValue(openLocal);
    const monthLock = fromDatetimeLocalValue(lockLocal);
    if (monthOpen && monthLock && monthOpen >= monthLock) {
      setError('Thời gian mở khóa phải trước thời gian khóa.');
      return;
    }
    persist({
      monthOpenAt: monthOpen,
      monthLockAt: monthLock,
      monthLockRepeat: repeat?.freq ? repeat : null,
    });
  };

  const statusLabel = open ? 'Lịch tháng đang mở' : 'Lịch tháng đã khóa';

  return (
    <>
      <button
        type="button"
        className={`tb-btn plan-leave-lock tb-month-lock${open ? '' : ' plan-leave-lock--closed'}`}
        disabled={!canManage}
        title={canManage ? 'Cài hạn mở/khóa lịch tháng' : (open ? 'User được sửa lịch tháng' : 'Đã khóa — liên hệ Mod')}
        onClick={() => {
          if (canManage) setDialogOpen(true);
        }}
      >
        {open ? <Unlock size={16} aria-hidden /> : <Lock size={16} aria-hidden />}
        <span className="tb-month-lock-label">{statusLabel}</span>
      </button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[min(90vh,640px)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Khóa lịch tháng</DialogTitle>
            <DialogDescription>
              Trong khoảng mở khóa → khóa, User được sửa lịch tháng. Có thể lặp lại theo chu kỳ.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="grid gap-1">
              <Label htmlFor="month-open-at">Thời gian mở khóa</Label>
              <Input
                id="month-open-at"
                type="datetime-local"
                value={openLocal}
                disabled={busy}
                onChange={(event) => setOpenLocal(event.target.value)}
              />
              <span className="text-xs text-muted-foreground">{formatLockAtLabel(fromDatetimeLocalValue(openLocal))}</span>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="month-lock-at">Thời gian khóa</Label>
              <Input
                id="month-lock-at"
                type="datetime-local"
                value={lockLocal}
                disabled={busy}
                onChange={(event) => setLockLocal(event.target.value)}
              />
              <span className="text-xs text-muted-foreground">{formatLockAtLabel(fromDatetimeLocalValue(lockLocal))}</span>
            </div>
            <LockRepeatFields
              anchorIso={anchorIso}
              repeat={repeat}
              disabled={busy}
              onChange={setRepeat}
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
                onClick={() => persist({ monthOpenAt: null, monthLockAt: null, monthLockRepeat: null })}
              >
                Xóa
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => persist({ monthLockAt: new Date().toISOString() })}
              >
                Khóa ngay
              </Button>
            </div>
            <Button type="button" disabled={busy} onClick={saveAll}>
              {busy ? 'Đang lưu…' : 'Lưu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}