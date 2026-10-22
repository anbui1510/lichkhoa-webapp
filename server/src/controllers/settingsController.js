import * as settingsService from '../services/settingsService.js';

export async function getSettings(req, res) {
  const settings = req.user.settings || await settingsService.updateSettings(req.user.id, {});
  return res.json({ settings });
}

export async function updateSettings(req, res) {
  try {
    const settings = await settingsService.updateSettings(req.user.id, req.validated);
    return res.json({ settings });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'Cập nhật cài đặt thất bại.' });
  }
}

export async function updatePassword(req, res) {
  try {
    await settingsService.changePassword(req.user.id, req.validated);
    return res.json({ ok: true, message: 'Đã đổi mật khẩu.' });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'Đổi mật khẩu thất bại.' });
  }
}

export async function updateSecurity(req, res) {
  try {
    const { twoFactorEnabled, privacyMode } = req.validated;
    const settings = await settingsService.updateSettings(req.user.id, {
      ...(twoFactorEnabled !== undefined ? { twoFactorEnabled } : {}),
      ...(privacyMode !== undefined ? { privacyMode } : {})
    });
    return res.json({ settings });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'Cập nhật bảo mật thất bại.' });
  }
}

export async function getNotifications(req, res) {
  const settings = req.user.settings || await settingsService.updateSettings(req.user.id, {});
  return res.json({
    emailNotifications: settings.emailNotifications,
    pushNotifications: settings.pushNotifications
  });
}
