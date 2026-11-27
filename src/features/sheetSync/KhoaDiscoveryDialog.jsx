import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function KhoaDiscoveryDialog({
  open,
  onOpenChange,
  entries = [],
  loading = false,
  onSelect,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[min(85vh,520px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chọn khoa làm việc</DialogTitle>
          <DialogDescription>
            Tài khoản Google của bạn có quyền trên các khoa sau (theo tab NhanSu từng sổ). Chọn một khoa để vào lịch.
          </DialogDescription>
        </DialogHeader>
        {loading && <p className="text-sm text-muted-foreground">Đang tìm khoa trong danh mục bệnh viện…</p>}
        {!loading && !entries.length && (
          <p className="text-sm text-muted-foreground">Không tìm thấy khoa phù hợp với email đăng nhập.</p>
        )}
        <ul className="flex flex-col gap-2 py-2">
          {entries.map((entry) => (
            <li key={entry.spreadsheetId}>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start h-auto py-3"
                onClick={() => {
                  onSelect?.(entry);
                  onOpenChange?.(false);
                }}
              >
                <span className="font-medium">{entry.label}</span>
                {entry.actorKind === 'admin' && (
                  <span className="ml-2 text-xs text-muted-foreground">(admin)</span>
                )}
              </Button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}