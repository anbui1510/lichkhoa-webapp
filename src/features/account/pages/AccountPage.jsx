import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AvatarUpload } from '../components/AvatarUpload';
import { AuthPanel } from '../components/AuthPanel';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { LinkStaffCard } from '../components/LinkStaffCard';
import { NotificationSettings } from '../components/NotificationSettings';
import { ProfileForm } from '../components/ProfileForm';
import { SecuritySettings } from '../components/SecuritySettings';
import { SheetConnectionSettings } from '../../sheetSync/SheetConnectionSettings';

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
  onThemeToggle,
  staffLink,
  sheetConnection
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
    loginWithGoogle,
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
            {staffLink?.required
              ? 'Tài khoản chưa gắn với nhân sự. Chọn hồ sơ do Admin tạo trong Quản lý BS để tiếp tục.'
              : offline
                ? 'Chế độ cục bộ / offline — hồ sơ lưu trên trình duyệt. Chạy API để đồng bộ server.'
                : 'Đã kết nối API — dữ liệu lưu trên máy chủ.'}
          </p>
        </div>
        <div className="account-header-actions flex flex-wrap gap-2">
          {user && (
            <Button type="button" variant="outline" onClick={logout}>
              Đăng xuất API
            </Button>
          )}
          {onClose && !staffLink?.required && (
            <Button type="button" variant="outline" onClick={onClose}>
              Về bảng lịch
            </Button>
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
            onGoogle={(credential) => run(() => loginWithGoogle(credential))}
          />
          <div className="account-card" style={{ maxWidth: 420 }}>
            <h3>Hoặc dùng offline</h3>
            <p className="form-hint">Lưu hồ sơ tạm trên trình duyệt (không cần API). Đổi mật khẩu / đồng bộ sau khi đăng nhập.</p>
            <Button
              type="button"
              variant="outline"
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
            </Button>
          </div>
        </>
      )}

      {user && offline && (
        <div className="account-card account-auth">
          <h3>Đăng nhập bằng Google</h3>
          <p className="form-hint">Tài khoản Google dùng cho cả đăng nhập và đăng ký. Email Google sẽ gắn với quyền nhân sự.</p>
          <GoogleSignInButton disabled={busy} onCredential={(credential) => run(() => loginWithGoogle(credential))} />
        </div>
      )}

      {user && (
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
      )}

      {user && sheetConnection && staffLink?.required && (
        <SheetConnectionSettings
          readOnly={sheetConnection.readOnly}
          busy={busy}
          onSave={(url) => run(() => sheetConnection.onSave(url))}
        />
      )}

      {user && staffLink && (
        <LinkStaffCard
          required={staffLink.required}
          options={staffLink.options}
          current={staffLink.current}
          onSubmit={staffLink.onSubmit}
        />
      )}

      {user && !staffLink?.required && (
        <>
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
            <>
            {sheetConnection && !staffLink?.required && (
              <SheetConnectionSettings
                readOnly={sheetConnection.readOnly}
                busy={busy}
                onSave={(url) => run(() => sheetConnection.onSave(url))}
              />
            )}
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
            </>
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
