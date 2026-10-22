import { useCallback, useEffect, useState } from 'react';
import {
  accountApi,
  getToken,
  loadLocalProfile,
  loadLocalSettings,
  saveLocalProfile,
  saveLocalSettings,
  setToken
} from '../services/accountApi';
import { EMPTY_PROFILE, EMPTY_SETTINGS } from '../types/user';

export function useAccount({ onThemeFromSettings } = {}) {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(false);

  const applyUser = useCallback((nextUser) => {
    setUser(nextUser);
    if (nextUser?.settings) {
      setSettings(nextUser.settings);
      onThemeFromSettings?.(nextUser.settings.darkMode);
    }
  }, [onThemeFromSettings]);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    setError('');
    const token = getToken();
    if (!token) {
      const localUser = loadLocalProfile();
      const localSettings = loadLocalSettings();
      setUser(localUser);
      setSettings(localSettings || EMPTY_SETTINGS);
      if (localSettings) onThemeFromSettings?.(localSettings.darkMode);
      setOffline(true);
      setLoading(false);
      return;
    }
    try {
      const { user: me } = await accountApi.me();
      applyUser(me);
      setOffline(false);
    } catch {
      setOffline(true);
      const localUser = loadLocalProfile();
      const localSettings = loadLocalSettings();
      setUser(localUser);
      setSettings(localSettings || EMPTY_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, [applyUser, onThemeFromSettings]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = async (email, password) => {
    setError('');
    try {
      const result = await accountApi.login({ email, password });
      setToken(result.token);
      applyUser(result.user);
      setOffline(false);
      return result.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const register = async (payload) => {
    setError('');
    try {
      const result = await accountApi.register(payload);
      setToken(result.token);
      applyUser(result.user);
      setOffline(false);
      return result.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = () => {
    setToken('');
    setUser(null);
    setSettings(EMPTY_SETTINGS);
    setOffline(true);
  };

  const saveProfile = async (patch) => {
    setError('');
    if (offline || !getToken()) {
      const next = { ...(user || EMPTY_PROFILE), ...patch, id: user?.id || 'local' };
      saveLocalProfile(next);
      setUser(next);
      return next;
    }
    try {
      const { user: next } = await accountApi.updateProfile(patch);
      applyUser(next);
      return next;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const saveAvatar = async (file) => {
    setError('');
    if (offline || !getToken()) {
      const dataUrl = await fileToDataUrl(file);
      const next = { ...(user || EMPTY_PROFILE), avatarUrl: dataUrl, id: user?.id || 'local' };
      saveLocalProfile(next);
      setUser(next);
      return next;
    }
    try {
      const { user: next } = await accountApi.uploadAvatar(file);
      applyUser(next);
      return next;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const saveSettings = async (patch) => {
    setError('');
    const nextSettings = { ...settings, ...patch };
    if (offline || !getToken()) {
      saveLocalSettings(nextSettings);
      setSettings(nextSettings);
      onThemeFromSettings?.(nextSettings.darkMode);
      return nextSettings;
    }
    try {
      const { settings: saved } = await accountApi.updateSettings(patch);
      setSettings(saved);
      onThemeFromSettings?.(saved.darkMode);
      return saved;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    setError('');
    if (offline || !getToken()) {
      const err = new Error('Cần đăng nhập API để đổi mật khẩu.');
      setError(err.message);
      throw err;
    }
    try {
      return await accountApi.updatePassword({ currentPassword, newPassword });
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    user,
    settings,
    loading,
    error,
    offline,
    login,
    register,
    logout,
    saveProfile,
    saveAvatar,
    saveSettings,
    changePassword,
    refresh: bootstrap
  };
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Không đọc được ảnh.'));
    reader.readAsDataURL(file);
  });
}
