import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth';
import {
  getStaffDashboardStats,
  getContractors,
  createContractor,
  getContractorById,
  updateContractor,
  getStaffEngagements,
  updateEngagementStatus,
  getStaffNotifications,
} from '../controllers/staffController';

const router = Router();

// Staff workspace routes require authentication and 'staff' (or 'admin') role
router.use(requireAuth, requireRole('staff', 'admin'));

// Dashboard stats
router.get('/dashboard-stats', getStaffDashboardStats);

// Contractor management
router.get('/contractors', getContractors);
router.post('/contractors', createContractor);
router.get('/contractors/:id', getContractorById);
router.patch('/contractors/:id', updateContractor);

// Selection engagements
router.get('/engagements', getStaffEngagements);
router.patch('/engagements/:id/status', updateEngagementStatus);

// Notifications
router.get('/notifications', getStaffNotifications);

export default router;
