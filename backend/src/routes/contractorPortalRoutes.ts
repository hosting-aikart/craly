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

// KYC & Verification Documents (R2 Cloudflare storage)
router.get('/documents', listMyDocuments);
router.post('/documents', documentUpload, uploadMyDocument);
router.get('/documents/:documentId/signed-url', getMyDocumentSignedUrl);
router.delete('/documents/:documentId', deleteMyDocument);

export default router;
