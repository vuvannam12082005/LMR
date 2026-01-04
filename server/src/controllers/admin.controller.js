import { z } from 'zod';
import * as userService from '../services/user.service.js';
import * as configService from '../services/config.service.js';
import * as auditService from '../services/audit.service.js';

const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  role: z.enum(['Member', 'Librarian', 'Administrator']),
  status: z.enum(['Active', 'Inactive', 'Locked', 'Pending']).optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(255).optional(),
  // Member fields
  membershipType: z.enum(['Student', 'Faculty', 'Public']).optional(),
  // Librarian fields
  employeeId: z.string().max(20).optional(),
  department: z.string().max(50).optional(),
  hireDate: z.string().optional(),
  // Admin fields
  adminLevel: z.number().int().optional(),
  permissions: z.string().optional()
});

const updateUserSchema = z.object({
  role: z.enum(['Member', 'Librarian', 'Administrator']).optional(),
  status: z.enum(['Active', 'Inactive', 'Locked', 'Pending']).optional(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(255).optional()
});

const updateConfigSchema = z.object({
  value: z.string().min(1)
});

// User Management
export async function getUsers(req, res, next) {
  try {
    const users = await userService.getUsers(req.query);
    res.json(users);
  } catch (error) {
    next(error);
  }
}

export async function createUser(req, res, next) {
  try {
    const data = createUserSchema.parse(req.body);
    const user = await userService.createUser(data);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req, res, next) {
  try {
    const data = updateUserSchema.parse(req.body);
    const user = await userService.updateUser(req.params.id, data);
    res.json(user);
  } catch (error) {
    next(error);
  }
}

// Config Management
export async function getConfig(req, res, next) {
  try {
    const config = await configService.getAll();
    res.json(config);
  } catch (error) {
    next(error);
  }
}

export async function updateConfig(req, res, next) {
  try {
    const data = updateConfigSchema.parse(req.body);
    const config = await configService.update(req.params.key, data.value);
    res.json(config);
  } catch (error) {
    next(error);
  }
}

// Audit Logs
export async function getAuditLogs(req, res, next) {
  try {
    const logs = await auditService.getLogs(req.query);
    res.json(logs);
  } catch (error) {
    next(error);
  }
}
