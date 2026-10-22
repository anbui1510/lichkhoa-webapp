import React from 'react';
import { Bell, X } from 'lucide-react';

const SAMPLE = [
  { id: 1, title: 'Lịch tuần mới', body: 'Tuần tới đã sẵn sàng để xếp lịch tự động.', time: 'Vừa xong' },
  { id: 2, title: 'Nhắc cập nhật hồ sơ', body: 'Bổ sung số điện thoại để nhận thông báo SMS (sắp có).', time: 'Hôm nay' }
];

export function NotificationsPanel({ open, onClose, settings }) {
  if (!open) return null;
  return (
    <div className="notif-panel" role="dialog" aria-label="Thông báo">
      <div className="notif-panel-header">
        <span><Bell size={16} /> Thông báo</span>
        <button type="button" className="icon-btn" onClick={onClose} title="Đóng"><X size={16} /></button>
      </div>
      <div className="notif-panel-body">
        {!settings?.emailNotifications && !settings?.pushNotifications && (
          <p className="form-hint">Bạn đang tắt mọi kênh thông báo trong Cài đặt.</p>
        )}
        {SAMPLE.map((item) => (
          <div key={item.id} className="notif-item">
            <strong>{item.title}</strong>
            <p>{item.body}</p>
            <span className="form-hint">{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
