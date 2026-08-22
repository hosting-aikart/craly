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

const router = Router();

// Every route here is internal-staff-only — Ops Head or Field Intelligence
// Staff. There is no contractor-facing route in this file: contractors have
// no platform login in Phase 1 (see docs/open-decisions.md).
router.use(requireAuth, requireRole('ops_head', 'field_staff'));

router.post('/contractors', createPfContractor);
router.get('/contractors', listPfContractors);
router.get('/contractors/:id', getPfContractor);
router.patch('/contractors/:id', updatePfContractor);
router.patch('/contractors/:id/availability', updatePfContractorAvailability);

// Verification is Ops Head only — layered on top of the router-wide gate.
router.patch('/contractors/:id/verification', requireRole('ops_head'), updatePfContractorVerification);

export default router;
