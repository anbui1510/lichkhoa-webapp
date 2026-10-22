import React, { useRef } from 'react';
import { Camera, User } from 'lucide-react';

export function AvatarUpload({ avatarUrl, fullName, onPick, busy }) {
  const inputRef = useRef(null);
  const initials = (fullName || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <div className="account-avatar-block">
      <button
        type="button"
        className="account-avatar"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        title="Đổi ảnh đại diện"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={fullName || 'Avatar'} />
        ) : (
          <span className="account-avatar-fallback">{initials || <User size={28} />}</span>
        )}
        <span className="account-avatar-camera"><Camera size={14} /></span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPick?.(file);
          event.target.value = '';
        }}
      />
      <p className="form-hint">JPG/PNG tối đa 2MB. Có thể upload lên Cloudinary khi cấu hình env server.</p>
    </div>
  );
}
