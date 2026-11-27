import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSpreadsheetUrl, setSpreadsheetConnection } from './sheetStorage';
import { KhoaSetupGuide } from './KhoaSetupGuide';
import { resolveTenant } from '../../config/tenant';
import { savedSheetShareUrl } from './savedSheetRegistry';

export function ConnectSheetDialog({ open, onOpenChange, onConnected }) {
  const [value, setValue] = useState(() => getSpreadsheetUrl());
  const [error, setError] = useState('');

  const handleSave = () => {
    setError('');
    try {
      const id = setSpreadsheetConnection(value);
      onConnected?.(id);
      try {
        sessionStorage.removeItem('LICHKHOA_SHEET_CONNECT_DISMISSED');
      } catch {
        /* private mode */
      }
      onOpenChange?.(false);
    } catch (e) {
      setError(e.message || 'Không lưu được link Sheet.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[min(90vh,720px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kết nối sổ lịch khoa</DialogTitle>
          <DialogDescription>
            Admin khoa: làm theo checklist bên dưới (vd. Tiêu hóa), rồi dán link Sheet tại đây.
            Chrome ẩn danh không nhớ sổ đã lưu — dùng link có <code>?sheet=ID</code> hoặc đăng nhập trình duyệt thường sau khi lưu một lần.
          </DialogDescription>
        </DialogHeader>
        <KhoaSetupGuide
          variant="compact"
          exampleLabel={resolveTenant().label === 'Lịch khoa' ? 'Khoa Tiêu hóa' : resolveTenant().label}
        />
        <div className="grid gap-2 py-2">
          <Label htmlFor="sheet-url">Link Google Sheet</Label>
          <Input
            id="sheet-url"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              try {
                sessionStorage.setItem('LICHKHOA_SHEET_CONNECT_DISMISSED', '1');
              } catch {
                /* private mode */
              }
              onOpenChange?.(false);
            }}
          >
            Đóng
          </Button>
          <Button type="button" onClick={handleSave}>
            Lưu kết nối
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
