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

export default router;
