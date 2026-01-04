import express from 'express';
import * as bookController from '../controllers/book.controller.js';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

// Public routes
router.get('/', bookController.search);
router.get('/:isbn', bookController.getByISBN);

// Librarian routes
router.post('/', verifyToken, requireRole(['Librarian']), bookController.create);
router.put('/:isbn', verifyToken, requireRole(['Librarian']), bookController.update);
router.post('/:isbn/copies', verifyToken, requireRole(['Librarian']), bookController.addCopy);

export default router;
