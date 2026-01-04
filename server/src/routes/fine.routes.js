import express from 'express';
import * as fineController from '../controllers/fine.controller.js';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

// Member routes
router.post('/:id/pay', verifyToken, requireRole(['Member']), fineController.payFine);

export default router;
