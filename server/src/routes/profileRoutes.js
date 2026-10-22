import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { validateBody } from '../middlewares/validateRequest.js';
import { profileUpdateSchema } from '../validators/profileValidator.js';
import { avatarUpload } from '../utils/uploadAvatar.js';
import * as profileController from '../controllers/profileController.js';

const router = Router();

router.use(authMiddleware);
router.get('/', profileController.getProfile);
router.put('/', validateBody(profileUpdateSchema), profileController.updateProfile);
router.post('/avatar', avatarUpload.single('avatar'), profileController.uploadAvatar);

export default router;
