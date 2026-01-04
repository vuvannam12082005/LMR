import { z } from 'zod';
import * as authService from '../services/auth.service.js';

const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  membershipType: z.enum(['Student', 'Faculty', 'Public'])
});

const loginSchema = z.object({
  usernameOrEmail: z.string().min(1),
  password: z.string().min(1)
});

export async function register(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);
    const result = await authService.register(data);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const credentials = loginSchema.parse(req.body);
    const result = await authService.login(credentials);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getMe(req, res, next) {
  try {
    const user = await authService.getMe(req.user.userId);
    res.json(user);
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}
