import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { healthCheck } from '../controllers/healthController';
import authRoutes from './authRoutes';
import { submitContactForm } from '../controllers/contactController';
import { getMyProfile, updateMyProfile } from '../controllers/profileController';
import { listCategories } from '../controllers/categoryController';
import {
  listContractors,
  getContractor,
  verifyContractor,
} from '../controllers/contractorController';
import { requireAuth } from '../middlewares/auth';
import { requireRole } from '../middlewares/requireRole';

const router = Router();

// ── Health ────────────────────────────────────────────────────────────────────
router.get('/health', healthCheck);

// ── Auth ──────────────────────────────────────────────────────────────────────
router.use('/auth', authRoutes);

// ── Contact ───────────────────────────────────────────────────────────────────
// Public + sends a real email per request, so keep it capped: 5 per 15 min per IP.
const contactRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many messages sent. Please try again later.' } },
});
router.post('/contact', contactRateLimit, submitContactForm);

// ── Profile (the logged-in user's own contractor/business profile) ─────────────
router.get('/profile/me', requireAuth, getMyProfile);
router.patch('/profile/me', requireAuth, updateMyProfile);

// ── Categories ───────────────────────────────────────────────────────────────
router.get('/categories', listCategories);

// ── Contractors (public directory) ──────────────────────────────────────────────
router.get('/contractors', listContractors);
router.get('/contractors/:id', getContractor);
router.post('/contractors/:id/verify', requireAuth, requireRole('admin'), verifyContractor);

export default router;
