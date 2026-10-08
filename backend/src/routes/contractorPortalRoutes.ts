import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth';
import {
  getOpportunities,
  getOpportunityById,
  applyToOpportunity,
  getMyApplications,
  getApplicationById,
  getDashboardStats,
} from '../controllers/contractorPortalController';
import {
  uploadMyDocument,
  listMyDocuments,
  getMyDocumentSignedUrl,
  deleteMyDocument,
  documentUpload,
} from '../controllers/documentController';
import { getMyVerificationMessages, sendMyVerificationMessage } from '../controllers/verificationMessageController';
import {
  getMyWorksitePhotos,
  uploadMyWorksitePhotos,
  deleteMyWorksitePhoto,
  worksitePhotoUpload,
} from '../controllers/worksitePhotoController';

const router = Router();

// All contractor-portal routes require authentication and contractor role
router.use(requireAuth, requireRole('contractor'));

// Dashboard metrics
router.get('/dashboard-stats', getDashboardStats);

// Opportunities
router.get('/opportunities', getOpportunities);
router.get('/opportunities/:id', getOpportunityById);
router.post('/opportunities/:id/apply', applyToOpportunity);

// Applications
router.get('/applications', getMyApplications);
router.get('/applications/:id', getApplicationById);

// KYC & Verification Documents (file storage — R2 or S3, see src/storage)
router.get('/documents', listMyDocuments);
router.post('/documents', documentUpload, uploadMyDocument);
router.get('/documents/:documentId/signed-url', getMyDocumentSignedUrl);
router.delete('/documents/:documentId', deleteMyDocument);

// Worksite Photos (file storage — R2 or S3; max 10 photos, max 10MB each)
router.get('/worksite-photos', getMyWorksitePhotos);
router.post('/worksite-photos', worksitePhotoUpload, uploadMyWorksitePhotos);
router.delete('/worksite-photos/:photoId', deleteMyWorksitePhoto);

// Verification review thread (Contractor Application / Approval workflow)
router.get('/verification/messages', getMyVerificationMessages);
router.post('/verification/messages', sendMyVerificationMessage);

export default router;
