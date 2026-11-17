import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requireAdmin } from '../middlewares/requireAdmin.js';
import { validateBody } from '../middlewares/validateRequest.js';
import { scheduleConfigUpdateSchema } from '../validators/scheduleConfigValidator.js';
import * as scheduleConfigController from '../controllers/scheduleConfigController.js';

const router = Router();

router.use(authMiddleware);
router.get('/config', scheduleConfigController.getConfig);
router.put(
  '/config',
  requireAdmin,
  validateBody(scheduleConfigUpdateSchema),
  scheduleConfigController.putConfig
);

export default router;
