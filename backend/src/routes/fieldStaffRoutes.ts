import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth';
import { getFieldStaffDashboard, getMyActivity } from '../controllers/fieldStaffController';

const router = Router();

// Field Staff / Ops Head only — the same split used by pfRoutes.ts. No
// manufacturer/revenue/subscription/admin data is ever reachable through
// this router (that stays under /admin, gated by requireAdmin).
router.use(requireAuth, requireRole('ops_head', 'field_staff'));

router.get('/dashboard', getFieldStaffDashboard);
router.get('/activity', getMyActivity);

export default router;
