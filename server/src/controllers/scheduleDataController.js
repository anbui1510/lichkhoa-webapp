import * as scheduleDataService from '../services/scheduleDataService.js';

export async function getData(req, res) {
  try {
    const data = await scheduleDataService.getScheduleData();
    return res.json(data);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.message || 'Không đọc được lịch từ Google Sheet.'
    });
  }
}

export async function putData(req, res) {
  try {
    const result = await scheduleDataService.putScheduleData(req.validated, {
      userId: req.user.id
    });
    return res.json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.message || 'Không ghi được lịch lên Google Sheet.'
    });
  }
}
