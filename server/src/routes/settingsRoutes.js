import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { validateBody } from '../middlewares/validateRequest.js';
import {
  passwordUpdateSchema,
  settingsUpdateSchema
} from '../validators/profileValidator.js';
import * as settingsController from '../controllers/settingsController.js';

const router = Router();

router.use(authMiddleware);
router.get('/', settingsController.getSettings);
router.put('/', validateBody(settingsUpdateSchema), settingsController.updateSettings);
router.put('/password', validateBody(passwordUpdateSchema), settingsController.updatePassword);
router.put('/security', validateBody(settingsUpdateSchema), settingsController.updateSecurity);
router.get('/notifications', settingsController.getNotifications);

export default router;
