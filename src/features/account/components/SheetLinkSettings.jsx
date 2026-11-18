import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const EMPTY = {
  spreadsheetId: null,
  linked: false,
  verified: false,
  title: '',
  verifiedAt: null
};

/**
 * Cài đặt liên kết Spreadsheet SoT (F-103 / Story 1.2).
 * Admin lưu; user khác chỉ xem trạng thái.
 */
export function SheetLinkSettings({
  config,
  loading,
  busy,
  error,
  isAdmin,
  offline,
  onSave,
  onReload
}) {
  const [input, setInput] = useState('');
  const [localMsg, setLocalMsg] = useState('');
  const linked = Boolean(config?.linked && config?.spreadsheetId);

  useEffect(() => {
    if (config?.spreadsheetId) {
      setInput(config.spreadsheetId);
    }
  }, [config?.spreadsheetId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalMsg('');
    try {
      await onSave({ spreadsheetIdOrUrl: input });
      setLocalMsg('Đã lưu liên kết Google Sheet.');
    } catch {
      /* parent surfaces error */
    }
  };

  if (offline) {
    return (
      <div className="account-card space-y-3">
        <h3>Liên kết Google Sheet</h3>
        <Alert>
          <AlertTitle>Cần đăng nhập API</AlertTitle>
          <AlertDescription>
            Liên kết Spreadsheet SoT chỉ lưu trên máy chủ. Đăng nhập rồi mở lại Cài đặt.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="account-card space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3>Liên kết Google Sheet</h3>
          <p className="form-hint">
            Spreadsheet SoT của khoa. Sau khi liên kết + cấu hình service account (Editor), app đồng bộ lịch qua Sheet.
          </p>
        </div>
        {onReload && (
          <Button type="button" variant="outline" size="sm" disabled={busy || loading} onClick={onReload}>
            Làm mới
          </Button>
        )}
      </div>

      {loading && <p className="form-hint">Đang tải cấu hình Sheet…</p>}

      {!loading && !linked && (
        <Alert>
          <AlertTitle>Chưa liên kết Spreadsheet</AlertTitle>
          <AlertDescription>
            {isAdmin
              ? 'Nhập ID hoặc đường dẫn Google Spreadsheet rồi lưu để hoàn tất setup khoa.'
              : 'Admin chưa liên kết Spreadsheet SoT. Bạn vẫn dùng được app; đồng bộ lịch đầy đủ sẽ có sau khi Admin setup.'}
          </AlertDescription>
        </Alert>
      )}

      {!loading && linked && (
        <Alert>
          <AlertTitle>Đã liên kết</AlertTitle>
          <AlertDescription>
            ID: <code className="text-xs">{config.spreadsheetId}</code>
            {config.title ? ` — ${config.title}` : ''}
            {config.verified ? ' (đã xác minh quyền đọc)' : ' (chưa ping xác minh — thiếu credentials server hoặc bỏ qua ping)'}
          </AlertDescription>
        </Alert>
      )}

      {!loading && linked && config?.sheetsCredentialsConfigured === false && (
        <Alert>
          <AlertTitle>Máy chủ chưa có credentials Sheets</AlertTitle>
          <AlertDescription>
            Thêm <code className="text-xs">GOOGLE_SHEETS_CLIENT_EMAIL</code> và{' '}
            <code className="text-xs">GOOGLE_SHEETS_PRIVATE_KEY</code> vào <code className="text-xs">server/.env</code>,
            rồi chia sẻ Spreadsheet cho email service account với quyền <strong>Editor</strong>. Xem{' '}
            <code className="text-xs">server/.env.example</code>.
          </AlertDescription>
        </Alert>
      )}

      {!loading && linked && config?.syncReady === true && (
        <p className="form-hint">Đồng bộ lịch Sheet sẵn sàng (đã link + credentials máy chủ).</p>
      )}

      {error && <div className="form-error">{error}</div>}
      {localMsg && <p className="form-hint">{localMsg}</p>}

      {isAdmin ? (
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="sheet-link-input">ID hoặc URL Spreadsheet</Label>
            <Input
              id="sheet-link-input"
              value={input}
              disabled={busy || loading}
              placeholder="https://docs.google.com/spreadsheets/d/… hoặc ID"
              onChange={(event) => setInput(event.target.value)}
            />
          </div>
          <Button type="submit" disabled={busy || loading || !String(input).trim()}>
            {busy ? 'Đang lưu…' : 'Lưu liên kết'}
          </Button>
        </form>
      ) : (
        <p className="form-hint">Chỉ Admin được sửa liên kết Sheet.</p>
      )}
    </div>
  );
}

export { EMPTY as EMPTY_SCHEDULE_CONFIG };
