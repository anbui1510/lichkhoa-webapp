import React, { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AvatarUpload } from '../components/AvatarUpload';
import { AuthPanel } from '../components/AuthPanel';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { LinkRosterCard } from '../components/LinkRosterCard';
import { LinkStaffCard } from '../components/LinkStaffCard';
import { NotificationSettings } from '../components/NotificationSettings';
import { ProfileForm } from '../components/ProfileForm';
import { RosterAdminPanel } from '../components/RosterAdminPanel';
import { SecuritySettings } from '../components/SecuritySettings';
import { SheetLinkSettings } from '../components/SheetLinkSettings';
import { LockWindowSettings } from '../components/LockWindowSettings';
import { SheetConnectionSettings } from '../../sheetSync/SheetConnectionSettings';
import { isSheetBackend } from '../../../config/dataBackend';

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
  rosterLink,
  sheetConnection
}) {
  const [tab, setTab] = useState(section === 'settings' ? 'preferences' : section);
  const [busy, setBusy] = useState(false);
  const {
    user,
    settings,
    scheduleConfig,
    scheduleConfigLoading,
    rosterPeople,
    rosterLoading,
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
    changePassword,
    saveScheduleConfig,
    saveLockWindows,
    refreshScheduleConfig,
    refreshRoster,
    createRosterPerson,
    updateRosterPerson,
    deleteRosterPerson,
    unlinkRosterPerson
  } = account;

  const isAdmin = String(user?.role || '') === 'Admin';
  const sheetLinked = Boolean(scheduleConfig?.linked && scheduleConfig?.spreadsheetId);
  const pendingRoster = Boolean(rosterLink?.required);

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
            {pendingRoster
              ? 'Tài khoản Google chưa gắn tên trong danh sách khoa. Chọn tên Admin đã tạo để tiếp tục.'
              : staffLink?.required
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
          {onClose && !pendingRoster && !staffLink?.required && (
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
            <p className="form-hint">
              {user.email}
              {user.role ? ` · ${user.role}` : ' · chưa liên kết tên'}
            </p>
          </div>
        </div>
      )}

      {user && rosterLink && (
        <LinkRosterCard
          required={rosterLink.required}
          people={rosterLink.people}
          currentPersonId={rosterLink.currentPersonId}
          busy={busy}
          onSubmit={(id) => run(() => rosterLink.onSubmit(id))}
        />
      )}

      {user && sheetConnection && staffLink?.required && (
        <SheetConnectionSettings
          readOnly={sheetConnection.readOnly}
          busy={busy}
          onSave={(url) => run(() => sheetConnection.onSave(url))}
        />
      )}

      {user && staffLink && !rosterLink && (
        <LinkStaffCard
          required={staffLink.required}
          options={staffLink.options}
          current={staffLink.current}
          onSubmit={staffLink.onSubmit}
        />
      )}

      {user && !pendingRoster && (
        <>
          {!offline && !isSheetBackend() && !scheduleConfigLoading && !sheetLinked && (
            <Alert className="mb-3">
              <AlertTitle>Chưa liên kết Google Sheet</AlertTitle>
              <AlertDescription>
                {isAdmin
                  ? 'Mở tab Tùy chọn để nhập ID/URL Spreadsheet SoT của khoa. App vẫn mở bình thường.'
                  : 'Admin chưa liên kết Spreadsheet SoT. App vẫn dùng được; đồng bộ lịch đầy đủ sẽ có sau khi setup.'}
              </AlertDescription>
            </Alert>
          )}

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

              {!isSheetBackend() && (
                <SheetLinkSettings
                  config={scheduleConfig}
                  loading={scheduleConfigLoading}
                  busy={busy}
                  error={error}
                  isAdmin={isAdmin}
                  offline={offline}
                  onSave={(body) => run(() => saveScheduleConfig(body))}
                  onReload={() => run(() => refreshScheduleConfig())}
                />
              )}

              {!isSheetBackend() && (
                <LockWindowSettings
                  config={scheduleConfig}
                  loading={scheduleConfigLoading}
                  busy={busy}
                  error={error}
                  isAdmin={isAdmin}
                  offline={offline}
                  onSave={(body) => run(() => saveLockWindows(body))}
                  onReload={() => run(() => refreshScheduleConfig())}
                />
              )}

              <RosterAdminPanel
                people={rosterPeople}
                loading={rosterLoading}
                busy={busy}
                error={error}
                isAdmin={isAdmin}
                offline={offline}
                onCreate={(body) => run(() => createRosterPerson(body))}
                onUpdate={(id, body) => run(() => updateRosterPerson(id, body))}
                onDelete={(id) => run(() => deleteRosterPerson(id))}
                onUnlink={(id) => run(() => unlinkRosterPerson(id))}
                onReload={() => run(() => refreshRoster())}
              />
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
