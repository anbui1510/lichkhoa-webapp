import React from 'react';
import { Smartphone } from 'lucide-react';
import { writeForcedUiMode } from '../../logic/uiMode';

/** Shown when desktop chrome is forced/stuck on a phone-sized screen. */
export function SwitchToMobileBanner() {
  const switchMobile = () => {
    writeForcedUiMode('mobile');
    window.location.reload();
  };

  return (
    <div className="switch-mobile-banner" role="status">
      <Smartphone size={16} aria-hidden />
      <span>Giao diện máy tính đang mở trên điện thoại — không thấy Quản lý BS / Task đầy đủ.</span>
      <button type="button" className="switch-mobile-btn" onClick={switchMobile}>
        Dùng bản điện thoại
      </button>
    </div>
  );
}
