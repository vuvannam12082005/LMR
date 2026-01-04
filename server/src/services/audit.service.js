import prisma from '../config/database.js';

export async function log(data) {
  await prisma.auditLog.create({
    data: {
      userId: BigInt(data.userId),
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      ipAddress: data.ipAddress
    }
  });
}

export async function getLogs(filters = {}) {
  const where = {};
  
  if (filters.userId) {
    where.userId = BigInt(filters.userId);
  }
  
  if (filters.action) {
    where.action = filters.action;
  }
  
  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      where.createdAt.lte = new Date(filters.endDate);
    }
  }
  
  return await prisma.auditLog.findMany({
    where,
    include: {
      user: {
        select: {
          userId: true,
          username: true,
          firstName: true,
          lastName: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: filters.limit ? parseInt(filters.limit, 10) : 100
  });
}
