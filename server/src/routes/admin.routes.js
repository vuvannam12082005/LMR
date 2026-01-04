import express from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

// All admin routes require Administrator role
router.use(verifyToken);
router.use(requireRole(['Administrator']));

// User management
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);

// Config management
router.get('/config', adminController.getConfig);
router.put('/config/:key', adminController.updateConfig);

// Audit logs
router.get('/audit-logs', adminController.getAuditLogs);

export default router;
