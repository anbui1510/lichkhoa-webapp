import * as profileService from '../services/profileService.js';
import { toProfilePayload } from '../utils/userDto.js';

export async function getProfile(req, res) {
  return res.json({ user: toProfilePayload(req.user) });
}

export async function updateProfile(req, res) {
  try {
    const user = await profileService.updateProfile(req.user.id, req.validated);
    return res.json({ user });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'Cập nhật hồ sơ thất bại.' });
  }
}

export async function uploadAvatar(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Chưa chọn ảnh avatar.' });
    }
    const user = await profileService.updateAvatar(req.user.id, req.file);
    return res.json({ user });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'Upload avatar thất bại.' });
  }
}
