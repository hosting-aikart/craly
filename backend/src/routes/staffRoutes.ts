import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth';
import {
  getStaffDashboardStats,
  getContractors,
  createContractor,
  getContractorById,
  updateContractor,
  updateContractorListingStatus,
  getStaffEngagements,
  updateEngagementStatus,
  getStaffNotifications,
  getStaffVerificationContractors,
  getStaffVerificationContractorById,
  getStaffDocumentSignedUrl,
  reviewStaffDocument,
  updateStaffContractorVerificationStatus,
} from '../controllers/staffController';
import {
  uploadDocument,
  listDocuments,
  getDocumentSignedUrl,
  deleteDocument,
  documentUpload,
} from '../controllers/documentController';

const router = Router();

// Staff workspace routes require authentication and 'staff' (or 'admin') role
router.use(requireAuth, requireRole('staff', 'admin'));

// Dashboard stats
router.get('/dashboard-stats', getStaffDashboardStats);

// KYC & Verification Review
router.get('/verification/contractors', getStaffVerificationContractors);
router.get('/verification/contractors/:id', getStaffVerificationContractorById);
router.get('/verification/contractors/:id/documents/:documentId/signed-url', getStaffDocumentSignedUrl);
router.patch('/verification/contractors/:id/documents/:documentId/review', reviewStaffDocument);
router.patch('/verification/contractors/:id/status', updateStaffContractorVerificationStatus);

// Contractor management & documents & unlisting
router.get('/contractors', getContractors);
router.post('/contractors', createContractor);
router.get('/contractors/:id', getContractorById);
router.patch('/contractors/:id', updateContractor);
router.patch('/contractors/:id/listing', updateContractorListingStatus);
router.get('/contractors/:id/documents', listDocuments);
router.post('/contractors/:id/documents', documentUpload, uploadDocument);
router.get('/contractors/:id/documents/:documentId/signed-url', getDocumentSignedUrl);
router.delete('/contractors/:id/documents/:documentId', deleteDocument);

// Selection engagements
router.get('/engagements', getStaffEngagements);
router.patch('/engagements/:id/status', updateEngagementStatus);

// Notifications
router.get('/notifications', getStaffNotifications);

export default router;
