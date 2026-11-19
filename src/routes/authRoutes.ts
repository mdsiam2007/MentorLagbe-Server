import { Router } from 'express';
import { register, login, getMe, updateProfile } from '../controllers/authController';
import { verifyToken } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', verifyToken, getMe);
router.patch('/profile', verifyToken, updateProfile);

export default router;
