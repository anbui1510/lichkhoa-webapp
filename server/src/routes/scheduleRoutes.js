import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requireAdmin } from '../middlewares/requireAdmin.js';
import { requireScheduleWrite } from '../middlewares/requireScheduleWrite.js';
import { validateBody } from '../middlewares/validateRequest.js';
import { scheduleConfigUpdateSchema } from '../validators/scheduleConfigValidator.js';
import { lockWindowsUpdateSchema } from '../validators/lockWindowsValidator.js';
import { scheduleDataPutSchema } from '../validators/scheduleDataValidator.js';
import * as scheduleConfigController from '../controllers/scheduleConfigController.js';
import * as scheduleDataController from '../controllers/scheduleDataController.js';

const router = Router();

router.use(authMiddleware);
router.get('/config', scheduleConfigController.getConfig);
router.put(
  '/config',
  requireAdmin,
  validateBody(scheduleConfigUpdateSchema),
  scheduleConfigController.putConfig
);
router.put(
  '/lock-windows',
  requireAdmin,
  validateBody(lockWindowsUpdateSchema),
  scheduleConfigController.putLockWindows
);

router.get('/data', scheduleDataController.getData);
router.put(
  '/data',
  requireScheduleWrite,
  validateBody(scheduleDataPutSchema),
  scheduleDataController.putData
);

export default router;
