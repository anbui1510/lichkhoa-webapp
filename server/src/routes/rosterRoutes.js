import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requireAdmin } from '../middlewares/requireAdmin.js';
import { validateBody } from '../middlewares/validateRequest.js';
import { rosterCreateSchema, rosterUpdateSchema } from '../validators/rosterValidator.js';
import * as rosterController from '../controllers/rosterController.js';

const router = Router();

router.use(authMiddleware);

router.get('/', rosterController.list);
router.post('/', requireAdmin, validateBody(rosterCreateSchema), rosterController.create);
router.patch('/:id', requireAdmin, validateBody(rosterUpdateSchema), rosterController.update);
router.delete('/:id', requireAdmin, rosterController.remove);
router.post('/:id/link', rosterController.link);
router.post('/:id/unlink', requireAdmin, rosterController.unlink);

export default router;
