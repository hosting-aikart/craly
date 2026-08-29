import { Router } from 'express';
import { requireAdmin } from '../middlewares/auth';
import {
  getAdminDashboard,
  getAdminAnalytics,
  listUsers,
  getUserDetail,
  listVerificationQueue,
  reviewVerification,
  listReports,
  updateReportStatus,
  listAuditLogs,
} from '../controllers/adminWorkspaceController';
import { updateContractorListingStatus } from '../controllers/staffController';

const router = Router();

// Protect all admin endpoints with requireAdmin middleware
router.use(requireAdmin);

router.get('/dashboard', getAdminDashboard);
router.get('/analytics', getAdminAnalytics);

router.get('/users', listUsers);
router.get('/users/:id', getUserDetail);

router.get('/verification', listVerificationQueue);
router.patch('/verification/:id', reviewVerification);

// The /admin/contractors frontend page calls this — it was never wired to
// a route (its own listAdminContractors controller was a dead import,
// removed during the contractor-architecture reconciliation). Reuses
// listVerificationQueue, which already returns the full contractor list
// when no ?status= filter is given.
router.get('/contractors', listVerificationQueue);
router.patch('/contractors/:id/listing', updateContractorListingStatus);

router.get('/reports', listReports);
router.patch('/reports/:id', updateReportStatus);

router.get('/audit-logs', listAuditLogs);

export default router;
