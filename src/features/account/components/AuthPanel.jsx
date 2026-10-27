import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GoogleSignInButton } from './GoogleSignInButton';

export function AuthPanel({ onLogin, onRegister, onGoogle, busy, error }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    email: 'admin@lichkhoa.local',
    password: 'admin123',
    fullName: '',
    username: ''
  });

  const submit = async (event) => {
    event.preventDefault();
    if (mode === 'login') {
      await onLogin(form.email, form.password);
      return;
    }
    await onRegister({
      email: form.email,
      password: form.password,
      fullName: form.fullName,
      username: form.username
    });
  };

  return (
    <div className="account-card account-auth">
      <div className="plan-tabs" role="tablist">
        <button type="button" className={`plan-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>
          Đăng nhập
        </button>
        <button type="button" className={`plan-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>
          Đăng ký
        </button>
      </div>
      <p className="form-hint">
        Cần chạy API trước (<code>npm run dev:api</code>). Tài khoản mẫu:{' '}
        <strong>admin@lichkhoa.local</strong> / <strong>admin123</strong>
      </p>
      <GoogleSignInButton disabled={busy} onCredential={onGoogle} intent={mode} />
      <div className="account-divider"><span>hoặc dùng email</span></div>
      <form className="account-form space-y-3" onSubmit={submit}>
        {mode === 'register' && (
          <>
            <div className="grid gap-2">
              <Label htmlFor="auth-fullName">Họ tên</Label>
              <Input
                id="auth-fullName"
                required
                value={form.fullName}
                onChange={(event) => setForm({ ...form, fullName: event.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="auth-username">Username</Label>
              <Input
                id="auth-username"
                required
                value={form.username}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
              />
            </div>
          </>
        )}
        <div className="grid gap-2">
          <Label htmlFor="auth-email">Email</Label>
          <Input
            id="auth-email"
            type="email"
            required
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="auth-password">Mật khẩu</Label>
          <Input
            id="auth-password"
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
        </div>
        {error && <div className="form-error">{error}</div>}
        <Button type="submit" disabled={busy}>
          {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
        </Button>
      </form>
    </div>
  );
}
