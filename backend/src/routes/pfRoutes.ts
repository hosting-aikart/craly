import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth';
import {
  createPfContractor,
  listPfContractors,
  getPfContractor,
  updatePfContractor,
  updatePfContractorVerification,
  updatePfContractorAvailability,
} from '../controllers/pfContractorController';
import {
  uploadDocument,
  listDocuments,
  getDocumentSignedUrl,
  reviewDocument,
  deleteDocument,
  documentUpload,
} from '../controllers/documentController';

const router = Router();

// Every route here is internal-staff-only — Ops Head or Field Intelligence Staff.
router.use(requireAuth, requireRole('ops_head', 'field_staff'));

router.post('/contractors', createPfContractor);
router.get('/contractors', listPfContractors);
router.get('/contractors/:id', getPfContractor);
router.patch('/contractors/:id', updatePfContractor);
router.patch('/contractors/:id/availability', updatePfContractorAvailability);

// Verification is Ops Head only — layered on top of the router-wide gate.
router.patch('/contractors/:id/verification', requireRole('ops_head'), updatePfContractorVerification);

// Verification Documents (R2 Cloudflare storage)
router.post('/contractors/:id/documents', documentUpload, uploadDocument);
router.get('/contractors/:id/documents', listDocuments);
router.get('/contractors/:id/documents/:documentId/signed-url', getDocumentSignedUrl);
router.patch('/contractors/:id/documents/:documentId/review', requireRole('ops_head'), reviewDocument);
router.delete('/contractors/:id/documents/:documentId', requireRole('ops_head'), deleteDocument);

export default router;
