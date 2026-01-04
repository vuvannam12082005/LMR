import prisma from '../config/database.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';

export async function createOverdueFine(loanId, memberId, overdueDays, ratePerDay) {
  const amount = overdueDays * ratePerDay;
  
  return await prisma.fine.create({
    data: {
      loanId: BigInt(loanId),
      memberId: BigInt(memberId),
      amount: amount,
      reason: 'Overdue',
      status: 'Unpaid'
    }
  });
}

export async function getMemberFines(memberId, status) {
  const where = {
    memberId: BigInt(memberId)
  };
  
  if (status) {
    where.status = status;
  }
  
  return await prisma.fine.findMany({
    where,
    include: {
      loan: {
        include: {
          copy: {
            include: {
              book: {
                select: {
                  title: true,
                  author: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getTotalUnpaid(memberId) {
  const result = await prisma.fine.aggregate({
    where: {
      memberId: BigInt(memberId),
      status: 'Unpaid'
    },
    _sum: {
      amount: true
    }
  });
  
  return result._sum.amount || 0;
}

export async function payFine(fineId, memberId, method) {
  const fine = await prisma.fine.findUnique({
    where: { fineId: BigInt(fineId) }
  });
  
  if (!fine) {
    throw new NotFoundError('Fine not found');
  }
  
  if (fine.memberId.toString() !== memberId) {
    throw new ForbiddenError('Not your fine');
  }
  
  if (fine.status === 'Paid') {
    throw new BadRequestError('Fine already paid');
  }
  
  // Create payment (fake - always succeeds)
  const transactionRef = `TXN${Date.now()}`;
  
  const payment = await prisma.payment.create({
    data: {
      fineId: BigInt(fineId),
      memberId: BigInt(memberId),
      amount: fine.amount,
      method: method || 'Online',
      transactionRef: transactionRef,
      status: 'Success'
    }
  });
  
  // Update fine status
  const updatedFine = await prisma.fine.update({
    where: { fineId: BigInt(fineId) },
    data: {
      status: 'Paid',
      paidAt: new Date()
    }
  });
  
  return { payment, fine: updatedFine };
}

export async function waiveFine(fineId, librarianId, reason) {
  return await prisma.fine.update({
    where: { fineId: BigInt(fineId) },
    data: {
      status: 'Waived',
      waivedById: BigInt(librarianId),
      waivedAt: new Date(),
      waiveReason: reason
    }
  });
}
