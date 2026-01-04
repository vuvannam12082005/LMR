import prisma from '../config/database.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';

export async function create(memberId, isbn) {
  // Verify book exists
  const book = await prisma.book.findUnique({
    where: { isbn }
  });
  
  if (!book) {
    throw new NotFoundError('Book not found');
  }
  
  return await prisma.reservation.create({
    data: {
      memberId: BigInt(memberId),
      isbn: isbn,
      status: 'Pending',
      reserveDate: new Date()
    },
    include: {
      book: true
    }
  });
}

export async function cancel(reserveId, memberId) {
  const reservation = await prisma.reservation.findUnique({
    where: { reserveId: BigInt(reserveId) }
  });
  
  if (!reservation) {
    throw new NotFoundError('Reservation not found');
  }
  
  if (reservation.memberId.toString() !== memberId) {
    throw new ForbiddenError('Not your reservation');
  }
  
  await prisma.reservation.update({
    where: { reserveId: BigInt(reserveId) },
    data: { status: 'Cancelled' }
  });
}

export async function getMemberReservations(memberId) {
  return await prisma.reservation.findMany({
    where: {
      memberId: BigInt(memberId)
    },
    include: {
      book: {
        select: {
          isbn: true,
          title: true,
          author: true
        }
      }
    },
    orderBy: { reserveDate: 'desc' }
  });
}

export async function findPendingByISBN(isbn) {
  return await prisma.reservation.findMany({
    where: {
      isbn: isbn,
      status: 'Pending'
    },
    orderBy: { reserveDate: 'asc' }
  });
}

export async function fulfillEarliest(isbn, holdDays) {
  const pending = await findPendingByISBN(isbn);
  
  if (pending.length === 0) {
    return null;
  }
  
  const earliest = pending[0];
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + holdDays);
  
  return await prisma.reservation.update({
    where: { reserveId: earliest.reserveId },
    data: {
      status: 'Fulfilled',
      expiryDate: expiryDate
    }
  });
}
