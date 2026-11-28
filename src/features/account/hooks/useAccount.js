import { useCallback, useEffect, useState } from 'react';
import {
  accountApi,
  getToken,
  loadLocalSettings,
  saveLocalProfile,
  saveLocalSettings,
  setToken
} from '../services/accountApi';
import { isSheetBackend } from '../../../config/dataBackend';
import { readLocalLockWindows, writeLocalLockWindows } from '../../../logic/localLockWindows';
import { getSpreadsheetId } from '../../sheetSync/sheetStorage';
import { getGoogleIdToken, setGoogleIdToken } from '../../sheetSync/googleIdToken';
import { revokeGoogleHintEmail, setGoogleHintEmail } from '../googleSessionHint';
import {
  clearSheetPreviewSession,
  getSheetPreviewSession,
  setSheetPreviewSession
} from '../previewSession';
import {
  clearLoginSession,
  loginSessionUserSnapshot,
  startLoginSession,
  touchLoginSession,
} from '../loginSession';
import { setSessionNotice } from '../sessionAuth';
import { EMPTY_PROFILE, EMPTY_SETTINGS } from '../types/user';

function mergeSessionTimeoutFromLocal(settings) {
  if (!settings) return settings;
  const local = loadLocalSettings();
  if (local?.sessionTimeoutMinutes === undefined) return settings;
  return { ...settings, sessionTimeoutMinutes: local.sessionTimeoutMinutes };
}

function sheetPreviewUser(email) {
  const normalized = String(email || '').trim().toLowerCase();
  return {
    id: 'sheet-preview',
    email: normalized,
    username: normalized.split('@')[0] || 'preview',
    fullName: normalized,
    // Preview Pages: Admin tạm để vào được app / thiết lập; không phải JWT SoT.
    role: 'Admin',
    settings: EMPTY_SETTINGS
  };
}

const EMPTY_SCHEDULE_CONFIG = {
  spreadsheetId: null,
  linked: false,
  verified: false,
  title: '',
  verifiedAt: null,
  updatedAt: null,
  leaveLockAt: null,
  monthLockAt: null
};

