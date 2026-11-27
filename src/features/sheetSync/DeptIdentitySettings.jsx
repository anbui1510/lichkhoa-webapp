import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Admin khoa: tên / mã / id (ghi store + _meta khi đồng bộ Sheet).
 */
export function DeptIdentitySettings({ department, readOnly, busy, onSave }) {
  const [name, setName] = useState(department?.name || '');
  const [code, setCode] = useState(department?.code || '');
  const [id, setId] = useState(department?.id || '');
  const [error, setError] = useState('');

  useEffect(() => {
    setName(department?.name || '');
    setCode(department?.code || '');
    setId(department?.id || '');
  }, [department?.id, department?.name, department?.code]);

  const submit = (event) => {
    event.preventDefault();
    setError('');
    const deptName = String(name || '').trim();
    const deptCode = String(code || '').trim().toUpperCase();
    const deptId = String(id || '').trim();
    if (!deptName) {
      setError('Nhập tên khoa (vd. Khoa Tiêu hóa).');
      return;
    }
    if (!deptId || !/^dept_[a-z0-9_]+$/i.test(deptId)) {
      setError('Mã id khoa dạng dept_tieu_hoa (chữ thường, gạch dưới).');
      return;
    }
    onSave?.({ name: deptName, code: deptCode || deptId.replace(/^dept_/, '').toUpperCase(), id: deptId }).catch((e) => {
      setError(e?.message || 'Không lưu được thông tin khoa.');
    });
  };

  return (
    <form className="account-card space-y-3" onSubmit={submit}>
      <div>
        <h3>Thông tin khoa</h3>
        <p className="form-hint">
          Hiển thị trên app sau khi đăng nhập (tiêu đề, tab _meta khi đồng bộ). Trước đăng nhập chỉ thấy
          «Lịch làm việc bệnh viện».
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="dept-display-name">Tên khoa</Label>
        <Input
          id="dept-display-name"
          value={name}
          readOnly={readOnly}
          disabled={busy}
          placeholder="Khoa Tiêu hóa"
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="dept-code">Mã khoa (code)</Label>
        <Input
          id="dept-code"
          value={code}
          readOnly={readOnly}
          disabled={busy}
          placeholder="TIEU_HOA"
          onChange={(e) => setCode(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="dept-id">ID khoa (activeDeptId / _meta)</Label>
        <Input
          id="dept-id"
          value={id}
          readOnly={readOnly}
          disabled={busy}
          placeholder="dept_tieu_hoa"
          onChange={(e) => setId(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!readOnly && (
        <Button type="submit" disabled={busy}>
          Lưu thông tin khoa
        </Button>
      )}
    </form>
  );
}