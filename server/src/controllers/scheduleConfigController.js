import * as scheduleConfigService from '../services/scheduleConfigService.js';

export async function getConfig(req, res) {
  try {
    const config = await scheduleConfigService.getScheduleConfig();
    return res.json({ config });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.message || 'Không đọc được cấu hình lịch khoa.'
    });
  }
}

export async function putConfig(req, res) {
  try {
    const config = await scheduleConfigService.saveScheduleConfig(req.validated, {
      userId: req.user.id
    });
    return res.json({ config });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.message || 'Lưu liên kết Spreadsheet thất bại.'
    });
  }
}

export async function putLockWindows(req, res) {
  try {
    const config = await scheduleConfigService.saveLockWindows(req.validated, {
      userId: req.user.id
    });
    return res.json({ config });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.message || 'Lưu hạn khóa lịch thất bại.'
    });
  }
}
