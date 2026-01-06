import express from 'express';
import * as loanController from '../controllers/loan.controller.js';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

// Librarian routes
router.get('/', verifyToken, requireRole(['Librarian']), loanController.getAllLoans);
router.post('/', verifyToken, requireRole(['Librarian']), loanController.checkout);
router.put('/:id/return', verifyToken, requireRole(['Librarian']), loanController.checkin);

// Member routes
router.put('/:id/renew', verifyToken, requireRole(['Member']), loanController.renew);

export default router;
