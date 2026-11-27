import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSpreadsheetId, getSpreadsheetUrl, tenantHasDefaultSpreadsheet } from './sheetStorage';
import { savedSheetShareUrl } from './savedSheetRegistry';

export function SheetConnectionSettings({ readOnly, busy, onSave }) {
  const [value, setValue] = useState(() => getSpreadsheetUrl() || getSpreadsheetId());
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const sheetId = getSpreadsheetId();
  const shareUrl = sheetId ? savedSheetShareUrl(sheetId) : '';

  const copyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Không sao chép được. Chọn và copy link bên dưới.');
    }
  };

  const submit = (event) => {
    event.preventDefault();
    setError('');
    if (readOnly) return;
    const trimmed = String(value || '').trim();
    if (!trimmed) {
      setError('Nhập link Google Sheet hoặc ID sổ.');
      return;
    }
    onSave?.(trimmed).catch((e) => {
      setError(e?.message || 'Không lưu được kết nối sổ.');
    });
  };

  return (
    <form className="account-card space-y-3" onSubmit={submit}>
      <div>
        <h3>Sổ lịch Google Sheet</h3>
        <p className="form-hint">
          Một Spreadsheet / khoa. Lịch và nhân sự đồng bộ qua tab trên Sheet; quyền theo <strong>NhanSu</strong>.
        </p>
        <p className="form-hint">
          Mỗi khoa một file Google Sheet. Admin khoa <strong>chỉ cần lưu link một lần</strong> tại đây — không
          cần <code>VITE_TENANT_REGISTRY</code> trên Cloudflare. Gửi NV link <strong>vào lịch khoa</strong> bên
          dưới (hoặc QR). NV làm nhiều khoa: mở từng link một lần — app nhớ sổ và hiện dropdown đổi khoa trên
          máy đó. Đồng bộ cần <strong>đăng nhập Google</strong> (không «Vào xem trước»).
        </p>
      </div>
      {sheetId && (
        <div className="space-y-2">
          <p className="form-hint">
            ID đang dùng: <code>{sheetId}</code>
          </p>
          {shareUrl && (
            <div className="grid gap-2">
              <Label htmlFor="settings-sheet-share">Link vào lịch khoa (gửi nhân viên)</Label>
              <div className="flex flex-wrap gap-2 items-center">
                <Input id="settings-sheet-share" readOnly value={shareUrl} className="font-mono text-xs" />
                <Button type="button" variant="outline" size="sm" onClick={copyShareLink}>
                  {copied ? 'Đã sao chép' : 'Sao chép link'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="grid gap-2">
        <Label htmlFor="settings-sheet-url">Link Google Sheet</Label>
        <Input
          id="settings-sheet-url"
          value={value}
          readOnly={readOnly}
          disabled={busy}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://docs.google.com/spreadsheets/d/..."
        />
        {readOnly && (
          <p className="form-hint">
            Chỉ quản trị (hoặc admin khoa đang thiết lập) được đổi sổ. Liên hệ TK nếu cần chuyển file lưu trữ.
          </p>
        )}
        {!readOnly && tenantHasDefaultSpreadsheet() && (
          <p className="form-hint">
            Cloudflare có thể đang gắn Sheet mặc định (vd. Tim mạch). Lưu link khoa mới ở đây sẽ ghi đè trên trình
            duyệt này.
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      {!readOnly && (
        <Button type="submit" disabled={busy}>
          Lưu kết nối sổ
        </Button>
      )}
    </form>
  );
}
