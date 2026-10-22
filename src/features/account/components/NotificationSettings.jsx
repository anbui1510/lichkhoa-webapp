import React from 'react';

export function NotificationSettings({ settings, onChange, busy }) {
  return (
    <div className="account-card">
      <h3>Thông báo</h3>
      <p className="form-hint">Chọn kênh nhận nhắc lịch và cập nhật khoa.</p>
      <label className="account-toggle">
        <input
          type="checkbox"
          checked={!!settings.emailNotifications}
          disabled={busy}
          onChange={(event) => onChange({ emailNotifications: event.target.checked })}
        />
        <span>Email thông báo</span>
      </label>
      <label className="account-toggle">
        <input
          type="checkbox"
          checked={!!settings.pushNotifications}
          disabled={busy}
          onChange={(event) => onChange({ pushNotifications: event.target.checked })}
        />
        <span>Thông báo đẩy (push)</span>
      </label>
    </div>
  );
}
