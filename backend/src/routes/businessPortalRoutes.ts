import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth';
import {
  getDashboardStats,
  getRequirements,
  getRequirementById,
  createRequirement,
  updateRequirement,
  publishRequirement,
  deleteRequirement,
  getRequirementApplications,
  getAllApplications,
  getApplicationById,
  updateApplicationStatus,
} from '../controllers/businessPortalController';

const router = Router();

// All routes require authentication and manufacturer (business) role
router.use(requireAuth, requireRole('business'));

// Dashboard stats
router.get('/dashboard-stats', getDashboardStats);

// Requirements management
router.get('/requirements', getRequirements);
router.post('/requirements', createRequirement);
router.get('/requirements/:id', getRequirementById);
router.patch('/requirements/:id', updateRequirement);
router.post('/requirements/:id/publish', publishRequirement);
router.delete('/requirements/:id', deleteRequirement);
router.get('/requirements/:id/applications', getRequirementApplications);

// Applications review
router.get('/applications', getAllApplications);
router.get('/applications/:id', getApplicationById);
router.patch('/applications/:id/status', updateApplicationStatus);

export default router;
