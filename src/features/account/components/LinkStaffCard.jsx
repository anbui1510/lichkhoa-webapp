import React, { useEffect, useState } from 'react';

export function LinkStaffCard({ required, options, current, onSubmit }) {
  const [staffId, setStaffId] = useState(current?.id || '');
  const [error, setError] = useState('');

  useEffect(() => {
    setStaffId(current?.id || '');
  }, [current?.id]);

  const submit = (event) => {
    event.preventDefault();
    const picked = options.find(person => person.id === staffId);
    if (!picked || picked.taken) {
      setError('Chọn một hồ sơ nhân sự chưa được tài khoản khác liên kết.');
      return;
    }
    setError('');
    onSubmit(picked.id);
  };

  return (
    <form className="account-card account-auth" onSubmit={submit}>
      <h3>Liên kết hồ sơ nhân sự</h3>
      <p className="form-hint">
        Tài khoản đăng nhập chỉ có tên, email và ảnh. Hãy chọn đúng người mà Admin đã tạo trong Quản lý BS.
        Quyền xem và sửa tab lấy theo hồ sơ đó.
      </p>
      {options.length === 0 ? (
        <div className="form-error">Chưa có nhân sự nào. Nhờ Admin thêm bạn trong Quản lý BS trước.</div>
      ) : (
        <div className="form-group">
          <label className="form-label" htmlFor="link-staff">Hồ sơ tương ứng</label>
          <select
            id="link-staff"
            className="form-select"
            required
            value={staffId}
            onChange={(event) => setStaffId(event.target.value)}
          >
            <option value="">Chọn nhân sự</option>
            {options.map(person => (
              <option key={person.id} value={person.id} disabled={person.taken}>
                {person.deptName} — {person.name} ({person.shortName}){person.taken ? ' — đã liên kết' : ''}
              </option>
            ))}
          </select>
        </div>
      )}
      {current && (
        <p className="form-hint">
          Đang liên kết với <strong>{current.name}</strong> ({current.shortName})
          {current.deptName ? ` — ${current.deptName}` : ''}.
        </p>
      )}
      {error && <div className="form-error">{error}</div>}
      <button type="submit" className="action-btn primary" disabled={!options.length}>
        {required ? 'Liên kết hồ sơ' : 'Đổi hồ sơ liên kết'}
      </button>
    </form>
  );
}
