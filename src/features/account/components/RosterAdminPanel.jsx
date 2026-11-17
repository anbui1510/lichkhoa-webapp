import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ROLES = [
  { id: 'User', label: 'User' },
  { id: 'Mod', label: 'Mod' },
  { id: 'Admin', label: 'Admin' }
];

/**
 * Admin CRUD danh sách tên + role (F-104 / Story 1.3).
 */
export function RosterAdminPanel({
  people,
  loading,
  busy,
  error,
  isAdmin,
  offline,
  onCreate,
  onUpdate,
  onDelete,
  onUnlink,
  onReload
}) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('User');
  const [editId, setEditId] = useState('');
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('User');
  const [localMsg, setLocalMsg] = useState('');

  useEffect(() => {
    if (!editId) return;
    const person = (people || []).find((p) => p.id === editId);
    if (!person) {
      setEditId('');
      return;
    }
    setEditName(person.displayName);
    setEditRole(person.role);
  }, [editId, people]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setLocalMsg('');
    try {
      await onCreate({ displayName: name, role });
      setName('');
      setRole('User');
      setLocalMsg('Đã thêm vào danh sách.');
    } catch {
      /* parent surfaces error */
    }
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    if (!editId) return;
    setLocalMsg('');
    try {
      await onUpdate(editId, { displayName: editName, role: editRole });
      setEditId('');
      setLocalMsg('Đã cập nhật.');
    } catch {
      /* parent */
    }
  };

  if (offline) {
    return (
      <div className="account-card space-y-3">
        <h3>Danh sách người & phân quyền</h3>
        <Alert>
          <AlertTitle>Cần đăng nhập API</AlertTitle>
          <AlertDescription>
            Danh sách tên và vai trò lưu trên máy chủ. Đăng nhập rồi mở lại Cài đặt.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="account-card space-y-3">
        <h3>Danh sách người & phân quyền</h3>
        <p className="form-hint">Chỉ Admin được thêm/sửa danh sách tên. Bạn có thể liên kết tên của mình ở phần Liên kết bên trên.</p>
        {loading ? (
          <p className="form-hint">Đang tải danh sách…</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {(people || []).map((person) => (
              <li key={person.id}>
                {person.displayName} — {person.role}
                {person.linked ? ' (đã liên kết)' : ''}
              </li>
            ))}
            {!people?.length && <li className="form-hint">Chưa có tên nào.</li>}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="account-card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3>Danh sách người & phân quyền</h3>
          <p className="form-hint">
            Tạo tên và gán Admin / Mod / User. Người dùng Google sẽ tự liên kết đúng tên của mình.
          </p>
        </div>
        {onReload && (
          <Button type="button" variant="outline" size="sm" disabled={busy || loading} onClick={onReload}>
            Làm mới
          </Button>
        )}
      </div>

      {loading && <p className="form-hint">Đang tải danh sách…</p>}
      {error && <div className="form-error">{error}</div>}
      {localMsg && <p className="form-hint">{localMsg}</p>}

      <form className="grid gap-3 sm:grid-cols-[1fr_auto_auto]" onSubmit={handleCreate}>
        <div className="grid gap-2">
          <Label htmlFor="roster-name">Tên hiển thị</Label>
          <Input
            id="roster-name"
            value={name}
            disabled={busy || loading}
            placeholder="Ví dụ: BS. An"
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="roster-role">Vai trò</Label>
          <select
            id="roster-role"
            className="form-select"
            value={role}
            disabled={busy || loading}
            onChange={(event) => setRole(event.target.value)}
          >
            {ROLES.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={busy || loading || !String(name).trim()}>
            {busy ? 'Đang lưu…' : 'Thêm'}
          </Button>
        </div>
      </form>

      <div className="space-y-2">
        {(people || []).length === 0 && !loading && (
          <Alert>
            <AlertTitle>Chưa có tên</AlertTitle>
            <AlertDescription>Thêm ít nhất một tên để Mod/User có thể liên kết sau khi đăng nhập Google.</AlertDescription>
          </Alert>
        )}

        {(people || []).map((person) => (
          <div
            key={person.id}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 py-2 last:border-0"
          >
            {editId === person.id ? (
              <form className="flex w-full flex-wrap items-end gap-2" onSubmit={handleSaveEdit}>
                <div className="grid min-w-[10rem] flex-1 gap-1">
                  <Label htmlFor={`edit-name-${person.id}`}>Tên</Label>
                  <Input
                    id={`edit-name-${person.id}`}
                    value={editName}
                    disabled={busy}
                    onChange={(event) => setEditName(event.target.value)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor={`edit-role-${person.id}`}>Vai trò</Label>
                  <select
                    id={`edit-role-${person.id}`}
                    className="form-select"
                    value={editRole}
                    disabled={busy}
                    onChange={(event) => setEditRole(event.target.value)}
                  >
                    {ROLES.map((item) => (
                      <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
                  </select>
                </div>
                <Button type="submit" size="sm" disabled={busy}>Lưu</Button>
                <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setEditId('')}>
                  Hủy
                </Button>
              </form>
            ) : (
              <>
                <div>
                  <div className="font-medium">{person.displayName}</div>
                  <p className="form-hint">
                    {person.role}
                    {person.linked ? ' · đã liên kết' : ' · chưa liên kết'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setEditId(person.id)}>
                    Sửa
                  </Button>
                  {person.linked && onUnlink && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        setLocalMsg('');
                        onUnlink(person.id).then(() => setLocalMsg('Đã hủy liên kết.')).catch(() => {});
                      }}
                    >
                      Hủy liên kết
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={busy || person.linked}
                    title={person.linked ? 'Hủy liên kết trước khi xóa' : undefined}
                    onClick={() => {
                      setLocalMsg('');
                      onDelete(person.id).then(() => setLocalMsg('Đã xóa.')).catch(() => {});
                    }}
                  >
                    Xóa
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