function emailFromGoogleCredential(credential) {
  try {
    const payload = JSON.parse(atob(String(credential).split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return String(payload.email || '').trim().toLowerCase();
  } catch {
    return '';
  }
}

function sheetUserFromCredential(credential) {
  const email = emailFromGoogleCredential(credential);
  if (!email) return null;
  return {
    id: 'google-sheet',
    email,
    username: email.split('@')[0] || 'user',
    fullName: email,
    settings: EMPTY_SETTINGS
  };
}

export function useAccount({ onThemeFromSettings } = {}) {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(EMPTY_SETTINGS);
  const [scheduleConfig, setScheduleConfig] = useState(EMPTY_SCHEDULE_CONFIG);
  const [scheduleConfigLoading, setScheduleConfigLoading] = useState(false);
  const [rosterPeople, setRosterPeople] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(false);

  const applyUser = useCallback((nextUser) => {
    setUser(nextUser);
    if (nextUser?.settings) {
      const merged = mergeSessionTimeoutFromLocal(nextUser.settings);
      setSettings(merged);
      onThemeFromSettings?.(merged.darkMode);
    }
  }, [onThemeFromSettings]);

  const applyLocalSettingsOnly = useCallback(() => {
    const localSettings = loadLocalSettings();
    setSettings(localSettings || EMPTY_SETTINGS);
    if (localSettings) onThemeFromSettings?.(localSettings.darkMode);
  }, [onThemeFromSettings]);

  const refreshScheduleConfig = useCallback(async () => {
    if (!getToken()) {
      setScheduleConfig(EMPTY_SCHEDULE_CONFIG);
      return EMPTY_SCHEDULE_CONFIG;
    }
    setScheduleConfigLoading(true);
    try {
      const { config } = await accountApi.getScheduleConfig();
      const next = config || EMPTY_SCHEDULE_CONFIG;
      setScheduleConfig(next);
      return next;
    } catch {
      // Không crash; giữ config đã linked nếu có — tránh banner “chưa liên kết” giả khi API lỗi tạm.
      setScheduleConfig((prev) =>
        prev?.linked && prev?.spreadsheetId ? prev : EMPTY_SCHEDULE_CONFIG
      );
      return null;
    } finally {
      setScheduleConfigLoading(false);
    }
  }, []);

  const refreshRoster = useCallback(async () => {
    if (!getToken()) {
      setRosterPeople([]);
      return [];
    }
    setRosterLoading(true);
    try {
      const { people } = await accountApi.listRoster();
      const next = Array.isArray(people) ? people : [];
      setRosterPeople(next);
      return next;
    } catch {
      setRosterPeople([]);
      return [];
    } finally {
      setRosterLoading(false);
    }
  }, []);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    setError('');
    const token = getToken();
    const googleToken = getGoogleIdToken();

    if (!token) {
      if (isSheetBackend()) {
        const localSettings = loadLocalSettings() || EMPTY_SETTINGS;
        const snap = loginSessionUserSnapshot(localSettings);
        if (snap?.email) {
          clearSheetPreviewSession();
          const nextUser = {
            ...snap,
            id: snap.id || 'google-sheet',
            settings: mergeSessionTimeoutFromLocal({
              ...EMPTY_SETTINGS,
              ...localSettings,
            }),
          };
          applyUser(nextUser);
          touchLoginSession();
          setScheduleConfig(EMPTY_SCHEDULE_CONFIG);
          setRosterPeople([]);
          setOffline(true);
          setLoading(false);
          return;
        }
      }
      // F-102 / F-304: giữ phiên Sheet qua Google ID token sau reload
      if (isSheetBackend() && googleToken) {
        const sheetUser = sheetUserFromCredential(googleToken);
        if (sheetUser) {
          clearSheetPreviewSession();
          startLoginSession(sheetUser);
          applyUser(sheetUser);
          applyLocalSettingsOnly();
          setScheduleConfig(EMPTY_SCHEDULE_CONFIG);
          setRosterPeople([]);
          setOffline(true);
          setLoading(false);
          return;
        }
      }
      // Pages preview: phiên email không JWT / không Google
      if (isSheetBackend()) {
        const preview = getSheetPreviewSession();
        if (preview?.email) {
          const previewUser = sheetPreviewUser(preview.email);
          startLoginSession(previewUser);
          applyUser(previewUser);
          applyLocalSettingsOnly();
          setScheduleConfig(EMPTY_SCHEDULE_CONFIG);
          setRosterPeople([]);
          setOffline(true);
          setLoading(false);
          return;
        }
      }
      // F-102 login-gate: không tự vào app bằng local profile khi chưa đăng nhập
      setUser(null);
      applyLocalSettingsOnly();
      setScheduleConfig(EMPTY_SCHEDULE_CONFIG);
      setRosterPeople([]);
      setOffline(true);
      setLoading(false);
      return;
    }

    try {
      const { user: me } = await accountApi.me();
      applyUser(me);
      setOffline(false);
      await Promise.all([refreshScheduleConfig(), refreshRoster()]);
    } catch {
      // BR-102-05: token chết → hết phiên, không lách bằng local profile
      setToken('');
      setSessionNotice('expired');
      setUser(null);
      applyLocalSettingsOnly();
      setScheduleConfig(EMPTY_SCHEDULE_CONFIG);
      setRosterPeople([]);
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [applyLocalSettingsOnly, applyUser, refreshRoster, refreshScheduleConfig]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!isSheetBackend()) return undefined;
    const id = getSpreadsheetId();
    if (!id) return undefined;
    const local = readLocalLockWindows(id);
    setScheduleConfig((prev) => ({
      ...prev,
      leaveLockAt: local.leaveLockAt,
      monthLockAt: local.monthLockAt,
    }));
    return undefined;
  }, []);

  const login = async (email, password) => {
    setError('');
    try {
      const result = await accountApi.login({ email, password });
      clearSheetPreviewSession();
      setToken(result.token);
      applyUser(result.user);
      startLoginSession(result.user);
      setOffline(false);
      await Promise.all([refreshScheduleConfig(), refreshRoster()]);
      return result.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  /** Pages / sheet không API: vào app bằng email (sessionStorage), không JWT. */
  const loginSheetPreview = async (email) => {
    setError('');
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized.includes('@')) {
      const err = new Error('Nhập email hợp lệ để vào xem trước.');
      setError(err.message);
      throw err;
    }
    setToken('');
    setGoogleIdToken('');
    setSheetPreviewSession(normalized);
    const next = sheetPreviewUser(normalized);
    startLoginSession(next);
    applyUser(next);
    setOffline(true);
    setScheduleConfig(EMPTY_SCHEDULE_CONFIG);
    setRosterPeople([]);
    return next;
  };

  const loginWithGoogle = async (credential) => {
    setError('');
    setGoogleIdToken(credential);
    const hintEmail = emailFromGoogleCredential(credential);
    if (hintEmail) setGoogleHintEmail(hintEmail);

    // F-304: Sheet — GIS trên trình duyệt + id token → bridge; không POST Render.
    if (isSheetBackend()) {
      const sheetUser = sheetUserFromCredential(credential);
      if (!sheetUser) {
        const err = new Error('Không đọc được email từ Google.');
        setError(err.message);
        throw err;
      }
      clearSheetPreviewSession();
      setToken('');
      startLoginSession(sheetUser);
      applyUser(sheetUser);
      setOffline(true);
      setScheduleConfig(EMPTY_SCHEDULE_CONFIG);
      setRosterPeople([]);
      return sheetUser;
    }

    try {
      const result = await accountApi.google(credential);
      clearSheetPreviewSession();
      setToken(result.token);
      applyUser(result.user);
      startLoginSession(result.user);
      setOffline(false);
      await Promise.all([refreshScheduleConfig(), refreshRoster()]);
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
      startLoginSession(result.user);
      setOffline(false);
      await Promise.all([refreshScheduleConfig(), refreshRoster()]);
      return result.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = ({ notice } = {}) => {
    const logoutEmail = String(user?.email || '').trim().toLowerCase();
    setToken('');
    setGoogleIdToken('');
    void revokeGoogleHintEmail(logoutEmail);
    clearSheetPreviewSession();
    clearLoginSession();
    if (notice) setSessionNotice(notice);
    setUser(null);
    const local = loadLocalSettings();
    setSettings(local ? { ...EMPTY_SETTINGS, ...local } : EMPTY_SETTINGS);
    setScheduleConfig(EMPTY_SCHEDULE_CONFIG);
    setRosterPeople([]);
    setOffline(true);
    setError('');
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
    const hasSessionTimeout = Object.prototype.hasOwnProperty.call(
      patch,
      'sessionTimeoutMinutes'
    );
    if (hasSessionTimeout) {
      saveLocalSettings({
        ...(loadLocalSettings() || {}),
        ...nextSettings,
      });
    }
    if (offline || !getToken()) {
      saveLocalSettings(nextSettings);
      setSettings(nextSettings);
      onThemeFromSettings?.(nextSettings.darkMode);
      return nextSettings;
    }
    const apiPatch = { ...patch };
    delete apiPatch.sessionTimeoutMinutes;
    if (Object.keys(apiPatch).length === 0) {
      setSettings(mergeSessionTimeoutFromLocal(nextSettings));
      onThemeFromSettings?.(nextSettings.darkMode);
      return nextSettings;
    }
    try {
      const { settings: saved } = await accountApi.updateSettings(apiPatch);
      const merged = mergeSessionTimeoutFromLocal({
        ...saved,
        ...(hasSessionTimeout
          ? { sessionTimeoutMinutes: nextSettings.sessionTimeoutMinutes }
          : {}),
      });
      setSettings(merged);
      onThemeFromSettings?.(merged.darkMode);
      return merged;
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

  const saveScheduleConfig = async (body) => {
    setError('');
    if (offline || !getToken()) {
      const err = new Error('Cần đăng nhập API để lưu liên kết Google Sheet.');
      setError(err.message);
      throw err;
    }
    try {
      const { config } = await accountApi.updateScheduleConfig(body);
      const next = config || EMPTY_SCHEDULE_CONFIG;
      setScheduleConfig(next);
      return next;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const saveLockWindows = async (body) => {
    setError('');
    if (isSheetBackend()) {
      const sheetId = getSpreadsheetId();
      if (!sheetId) {
        const err = new Error('Chưa chọn Google Sheet khoa.');
        setError(err.message);
        throw err;
      }
      const saved = writeLocalLockWindows(sheetId, body);
      let next = EMPTY_SCHEDULE_CONFIG;
      setScheduleConfig((prev) => {
        next = {
          ...prev,
          leaveLockAt: saved.leaveLockAt ?? null,
          monthLockAt: saved.monthLockAt ?? null,
        };
        return next;
      });
      return next;
    }
    if (offline || !getToken()) {
      const err = new Error('Cần đăng nhập API để lưu hạn khóa lịch.');
      setError(err.message);
      throw err;
    }
    try {
      const { config } = await accountApi.updateLockWindows(body);
      const next = config || EMPTY_SCHEDULE_CONFIG;
      setScheduleConfig(next);
      return next;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const createRosterPerson = async (body) => {
    setError('');
    try {
      const { person } = await accountApi.createRoster(body);
      await refreshRoster();
      return person;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateRosterPerson = async (id, body) => {
    setError('');
    try {
      const { person } = await accountApi.updateRoster(id, body);
      await refreshRoster();
      return person;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteRosterPerson = async (id) => {
    setError('');
    try {
      await accountApi.deleteRoster(id);
      await refreshRoster();
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const linkRosterPerson = async (id) => {
    setError('');
    try {
      const result = await accountApi.linkRoster(id);
      if (result.token) setToken(result.token);
      if (result.user) applyUser(result.user);
      await refreshRoster();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const unlinkRosterPerson = async (id) => {
    setError('');
    try {
      const { person } = await accountApi.unlinkRoster(id);
      await refreshRoster();
      return person;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    user,
    settings,
    scheduleConfig,
    scheduleConfigLoading,
    rosterPeople,
    rosterLoading,
    loading,
    error,
    offline,
    login,
    loginSheetPreview,
    loginWithGoogle,
    register,
    logout,
    saveProfile,
    saveAvatar,
    saveSettings,
    changePassword,
    saveScheduleConfig,
    saveLockWindows,
    refreshScheduleConfig,
    refreshRoster,
    createRosterPerson,
    updateRosterPerson,
    deleteRosterPerson,
    linkRosterPerson,
    unlinkRosterPerson,
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
