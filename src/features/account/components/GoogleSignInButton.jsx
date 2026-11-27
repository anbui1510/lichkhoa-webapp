import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { accountApi } from '../services/accountApi';
import { isSheetBackend } from '../../../config/dataBackend';
import { resolveGoogleClientId } from '../../../config/googleClient';
import { setGoogleIdToken } from '../../sheetSync/googleIdToken';

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-gsi]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Không tải được đăng nhập Google.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.dataset.googleGsi = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Không tải được đăng nhập Google.'));
    document.head.appendChild(script);
  });
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.6 7.1l6.3 5.3C37.4 38.4 44 34 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}

export function GoogleSignInButton({ disabled, onCredential, intent = 'login', showSwitchAccount = true }) {
  const boxRef = useRef(null);
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;
  const [clientId, setClientId] = useState('');
  const [hint, setHint] = useState('');
  const [gsiNonce, setGsiNonce] = useState(0);
  const label = intent === 'register' ? 'Đăng ký bằng Google' : 'Đăng nhập bằng Google';

  const gsiInitRef = useRef(false);
  const openPickerAfterMountRef = useRef(false);
  const clientIdRef = useRef('');

  const triggerGoogleButtonClick = (box) => {
    if (!box) return false;
    const target = box.querySelector('[role="button"]')
      || box.querySelector('div[tabindex="0"]')
      || box.firstElementChild;
    if (!target) return false;
    target.click();
    return true;
  };

  const armAccountPicker = () => {
    setGoogleIdToken('');
    setHint('Cửa sổ Google sẽ mở — chọn «Dùng tài khoản khác» nếu cần đổi email.');
    try {
      window.google?.accounts?.id?.disableAutoSelect?.();
      window.google?.accounts?.id?.cancel?.();
    } catch {
      /* GIS optional */
    }
  };

  const switchGoogleAccount = () => {
    if (disabled) return;
    armAccountPicker();
    const box = boxRef.current;
    if (triggerGoogleButtonClick(box)) return;
    openPickerAfterMountRef.current = true;
    setGsiNonce((n) => n + 1);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const id = await resolveGoogleClientId(() => accountApi.googleConfig());
        if (cancelled) return;
        setClientId(id);
        clientIdRef.current = id;
        if (!id) return;
        await loadGoogleScript();
        const box = boxRef.current;
        if (cancelled || !box || !window.google?.accounts?.id) return;
        box.innerHTML = '';
        if (!gsiInitRef.current || clientIdRef.current !== id) {
          window.google.accounts.id.initialize({
            client_id: id,
            auto_select: false,
            cancel_on_tap_outside: true,
            callback: (response) => {
              if (response?.credential) onCredentialRef.current(response.credential);
            }
          });
          gsiInitRef.current = true;
        }
        const width = Math.max(240, Math.min(360, box.parentElement?.clientWidth || 360));
        window.google.accounts.id.renderButton(box, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: intent === 'register' ? 'signup_with' : 'signin_with',
          shape: 'rectangular',
          width,
          locale: 'vi'
        });
        if (openPickerAfterMountRef.current) {
          openPickerAfterMountRef.current = false;
          window.setTimeout(() => {
            if (!cancelled) triggerGoogleButtonClick(box);
          }, 350);
        }
      } catch (error) {
        if (!cancelled) {
          const msg = String(error?.message || '');
          // API chưa chạy / 5xx — không làm ồn cổng đăng nhập
          if (isSheetBackend()) {
            setHint(msg || 'Không tải được đăng nhập Google.');
          } else if (/500|502|503|Failed to fetch|NetworkError|máy chủ/i.test(msg)) {
            setHint('Chưa kết nối API Google OAuth — có thể đăng nhập email/mật khẩu.');
          } else {
            setHint(msg || 'Không tải được đăng nhập Google.');
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [intent, gsiNonce]);

  return (
    <div className={`google-signin ${disabled ? 'is-busy' : ''}`}>
      {!clientId && (
        <button
          type="button"
          className="google-account-btn"
          disabled={disabled}
          onClick={() => setHint(
            isSheetBackend()
              ? 'Chưa có Client ID. Cloudflare: VITE_GOOGLE_CLIENT_ID (OAuth Web) + Retry deployment. Google Cloud: Authorized JavaScript origins = URL Pages (vd. https://lichkhoa-webapp.pages.dev). Không cần Render.'
              : 'Chưa có Client ID. Set VITE_GOOGLE_CLIENT_ID hoặc GOOGLE_CLIENT_ID trên API (Render/local).'
          )}
        >
          <GoogleMark />
          {label}
        </button>
      )}
      <div ref={boxRef} className="google-signin-official" />
      {showSwitchAccount && clientId && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="google-signin-switch"
          disabled={disabled}
          onClick={switchGoogleAccount}
        >
          Tài khoản Google khác
        </Button>
      )}
      {hint && <p className="google-signin-hint">{hint}</p>}
    </div>
  );
}
