import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { healthCheck } from '../controllers/healthController';
import authRoutes from './authRoutes';
import { submitContactForm } from '../controllers/contactController';
import {
  listContractors,
  getContractor,
  createContractor,
  verifyContractor,
} from '../controllers/contractorController';

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

// ── Contractors ───────────────────────────────────────────────────────────────
router.get('/contractors',           listContractors);
router.get('/contractors/:id',       getContractor);
router.post('/contractors',          createContractor);
router.post('/contractors/:id/verify', verifyContractor);

export default router;
