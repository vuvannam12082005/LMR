import prisma from '../config/database.js';
import { NotFoundError, BadRequestError, ConflictError, ForbiddenError } from '../utils/errors.js';
import * as configService from './config.service.js';
import * as fineService from './fine.service.js';
import * as reservationService from './reservation.service.js';
import * as auditService from './audit.service.js';

export async function checkout(username, barcode, librarianUserId) {
  return await prisma.$transaction(async (tx) => {
    // Get librarian record from user ID
    const librarian = await tx.librarian.findUnique({
      where: { librarianId: BigInt(librarianUserId) }
    });
    
    if (!librarian) {
      throw new ForbiddenError('User is not a librarian');
    }
    
    // Step 1: Find and validate member by username
    const user = await tx.user.findUnique({
      where: { username },
      include: { member: true }
    });
    
    if (!user || !user.member) {
      throw new NotFoundError('Member not found');
    }
    
    const member = user.member;
    member.user = user;
    
    if (member.user.status !== 'Active') {
      throw new BadRequestError('Member account not active');
    }
    
    // Step 2: Check borrowing limit
    const activeLoansCount = await tx.loan.count({
      where: {
        memberId: member.memberId,
        status: 'Active'
      }
    });
    
    if (activeLoansCount >= member.borrowingLimit) {
      throw new BadRequestError('Borrowing limit exceeded');
    }
    
    // Step 3: Get loan period config
    const loanPeriodDays = await configService.getAsNumber('loan_period_days');
    
    // Step 4: Conditional update to prevent race condition
    const updateResult = await tx.bookCopy.updateMany({
      where: {
        barcode: barcode,
        status: 'Available'
      },
      data: {
        status: 'Loaned'
      }
    });
    
    // Step 5: Check if update succeeded
    if (updateResult.count === 0) {
      throw new ConflictError('COPY_NOT_AVAILABLE');
    }
    
    // Step 6: Create loan record
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + loanPeriodDays);
    
    const loan = await tx.loan.create({
      data: {
        memberId: member.memberId,
        barcode: barcode,
        dueDate: dueDate,
        status: 'Active',
        issuedById: librarian.librarianId,
        renewalCount: 0
      },
      include: {
        member: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        copy: {
          include: {
            book: true
          }
        }
      }
    });
    
    // Step 7: Audit log
    await auditService.log({
      userId: librarianUserId,
      action: 'CHECKOUT',
      entityType: 'Loan',
      entityId: loan.loanId.toString()
    });
    
    return loan;
  });
}

export async function checkin(loanId, librarianUserId) {
  return await prisma.$transaction(async (tx) => {
    // Get librarian record from user ID
    const librarian = await tx.librarian.findUnique({
      where: { librarianId: BigInt(librarianUserId) }
    });
    
    if (!librarian) {
      throw new ForbiddenError('User is not a librarian');
    }
    
    // Step 1: Find and validate loan
    const loan = await tx.loan.findUnique({
      where: { loanId: BigInt(loanId) },
      include: {
        copy: {
          include: {
            book: true
          }
        }
      }
    });
    
    if (!loan) {
      throw new NotFoundError('Loan not found');
    }
    
    if (loan.status !== 'Active') {
      throw new BadRequestError('Loan already returned');
    }
    
    // Step 2: Update loan to Returned
    const returnDate = new Date();
    const updatedLoan = await tx.loan.update({
      where: { loanId: loan.loanId },
      data: {
        status: 'Returned',
        returnDate: returnDate,
        returnedToId: librarian.librarianId
      },
      include: {
        copy: {
          include: {
            book: true
          }
        }
      }
    });
    
    // Step 3: Calculate and create fine if overdue
    let fine = null;
    const overdueDays = Math.max(0, Math.floor((returnDate - loan.dueDate) / (1000 * 60 * 60 * 24)));
    
    if (overdueDays > 0) {
      const fineRate = await configService.getAsNumber('fine_rate_per_day');
      const amount = overdueDays * fineRate;
      
      fine = await tx.fine.create({
        data: {
          loanId: loan.loanId,
          memberId: loan.memberId,
          amount: amount,
          reason: 'Overdue',
          status: 'Unpaid'
        }
      });
    }
    
    // Step 4: Check for pending reservations
    const pendingReservations = await tx.reservation.findMany({
      where: {
        isbn: loan.copy.isbn,
        status: 'Pending'
      },
      orderBy: { reserveDate: 'asc' },
      take: 1
    });
    
    let reservation = null;
    let newCopyStatus = 'Available';
    
    if (pendingReservations.length > 0) {
      // Step 5a: Fulfill earliest reservation
      const holdDays = await configService.getAsNumber('reservation_hold_days');
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + holdDays);
      
      reservation = await tx.reservation.update({
        where: { reserveId: pendingReservations[0].reserveId },
        data: {
          status: 'Fulfilled',
          expiryDate: expiryDate
        }
      });
      
      newCopyStatus = 'Reserved';
      
      // Step 5b: Create notification (stubbed)
      await tx.notification.create({
        data: {
          userId: reservation.memberId,
          type: 'ReservationReady',
          channel: 'Email',
          content: `Your reserved book "${loan.copy.book.title}" is ready for pickup`,
          status: 'Pending'
        }
      });
    }
    
    // Step 6: Update copy status
    await tx.bookCopy.update({
      where: { barcode: loan.barcode },
      data: { status: newCopyStatus }
    });
    
    // Step 7: Audit log
    await auditService.log({
      userId: librarianUserId,
      action: 'CHECKIN',
      entityType: 'Loan',
      entityId: loan.loanId.toString()
    });
    
    return { loan: updatedLoan, fine, reservation };
  });
}

