import * as scheduleStoreService from '../services/scheduleStoreService.js';

export async function getStore(req, res, next) {
  try {
    const row = await scheduleStoreService.getStoreForUser(req.user.id);
    if (!row) {
      return res.status(404).json({ error: 'Chưa có dữ liệu lịch trên máy chủ.' });
    }
    return res.json({
      payload: row.payload,
      updatedAt: row.updatedAt,
      createdAt: row.createdAt,
    });
  } catch (error) {
    return next(error);
  }
}

export async function putStore(req, res, next) {
  try {
    const { payload } = req.body;
    const row = await scheduleStoreService.upsertStoreForUser(req.user.id, payload);
    return res.json({
      payload: row.payload,
      updatedAt: row.updatedAt,
      createdAt: row.createdAt,
    });
  } catch (error) {
    return next(error);
  }
}
