import React, { useState } from 'react';

export function AuthPanel({ onLogin, onRegister, busy, error }) {
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
      <form className="account-form" onSubmit={submit}>
        {mode === 'register' && (
          <>
            <div className="form-group">
              <label className="form-label">Họ tên</label>
              <input
                className="form-input"
                required
                value={form.fullName}
                onChange={(event) => setForm({ ...form, fullName: event.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                className="form-input"
                required
                value={form.username}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
              />
            </div>
          </>
        )}
        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            className="form-input"
            type="email"
            required
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Mật khẩu</label>
          <input
            className="form-input"
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
        </div>
        {error && <div className="form-error">{error}</div>}
        <button type="submit" className="action-btn primary" disabled={busy}>
          {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
        </button>
      </form>
    </div>
  );
}
