import { Router } from 'express';
import { healthCheck } from '../controllers/healthController';
import {
  listContractors,
  getContractor,
  createContractor,
  verifyContractor,
} from '../controllers/contractorController';

const router = Router();

// ── Health ────────────────────────────────────────────────────────────────────
router.get('/health', healthCheck);

// ── Contractors ───────────────────────────────────────────────────────────────
router.get('/contractors',           listContractors);
router.get('/contractors/:id',       getContractor);
router.post('/contractors',          createContractor);
router.post('/contractors/:id/verify', verifyContractor);

export default router;
