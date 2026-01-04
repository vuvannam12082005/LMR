import express from 'express';
import * as reservationController from '../controllers/reservation.controller.js';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

// Member routes
router.post('/', verifyToken, requireRole(['Member']), reservationController.create);
router.delete('/:id', verifyToken, requireRole(['Member']), reservationController.cancel);

export default router;
