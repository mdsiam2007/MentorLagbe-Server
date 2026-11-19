import { Router } from 'express';
import {
  adminGetAllUsers,
  adminUpdateUserRole,
  getDashboardStats,
  getPublicTutors,
  getPublicTutorById,
  toggleBookmark,
  getBookmarkedTuitions,
  getBookmarkedIds
} from '../controllers/userController';
import { verifyToken, verifyAdmin, verifyStudent } from '../middleware/auth';

const router = Router();

// Student bookmark routes
router.get('/bookmarks', verifyToken, verifyStudent, getBookmarkedTuitions);
router.get('/bookmarks/ids', verifyToken, verifyStudent, getBookmarkedIds);
router.post('/bookmarks/:tuitionId', verifyToken, verifyStudent, toggleBookmark);

// Public tutor directory
router.get('/tutors', getPublicTutors);
router.get('/tutors/:id', getPublicTutorById);

// Protected routes
router.get('/dashboard-stats', verifyToken, getDashboardStats);
router.get('/admin/all', verifyToken, verifyAdmin, adminGetAllUsers);
router.patch('/admin/:id/role', verifyToken, verifyAdmin, adminUpdateUserRole);

export default router;
