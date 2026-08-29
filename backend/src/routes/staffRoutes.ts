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
import { getStaffVerificationMessages, sendStaffVerificationMessage } from '../controllers/verificationMessageController';
import {
  uploadDocument,
  listDocuments,
  getDocumentSignedUrl,
  reviewDocument,
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
router.get('/verification/contractors/:id/messages', getStaffVerificationMessages);
router.post('/verification/contractors/:id/messages', sendStaffVerificationMessage);

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

// KYC Documents — reachable from Contractors → select contractor → KYC →
// Documents, for BOTH newly-created and pre-existing contractors. Reuses
// the exact same document storage/controller (R2, contractor_documents)
// as the internal (Ops Head/Field Staff) and contractor-portal
// self-upload paths — see documentController.ts.
router.get('/contractors/:id/documents', listDocuments);
router.post('/contractors/:id/documents', documentUpload, uploadDocument);
router.get('/contractors/:id/documents/:documentId/signed-url', getDocumentSignedUrl);
router.patch('/contractors/:id/documents/:documentId/review', reviewDocument);
router.delete('/contractors/:id/documents/:documentId', deleteDocument);

// Selection engagements
router.get('/engagements', getStaffEngagements);
router.patch('/engagements/:id/status', updateEngagementStatus);

// Notifications
router.get('/notifications', getStaffNotifications);

export default router;
