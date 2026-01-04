import { z } from 'zod';
import * as loanService from '../services/loan.service.js';

const checkoutSchema = z.object({
  memberCode: z.string().min(1),
  barcode: z.string().min(1)
});

export async function checkout(req, res, next) {
  try {
    const data = checkoutSchema.parse(req.body);
    const loan = await loanService.checkout(data.memberCode, data.barcode, req.user.userId);
    res.status(201).json(loan);
  } catch (error) {
    next(error);
  }
}

export async function checkin(req, res, next) {
  try {
    const result = await loanService.checkin(req.params.id, req.user.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function renew(req, res, next) {
  try {
    const loan = await loanService.renew(req.params.id, req.user.userId);
    res.json(loan);
  } catch (error) {
    next(error);
  }
}

export async function getMemberLoans(req, res, next) {
  try {
    const memberId = req.params.id || req.user.userId;
    const loans = await loanService.getMemberLoans(memberId, req.query.status);
    res.json(loans);
  } catch (error) {
    next(error);
  }
}

export async function getMemberHistory(req, res, next) {
  try {
    const memberId = req.params.id || req.user.userId;
    const history = await loanService.getMemberHistory(memberId);
    res.json(history);
  } catch (error) {
    next(error);
  }
}
