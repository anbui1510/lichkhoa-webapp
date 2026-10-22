import React, { useEffect, useState } from 'react';

const FIELDS = [
  ['fullName', 'Họ và tên', 'text'],
  ['username', 'Tên đăng nhập', 'text'],
  ['email', 'Email', 'email'],
  ['phone', 'Số điện thoại', 'tel'],
  ['birthDate', 'Ngày sinh', 'date'],
  ['country', 'Quốc gia', 'text'],
  ['address', 'Địa chỉ', 'text']
];

export function ProfileForm({ user, onSubmit, busy, emailLocked }) {
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    birthDate: '',
    country: 'Việt Nam',
    address: ''
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) return;
    setForm({
      fullName: user.fullName || '',
      username: user.username || '',
      email: user.email || '',
      phone: user.phone || '',
      birthDate: user.birthDate || '',
      country: user.country || 'Việt Nam',
      address: user.address || ''
    });
  }, [user]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      const { email, ...patch } = form;
      await onSubmit(patch);
      setMessage('Đã lưu hồ sơ.');
    } catch {
      /* parent shows error */
    }
  };

  return (
    <form className="account-form" onSubmit={handleSubmit}>
      <div className="form-grid-2">
        {FIELDS.map(([key, label, type]) => (
          <div className="form-group" key={key}>
            <label className="form-label">{label}</label>
            <input
              className="form-input"
              type={type}
              value={form[key]}
              disabled={busy || (key === 'email' && emailLocked)}
              onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
              required={key === 'fullName' || key === 'username'}
            />
          </div>
        ))}
      </div>
      {message && <div className="account-success">{message}</div>}
      <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
        <button type="submit" className="action-btn primary" disabled={busy}>
          Lưu hồ sơ
        </button>
      </div>
    </form>
  );
}
