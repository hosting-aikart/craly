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
} from '../controllers/contractorController';
import {
  createEnquiry,
  listEnquiries,
  getEnquiry,
  updateEnquiryStatus,
} from '../controllers/enquiryController';
import { createMessage, listMessages } from '../controllers/messageController';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/notificationController';
import { requireAuth } from '../middlewares/auth';

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

// ── Contractors (public directory — direct listing, no admin approval step) ─────
router.get('/contractors', listContractors);
router.get('/contractors/:id', getContractor);

// ── Enquiries (business → contractor contact, replaces exposing contact info) ───
router.post('/enquiries', requireAuth, createEnquiry);
router.get('/enquiries', requireAuth, listEnquiries);
router.get('/enquiries/:id', requireAuth, getEnquiry);
router.patch('/enquiries/:id/status', requireAuth, updateEnquiryStatus);

// ── Messages (conversation within a single enquiry) ─────────────────────────────
router.post('/enquiries/:id/messages', requireAuth, createMessage);
router.get('/enquiries/:id/messages', requireAuth, listMessages);

// ── Notifications ─────────────────────────────────────────────────────────────
router.get('/notifications', requireAuth, listNotifications);
router.patch('/notifications/read-all', requireAuth, markAllNotificationsRead);
router.patch('/notifications/:id/read', requireAuth, markNotificationRead);

// ── Admin ──────────────────────────────────────────────────────────────────────
import { listAdminContractors, updateContractorVerification } from '../controllers/adminController';
router.get('/admin/contractors', requireAuth, listAdminContractors);
router.patch('/admin/contractors/:id/verify', requireAuth, updateContractorVerification);

export default router;
