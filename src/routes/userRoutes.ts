import { Router } from 'express';
import { adminGetAllUsers, adminUpdateUserRole, getDashboardStats } from '../controllers/userController';
import { verifyToken, verifyAdmin } from '../middleware/auth';

const router = Router();

router.get('/dashboard-stats', verifyToken, getDashboardStats);
router.get('/admin/all', verifyToken, verifyAdmin, adminGetAllUsers);
router.patch('/admin/:id/role', verifyToken, verifyAdmin, adminUpdateUserRole);

export default router;
