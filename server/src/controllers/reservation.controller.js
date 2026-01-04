import { z } from 'zod';
import * as reservationService from '../services/reservation.service.js';

const createReservationSchema = z.object({
  isbn: z.string().min(10).max(20)
});

export async function create(req, res, next) {
  try {
    const data = createReservationSchema.parse(req.body);
    const reservation = await reservationService.create(req.user.userId, data.isbn);
    res.status(201).json(reservation);
  } catch (error) {
    next(error);
  }
}

export async function cancel(req, res, next) {
  try {
    await reservationService.cancel(req.params.id, req.user.userId);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

export async function getMemberReservations(req, res, next) {
  try {
    const memberId = req.params.id || req.user.userId;
    const reservations = await reservationService.getMemberReservations(memberId);
    res.json(reservations);
  } catch (error) {
    next(error);
  }
}
