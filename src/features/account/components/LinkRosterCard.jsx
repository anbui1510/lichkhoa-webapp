import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

/**
 * User chọn tên roster chưa taken để nhận role (F-105 / Story 1.4).
 */
export function LinkRosterCard({ required, people, currentPersonId, busy, onSubmit }) {
  const [personId, setPersonId] = useState(currentPersonId || '');
  const [error, setError] = useState('');

  useEffect(() => {
    setPersonId(currentPersonId || '');
  }, [currentPersonId]);

  const options = people || [];
  const mine = options.find((p) => p.id === currentPersonId);
  const freeOrMine = options.filter((p) => !p.linked || p.id === currentPersonId);

  const submit = async (event) => {
    event.preventDefault();
    const picked = options.find((p) => p.id === personId);
    if (!picked) {
      setError('Chọn một tên trong danh sách Admin đã tạo.');
      return;
    }
    if (picked.linked && picked.id !== currentPersonId) {
      setError('Tên này đã được tài khoản khác liên kết.');
      return;
    }
    setError('');
    try {
      await onSubmit(picked.id);
    } catch (err) {
      setError(err?.message || 'Liên kết thất bại.');
    }
  };

  return (
    <form className="account-card account-auth space-y-3" onSubmit={submit}>
      <h3>Liên kết tên trong danh sách khoa</h3>
      {required && (
        <Alert>
          <AlertTitle>Chưa liên kết tên</AlertTitle>
          <AlertDescription>
            Chọn đúng tên Admin đã tạo để nhận quyền Mod/User. Chưa liên kết thì chưa có quyền xếp lịch đầy đủ.
          </AlertDescription>
        </Alert>
      )}
      <p className="form-hint">
        Mỗi tên chỉ gắn một tài khoản Google. Sau khi liên kết, quyền lấy theo vai trò Admin đã gán.
      </p>
      {options.length === 0 ? (
        <div className="form-error">Chưa có tên nào. Nhờ Admin thêm bạn trong Cài đặt → Danh sách người.</div>
      ) : freeOrMine.length === 0 ? (
        <div className="form-error">Tất cả tên đã được liên kết. Nhờ Admin thêm tên mới hoặc hủy liên kết.</div>
      ) : (
        <div className="grid gap-2">
          <Label htmlFor="link-roster">Tên tương ứng</Label>
          <select
            id="link-roster"
            className="form-select"
            required
            value={personId}
            disabled={busy}
            onChange={(event) => setPersonId(event.target.value)}
          >
            <option value="">Chọn tên</option>
            {options.map((person) => (
              <option
                key={person.id}
                value={person.id}
                disabled={person.linked && person.id !== currentPersonId}
              >
                {person.displayName} ({person.role})
                {person.linked && person.id !== currentPersonId ? ' — đã liên kết' : ''}
              </option>
            ))}
          </select>
        </div>
      )}
      {mine && (
        <p className="form-hint">
          Đang liên kết với <strong>{mine.displayName}</strong> — {mine.role}.
        </p>
      )}
      {error && <div className="form-error">{error}</div>}
      <Button type="submit" disabled={busy || freeOrMine.length === 0}>
        {required ? 'Liên kết tên' : 'Đổi / xác nhận liên kết'}
      </Button>
    </form>
  );
}
