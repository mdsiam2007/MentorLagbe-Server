import { Router } from 'express';
import {
  getApprovedTuitions,
  getFeaturedTuitions,
  getTuitionById,
  createTuition,
  getMyTuitions,
  updateTuition,
  deleteTuition,
  toggleActiveStatus,
  adminGetAllTuitions,
  adminUpdateApprovalStatus,
  submitTuitionReview,
  getTuitionReviews
} from '../controllers/tuitionController';
import { verifyToken, verifyTutor, verifyAdmin, verifyStudent } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/', getApprovedTuitions);
router.get('/featured', getFeaturedTuitions);
router.get('/:id', getTuitionById);
router.get('/:id/reviews', getTuitionReviews);

// Student review route
router.post('/:id/reviews', verifyToken, verifyStudent, submitTuitionReview);

// Tutor routes
router.post('/', verifyToken, verifyTutor, createTuition);
router.get('/tutor/my-tuitions', verifyToken, verifyTutor, getMyTuitions);
router.patch('/:id', verifyToken, verifyTutor, updateTuition);
router.delete('/:id', verifyToken, verifyTutor, deleteTuition);
router.patch('/:id/toggle-status', verifyToken, verifyTutor, toggleActiveStatus);

// Admin routes
router.get('/admin/all', verifyToken, verifyAdmin, adminGetAllTuitions);
router.patch('/admin/:id/status', verifyToken, verifyAdmin, adminUpdateApprovalStatus);

export default router;
