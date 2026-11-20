import { Router } from 'express';
import {
  applyForTuition,
  getStudentApplications,
  cancelApplication,
  getTutorApplicants,
  updateApplicantStatus
} from '../controllers/applicationController';
import { verifyToken, verifyStudent, verifyTutor } from '../middleware/auth';

const router = Router();

// Student routes
router.post('/', verifyToken, verifyStudent, applyForTuition);
router.post('/apply', verifyToken, verifyStudent, applyForTuition);
router.get('/my-applications', verifyToken, verifyStudent, getStudentApplications);
router.delete('/:id', verifyToken, verifyStudent, cancelApplication);

// Tutor routes
router.get('/tutor/applicants', verifyToken, verifyTutor, getTutorApplicants);
router.patch('/:id/status', verifyToken, verifyTutor, updateApplicantStatus);
router.patch('/tutor/:id/status', verifyToken, verifyTutor, updateApplicantStatus);

export default router;
