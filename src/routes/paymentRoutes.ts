import { Router } from 'express';
import {
  createCheckoutSession,
  verifySession,
  getAdminTransactions
} from '../controllers/paymentController';
import { verifyToken, verifyAdmin } from '../middleware/auth';

const router = Router();

router.post('/create-checkout-session', verifyToken, createCheckoutSession);
router.get('/verify-session', verifySession);
router.get('/admin/transactions', verifyToken, verifyAdmin, getAdminTransactions);

export default router;
