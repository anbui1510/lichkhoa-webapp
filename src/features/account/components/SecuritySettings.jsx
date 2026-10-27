import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function SecuritySettings({ settings, onSecurity, onPassword, busy, offline }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [localError, setLocalError] = useState('');

  const submitPassword = async (event) => {
    event.preventDefault();
    setMessage('');
    setLocalError('');
    if (newPassword !== confirm) {
      setLocalError('Mật khẩu xác nhận không khớp.');
      return;
    }
    try {
      await onPassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
      setMessage('Đã đổi mật khẩu.');
    } catch {
      /* parent */
    }
  };

  return (
    <div className="account-stack">
      <div className="account-card">
        <h3>Bảo mật</h3>
        <label className="account-toggle">
          <input
            type="checkbox"
            checked={!!settings.twoFactorEnabled}
            disabled={busy}
            onChange={(event) => onSecurity({ twoFactorEnabled: event.target.checked })}
          />
          <span>Bật xác thực 2 bước (2FA) — đánh dấu cấu hình; tích hợp OTP sau</span>
        </label>
        <label className="account-toggle">
          <input
            type="checkbox"
            checked={!!settings.privacyMode}
            disabled={busy}
            onChange={(event) => onSecurity({ privacyMode: event.target.checked })}
          />
          <span>Chế độ riêng tư (ẩn thông tin cá nhân với người khác)</span>
        </label>
      </div>

      <div className="account-card">
        <h3>Đổi mật khẩu</h3>
        {offline && (
          <p className="form-hint">Cần đăng nhập API (backend) để đổi mật khẩu thật.</p>
        )}
        <form className="account-form space-y-3" onSubmit={submitPassword}>
          <div className="grid gap-2">
            <Label htmlFor="sec-current">Mật khẩu hiện tại</Label>
            <Input
              id="sec-current"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              disabled={busy || offline}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="sec-new">Mật khẩu mới</Label>
              <Input
                id="sec-new"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                minLength={6}
                disabled={busy || offline}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sec-confirm">Xác nhận mật khẩu</Label>
              <Input
                id="sec-confirm"
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                required
                minLength={6}
                disabled={busy || offline}
              />
            </div>
          </div>
          {localError && <div className="form-error">{localError}</div>}
          {message && <div className="account-success">{message}</div>}
          <Button type="submit" disabled={busy || offline}>
            Đổi mật khẩu
          </Button>
        </form>
      </div>
    </div>
  );
}
