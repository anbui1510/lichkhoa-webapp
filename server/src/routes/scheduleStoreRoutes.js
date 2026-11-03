import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { validateBody } from '../middlewares/validateRequest.js';
import { scheduleStorePutSchema } from '../validators/scheduleStoreValidator.js';
import * as scheduleStoreController from '../controllers/scheduleStoreController.js';

const router = Router();

router.use(authMiddleware);
router.get('/', scheduleStoreController.getStore);
router.put('/', validateBody(scheduleStorePutSchema), scheduleStoreController.putStore);

export default router;
