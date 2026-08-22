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
  acceptEnquiry,
  declineEnquiry,
  updateEnquiryStatus,
} from '../controllers/enquiryController';
import { createMessage, listMessages } from '../controllers/messageController';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/notificationController';
import {
  createContractorRequest,
  listContractorRequests,
  getContractorRequest,
  updateContractorRequestStatus,
  startContractorProfile,
  submitContractorRequestForReview,
} from '../controllers/contractorRequestController';
import { requireAuth, requireRole } from '../middlewares/auth';

const router = Router();

// ── Health ────────────────────────────────────────────────────────────────────
router.get('/health', healthCheck);

// ── Auth ──────────────────────────────────────────────────────────────────────
router.use('/auth', authRoutes);

// ── Contact ───────────────────────────────────────────────────────────────────
const contactRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many messages sent. Please try again later.' } },
});
router.post('/contact', contactRateLimit, submitContactForm);

// ── Contractor Onboarding Requests ("List Your Company" — public lead intake) ──
// Public POST, same rate-limit shape as /contact since it's another
// unauthenticated form a bot could hammer. Everything past creation is
// Field Staff / Ops Head / Admin only.
router.post('/contractor-requests', contactRateLimit, createContractorRequest);
router.get('/contractor-requests', requireAuth, requireRole('ops_head', 'field_staff', 'admin'), listContractorRequests);
router.get('/contractor-requests/:id', requireAuth, requireRole('ops_head', 'field_staff', 'admin'), getContractorRequest);
router.patch('/contractor-requests/:id/status', requireAuth, requireRole('ops_head', 'field_staff', 'admin'), updateContractorRequestStatus);
router.post('/contractor-requests/:id/start-profile', requireAuth, requireRole('ops_head', 'field_staff', 'admin'), startContractorProfile);
router.post('/contractor-requests/:id/submit-for-review', requireAuth, requireRole('ops_head', 'field_staff', 'admin'), submitContractorRequestForReview);

// ── Profile ───────────────────────────────────────────────────────────────────
router.get('/profile/me', requireAuth, getMyProfile);
router.patch('/profile/me', requireAuth, updateMyProfile);

// ── Categories ───────────────────────────────────────────────────────────────
router.get('/categories', listCategories);

// ── Contractors ───────────────────────────────────────────────────────────────
router.get('/contractors', listContractors);
router.get('/contractors/:id', getContractor);

// ── Enquiries Workflow ────────────────────────────────────────────────────────
router.post('/enquiries', requireAuth, createEnquiry);
router.get('/enquiries', requireAuth, listEnquiries);
router.get('/enquiries/:id', requireAuth, getEnquiry);
router.patch('/enquiries/:id/accept', requireAuth, acceptEnquiry);
router.patch('/enquiries/:id/decline', requireAuth, declineEnquiry);
router.patch('/enquiries/:id/status', requireAuth, updateEnquiryStatus);

// ── Messages (business <-> internal staff, within a brokered enquiry) ──────────
router.post('/enquiries/:id/messages', requireAuth, createMessage);
router.get('/enquiries/:id/messages', requireAuth, listMessages);

// Google Calendar/Meet and Meetings are unwired for Phase 1 — not in scope
// (contractors have no login to authorize a calendar event, and it isn't
// part of the brokered-enquiry model). Controllers are left in place,
// unused, in case a later phase wants them back.

// ── Notifications ─────────────────────────────────────────────────────────────
router.get('/notifications', requireAuth, listNotifications);
router.patch('/notifications/read-all', requireAuth, markAllNotificationsRead);
router.patch('/notifications/:id/read', requireAuth, markNotificationRead);

import adminRoutes from './adminRoutes';

// ── Admin Workspace ─────────────────────────────────────────────────────────────
router.use('/admin', adminRoutes);

import pfRoutes from './pfRoutes';

// ── Prima Facie: internal-staff-managed contractor records ──────────────────────
// Deliberately separate from the /contractors self-service routes above —
// this is the non-login contractor entity model (see docs/open-decisions.md).
router.use('/internal', pfRoutes);

import fieldStaffRoutes from './fieldStaffRoutes';

// ── Field Staff workspace: dashboard + activity log ──────────────────────────
router.use('/field-staff', fieldStaffRoutes);

import contractorPortalRoutes from './contractorPortalRoutes';

// ── Contractor Portal: opportunities, applications, contractor workspace ──────
router.use('/contractor-portal', contractorPortalRoutes);

export default router;

