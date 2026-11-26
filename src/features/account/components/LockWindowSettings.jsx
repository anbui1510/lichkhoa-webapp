import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatLockAtLabel, parseLockAt } from '../../../logic/editWindows';

function toDatetimeLocalValue(iso) {
  const d = parseLockAt(iso);
  if (!d) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(local) {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * F-214 — hạn khóa lịch nghỉ / tháng (Admin sửa; mọi role xem).
 */
export function LockWindowSettings({
  config,
  loading,
  busy,
  error,
  isAdmin,
  offline,
  onSave,
  onReload
}) {
  const [leaveLocal, setLeaveLocal] = useState('');
  const [monthLocal, setMonthLocal] = useState('');
  const [localMsg, setLocalMsg] = useState('');

  useEffect(() => {
    setLeaveLocal(toDatetimeLocalValue(config?.leaveLockAt));
    setMonthLocal(toDatetimeLocalValue(config?.monthLockAt));
  }, [config?.leaveLockAt, config?.monthLockAt]);

  const submit = async (event) => {
    event.preventDefault();
    setLocalMsg('');
    await onSave({
      leaveLockAt: fromDatetimeLocalValue(leaveLocal),
      monthLockAt: fromDatetimeLocalValue(monthLocal)
    });
    setLocalMsg('Đã lưu hạn khóa lịch.');
  };

  return (
    <div className="account-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3>Hạn khóa lịch nghỉ / tháng</h3>
          <p className="form-hint">
            User chỉ tự sửa lịch nghỉ trước hạn khóa. Sau hạn phải nhờ Mod. Hạn tháng lưu sẵn cho đợt sau.
          </p>
        </div>
        {onReload && (
          <Button type="button" variant="outline" size="sm" disabled={busy || loading} onClick={() => onReload()}>
            Tải lại
          </Button>
        )}
      </div>

      {loading && <p className="form-hint">Đang tải cấu hình…</p>}

      <Alert className="mt-3">
        <AlertTitle>Hạn hiện tại</AlertTitle>
        <AlertDescription>
          Nghỉ: {formatLockAtLabel(config?.leaveLockAt)} · Tháng: {formatLockAtLabel(config?.monthLockAt)}
        </AlertDescription>
      </Alert>

      {isAdmin && !offline ? (
        <form className="mt-4 space-y-3" onSubmit={submit}>
          <div className="form-group">
            <Label htmlFor="leave-lock-at">Khóa lịch nghỉ</Label>
            <Input
              id="leave-lock-at"
              type="datetime-local"
              value={leaveLocal}
              disabled={busy}
              onChange={(event) => setLeaveLocal(event.target.value)}
            />
            <p className="form-hint">Để trống = không khóa (cửa sổ luôn mở).</p>
          </div>
          <div className="form-group">
            <Label htmlFor="month-lock-at">Khóa lịch tháng</Label>
            <Input
              id="month-lock-at"
              type="datetime-local"
              value={monthLocal}
              disabled={busy}
              onChange={(event) => setMonthLocal(event.target.value)}
            />
          </div>
          {error && <div className="form-error">{error}</div>}
          {localMsg && <p className="form-hint">{localMsg}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? 'Đang lưu…' : 'Lưu hạn khóa'}
          </Button>
        </form>
      ) : (
        <p className="form-hint mt-3">
          {offline ? 'Cần đăng nhập API để xem/sửa hạn khóa.' : 'Chỉ Admin được đổi hạn khóa.'}
        </p>
      )}
    </div>
  );
}
