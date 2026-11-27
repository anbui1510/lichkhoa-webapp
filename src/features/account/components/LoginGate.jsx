import React, { useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isPasswordApiConfigured } from '../../../config/apiBase';
import { isSheetBackend } from '../../../config/dataBackend';
import { GoogleSignInButton } from './GoogleSignInButton';
import { clearSessionNotice } from '../sessionAuth';

const APP_VERSION = '1.0.0';

function staffEmail(person) {
  return String(person?.loginEmail || person?.email || '').trim().toLowerCase();
}

export function LoginGate({
  tenantLabel = 'Lịch khoa',
  tenantHint = 'Hệ thống xếp lịch khoa bệnh viện',
  staffList = [],
  busy = false,
  error = '',
  sessionNotice = '',
  onLogin,
  onPreviewLogin,
  onGoogle
}) {
  const sheetMode = isSheetBackend();
  const passwordApiOk = isPasswordApiConfigured();
  const previewMode = !passwordApiOk && sheetMode;
  const [showApiLogin, setShowApiLogin] = useState(false);
  /** F-304 Sheet: đồng bộ chỉ qua Google — ẩn form API trừ khi mở thêm. */
  const showPasswordLogin = passwordApiOk && (!sheetMode || showApiLogin);
  const roster = useMemo(
    () => (staffList || []).filter((person) => staffEmail(person)),
    [staffList]
  );
  const useStaffSelect = roster.length > 0 && showPasswordLogin;

  const [staffId, setStaffId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const useManualEmail = !useStaffSelect || staffId === '__email__';
  const selected = useStaffSelect && !useManualEmail
    ? roster.find((person) => person.id === staffId)
    : null;
  const resolvedEmail = useManualEmail ? email.trim() : staffEmail(selected);
  const canSubmitPassword =
    showPasswordLogin && Boolean(resolvedEmail) && password.length > 0 && !busy;
  const canSubmitPreview =
    previewMode && Boolean(email.trim().includes('@')) && !busy;

  const submit = async (event) => {
    event.preventDefault();
    if (!canSubmitPassword) return;
    clearSessionNotice();
    await onLogin?.(resolvedEmail, password);
  };

  const submitPreview = async (event) => {
    event.preventDefault();
    if (!canSubmitPreview) return;
    clearSessionNotice();
    await onPreviewLogin?.(email.trim());
  };

  const handleGoogle = async (credential) => {
    clearSessionNotice();
    await onGoogle?.(credential);
  };

  return (
    <div className="login-gate">
      <div className="login-gate-card" role="main" aria-labelledby="login-gate-title">
        <div className="login-gate-brand">
          <div className="login-gate-icon" aria-hidden="true">
            <CalendarDays size={22} strokeWidth={2.25} />
          </div>
          <h1 id="login-gate-title" className="login-gate-title">
            {tenantLabel || 'Lịch khoa'}
          </h1>
          <p className="login-gate-subtitle">{tenantHint}</p>
          <p className="login-gate-meta">Webapp xếp lịch đa khoa phòng</p>
          <p className="login-gate-version">Phiên bản {APP_VERSION}</p>
        </div>

        {sessionNotice === 'expired' && (
          <div className="login-gate-alert" role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>Phiên đăng nhập của bạn đã hết hạn do không hoạt động.</span>
          </div>
        )}

        {sheetMode && (
          <div className="login-gate-google">
            <GoogleSignInButton disabled={busy} onCredential={handleGoogle} intent="login" />
            <p className="login-gate-hint">
              Email Google phải khớp cột loginEmail / email trên tab NhanSu. Muốn đổi Gmail:
              bấm «Tài khoản Google khác» dưới nút Google, hoặc cửa sổ ẩn danh.
            </p>
            {passwordApiOk && !showApiLogin && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="login-gate-api-toggle"
                disabled={busy}
                onClick={() => setShowApiLogin(true)}
              >
                Đăng nhập email / mật khẩu API (tuỳ chọn)
              </Button>
            )}
          </div>
        )}

        {showPasswordLogin && sheetMode && (
          <div className="login-gate-divider">
            <span>hoặc email / mật khẩu API</span>
          </div>
        )}

        {previewMode && (
          <>
            <div className="login-gate-divider">
              <span>hoặc vào xem trước</span>
            </div>
            <div className="login-gate-alert" role="status">
              <AlertTriangle size={16} aria-hidden="true" />
              <span>
                Cloudflare Pages không chạy API — không dùng seed mật khẩu.
                Nhập email bất kỳ để vào app (dữ liệu local; chưa đồng bộ Sheet).
              </span>
            </div>
            <form className="login-gate-form" onSubmit={submitPreview}>
              <div className="grid gap-2">
                <Label htmlFor="preview-email">Email xem trước</Label>
                <Input
                  id="preview-email"
                  type="email"
                  autoComplete="username"
                  required
                  disabled={busy}
                  value={email}
                  placeholder="ban@benhvien.vn"
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              {error ? <div className="form-error">{error}</div> : null}
              <Button
                type="submit"
                disabled={!canSubmitPreview}
                className="login-gate-submit w-full"
              >
                <UserRound size={16} aria-hidden="true" />
                Vào xem trước
              </Button>
            </form>
          </>
        )}

        {showPasswordLogin && (
          <form className="login-gate-form" onSubmit={submit}>
            {useStaffSelect && (
              <div className="grid gap-2">
                <Label htmlFor="login-staff">Tên nhân viên</Label>
                <select
                  id="login-staff"
                  className="login-gate-select"
                  value={staffId}
                  disabled={busy}
                  onChange={(event) => {
                    setStaffId(event.target.value);
                    setPassword('');
                  }}
                >
                  <option value="">-- Chọn nhân viên --</option>
                  {roster.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name || person.shortName || person.id}
                    </option>
                  ))}
                  <option value="__email__">Khác — nhập email…</option>
                </select>
              </div>
            )}

            {useManualEmail && (
              <div className="grid gap-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  required
                  disabled={busy || (useStaffSelect && !staffId)}
                  value={email}
                  placeholder="email@benhvien.vn"
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="login-password">Mật khẩu</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                disabled={busy || (useStaffSelect && !staffId)}
                value={password}
                placeholder={
                  useStaffSelect && !staffId
                    ? 'Vui lòng chọn nhân viên trước'
                    : 'Nhập mật khẩu'
                }
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {error ? <div className="form-error">{error}</div> : null}

            <Button
              type="submit"
              disabled={!canSubmitPassword}
              className="login-gate-submit w-full"
            >
              <UserRound size={16} aria-hidden="true" />
              Đăng nhập
            </Button>
          </form>
        )}

        {!sheetMode && !passwordApiOk && (
          <div className="login-gate-alert" role="status">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>
              Build API backend cần <code>VITE_API_BASE</code> trỏ Render (hoặc chạy local API).
            </span>
          </div>
        )}

        {!sheetMode && (
          <div className="login-gate-google login-gate-google-secondary">
            <div className="login-gate-divider">
              <span>hoặc Google</span>
            </div>
            <GoogleSignInButton disabled={busy} onCredential={handleGoogle} intent="login" />
          </div>
        )}
      </div>
    </div>
  );
}