export async function renew(loanId, memberId) {
  return await prisma.$transaction(async (tx) => {
    // Step 1: Find and validate loan
    const loan = await tx.loan.findUnique({
      where: { loanId: BigInt(loanId) },
      include: { copy: true }
    });
    
    if (!loan) {
      throw new NotFoundError('Loan not found');
    }
    
    if (loan.status !== 'Active') {
      throw new BadRequestError('Cannot renew returned loan');
    }
    
    if (loan.memberId.toString() !== memberId) {
      throw new ForbiddenError('Not your loan');
    }
    
    // Step 2: Check renewal count
    const maxRenewals = await configService.getAsNumber('max_renewals');
    if (loan.renewalCount >= maxRenewals) {
      throw new BadRequestError('Maximum renewals reached');
    }
    
    // Step 3: Check for pending reservations
    const pendingReservation = await tx.reservation.findFirst({
      where: {
        isbn: loan.copy.isbn,
        status: 'Pending'
      }
    });
    
    if (pendingReservation) {
      throw new BadRequestError('Cannot renew: book has pending reservation');
    }
    
    // Step 4: Check unpaid fines
    const fineThreshold = await configService.getAsNumber('fine_block_threshold');
    const totalUnpaid = await tx.fine.aggregate({
      where: {
        memberId: BigInt(memberId),
        status: 'Unpaid'
      },
      _sum: { amount: true }
    });
    
    const unpaidAmount = Number(totalUnpaid._sum.amount || 0);
    if (unpaidAmount > fineThreshold) {
      throw new BadRequestError('Cannot renew: unpaid fines exceed threshold');
    }
    
    // Step 5: Extend due date
    const loanPeriodDays = await configService.getAsNumber('loan_period_days');
    const newDueDate = new Date(loan.dueDate);
    newDueDate.setDate(newDueDate.getDate() + loanPeriodDays);
    
    const updatedLoan = await tx.loan.update({
      where: { loanId: loan.loanId },
      data: {
        dueDate: newDueDate,
        renewalCount: loan.renewalCount + 1
      },
      include: {
        copy: {
          include: {
            book: true
          }
        }
      }
    });
    
    return updatedLoan;
  });
}

export async function getMemberLoans(memberId, status) {
  const where = {
    memberId: BigInt(memberId)
  };
  
  if (status) {
    where.status = status;
  } else {
    where.status = 'Active';
  }
  
  return await prisma.loan.findMany({
    where,
    include: {
      copy: {
        include: {
          book: {
            select: {
              isbn: true,
              title: true,
              author: true
            }
          }
        }
      }
    },
    orderBy: { issueDate: 'desc' }
  });
}

export async function getMemberHistory(memberId) {
  return await prisma.loan.findMany({
    where: {
      memberId: BigInt(memberId),
      status: 'Returned'
    },
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
    },
    orderBy: { returnDate: 'desc' }
  });
}

export async function getAllLoans(status) {
  const where = {};
  
  if (status) {
    where.status = status;
  }
  
  return await prisma.loan.findMany({
    where,
    include: {
      member: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              username: true
            }
          }
        }
      },
      copy: {
        include: {
          book: {
            select: {
              isbn: true,
              title: true,
              author: true
            }
          }
        }
      }
    },
    orderBy: { issueDate: 'desc' }
  });
}
