import React, { useState } from 'react';
import { AvatarUpload } from '../components/AvatarUpload';
import { AuthPanel } from '../components/AuthPanel';
import { NotificationSettings } from '../components/NotificationSettings';
import { ProfileForm } from '../components/ProfileForm';
import { SecuritySettings } from '../components/SecuritySettings';

const TABS = [
  ['profile', 'Hồ sơ'],
  ['preferences', 'Tùy chọn'],
  ['notifications', 'Thông báo'],
  ['security', 'Bảo mật']
];

export function AccountPage({
  section = 'profile',
  account,
  onClose,
  onThemeToggle
}) {
  const [tab, setTab] = useState(section === 'settings' ? 'preferences' : section);
  const [busy, setBusy] = useState(false);
  const {
    user,
    settings,
    loading,
    error,
    offline,
    login,
    register,
    logout,
    saveProfile,
    saveAvatar,
    saveSettings,
    changePassword
  } = account;

  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="view-container account-view">
        <p className="form-hint">Đang tải tài khoản…</p>
      </div>
    );
  }

  return (
    <div className="view-container account-view">
      <div className="account-header">
        <div>
          <h2>Tài khoản cá nhân</h2>
          <p className="form-hint">
            {offline
              ? 'Chế độ cục bộ / offline — hồ sơ lưu trên trình duyệt. Chạy API để đồng bộ server.'
              : 'Đã kết nối API — dữ liệu lưu trên máy chủ.'}
          </p>
        </div>
        <div className="account-header-actions">
          {user && (
            <button type="button" className="action-btn" onClick={logout}>
              Đăng xuất API
            </button>
          )}
          {onClose && (
            <button type="button" className="action-btn" onClick={onClose}>
              Về bảng lịch
            </button>
          )}
        </div>
      </div>

      {!user && (
        <>
          <AuthPanel
            busy={busy}
            error={error}
            onLogin={(email, password) => run(() => login(email, password))}
            onRegister={(payload) => run(() => register(payload))}
          />
          <div className="account-card" style={{ maxWidth: 420 }}>
            <h3>Hoặc dùng offline</h3>
            <p className="form-hint">Lưu hồ sơ tạm trên trình duyệt (không cần API). Đổi mật khẩu / đồng bộ sau khi đăng nhập.</p>
            <button
              type="button"
              className="action-btn"
              disabled={busy}
              onClick={() => run(() => saveProfile({
                fullName: 'Người dùng',
                username: 'local_user',
                phone: '',
                birthDate: '',
                country: 'Việt Nam',
                address: ''
              }))}
            >
              Tiếp tục offline
            </button>
          </div>
        </>
      )}

      {user && (
        <>
          <div className="account-profile-top">
            <AvatarUpload
              avatarUrl={user.avatarUrl}
              fullName={user.fullName}
              busy={busy}
              onPick={(file) => run(() => saveAvatar(file))}
            />
            <div>
              <h3>{user.fullName || user.username}</h3>
              <p className="form-hint">{user.email}</p>
            </div>
          </div>

          <div className="plan-tabs account-tabs" role="tablist">
            {TABS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                className={`plan-tab ${tab === id ? 'active' : ''}`}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {error && <div className="form-error">{error}</div>}

          {tab === 'profile' && (
            <div className="account-card">
              <h3>Thông tin tài khoản</h3>
              <ProfileForm
                user={user}
                emailLocked={!offline}
                busy={busy}
                onSubmit={(patch) => run(() => saveProfile(patch))}
              />
            </div>
          )}

          {tab === 'preferences' && (
            <div className="account-card">
              <h3>Tùy chọn giao diện</h3>
              <label className="account-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.darkMode}
                  disabled={busy}
                  onChange={(event) => {
                    const darkMode = event.target.checked;
                    run(async () => {
                      await saveSettings({ darkMode });
                      onThemeToggle?.(darkMode ? 'dark' : 'light');
                    });
                  }}
                />
                <span>Chế độ tối (dark mode)</span>
              </label>
              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="form-label">Ngôn ngữ</label>
                <select
                  className="form-select"
                  value={settings.language || 'vi'}
                  disabled={busy}
                  onChange={(event) => run(() => saveSettings({ language: event.target.value }))}
                >
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          )}

          {tab === 'notifications' && (
            <NotificationSettings
              settings={settings}
              busy={busy}
              onChange={(patch) => run(() => saveSettings(patch))}
            />
          )}

          {tab === 'security' && (
            <SecuritySettings
              settings={settings}
              busy={busy}
              offline={offline}
              onSecurity={(patch) => run(() => saveSettings(patch))}
              onPassword={(currentPassword, newPassword) => run(() => changePassword(currentPassword, newPassword))}
            />
          )}
        </>
      )}
    </div>
  );
}
