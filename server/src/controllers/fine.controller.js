import { z } from 'zod';
import * as fineService from '../services/fine.service.js';

const payFineSchema = z.object({
  method: z.enum(['Cash', 'Card', 'Online']).optional()
});

export async function getMemberFines(req, res, next) {
  try {
    const memberId = req.params.id || req.user.userId;
    const fines = await fineService.getMemberFines(memberId, req.query.status);
    res.json(fines);
  } catch (error) {
    next(error);
  }
}

export async function payFine(req, res, next) {
  try {
    const data = payFineSchema.parse(req.body);
    const result = await fineService.payFine(req.params.id, req.user.userId, data.method);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
