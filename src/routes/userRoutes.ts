import { Router } from 'express';
import {
  adminGetAllUsers,
  adminUpdateUserRole,
  getDashboardStats,
  getPublicTutors,
  getPublicTutorById
} from '../controllers/userController';
import { verifyToken, verifyAdmin } from '../middleware/auth';

const router = Router();

// Public tutor directory
router.get('/tutors', getPublicTutors);
router.get('/tutors/:id', getPublicTutorById);

// Protected routes
router.get('/dashboard-stats', verifyToken, getDashboardStats);
router.get('/admin/all', verifyToken, verifyAdmin, adminGetAllUsers);
router.patch('/admin/:id/role', verifyToken, verifyAdmin, adminUpdateUserRole);

export default router;
