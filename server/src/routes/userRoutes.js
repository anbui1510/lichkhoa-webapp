import { Router } from 'express';
import { validateBody } from '../middlewares/validateRequest.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { loginSchema, registerSchema } from '../validators/profileValidator.js';
import * as userController from '../controllers/userController.js';

const router = Router();

router.post('/register', validateBody(registerSchema), userController.register);
router.post('/login', validateBody(loginSchema), userController.login);
router.get('/me', authMiddleware, userController.me);

export default router;
