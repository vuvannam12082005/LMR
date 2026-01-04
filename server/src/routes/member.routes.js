import express from 'express';
import * as loanController from '../controllers/loan.controller.js';
import * as reservationController from '../controllers/reservation.controller.js';
import * as fineController from '../controllers/fine.controller.js';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

// /api/me/* routes (member's own data)
router.get('/me/loans', verifyToken, requireRole(['Member']), loanController.getMemberLoans);
router.get('/me/history', verifyToken, requireRole(['Member']), loanController.getMemberHistory);
router.get('/me/reservations', verifyToken, requireRole(['Member']), reservationController.getMemberReservations);
router.get('/me/fines', verifyToken, requireRole(['Member']), fineController.getMemberFines);

// /api/members/:id/* routes (librarian/admin access)
router.get('/members/:id/loans', verifyToken, requireRole(['Librarian']), loanController.getMemberLoans);
router.get('/members/:id/history', verifyToken, requireRole(['Librarian']), loanController.getMemberHistory);
router.get('/members/:id/reservations', verifyToken, requireRole(['Librarian']), reservationController.getMemberReservations);
router.get('/members/:id/fines', verifyToken, requireRole(['Librarian']), fineController.getMemberFines);

export default router;
