import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

function getBorrowingLimit(membershipType) {
  const limits = {
    'Student': 5,
    'Faculty': 10,
    'Public': 3
  };
  return limits[membershipType] || 3;
}

function generateMemberCode() {
  const timestamp = Date.now().toString().slice(-6);
  return `MEM2024${timestamp}`;
}

function generateEmployeeId() {
  const timestamp = Date.now().toString().slice(-6);
  return `EMP${timestamp}`;
}

export async function getUsers(filters = {}) {
  const where = {};
  
  if (filters.q) {
    where.OR = [
      { username: { contains: filters.q } },
      { email: { contains: filters.q } },
      { firstName: { contains: filters.q } },
      { lastName: { contains: filters.q } }
    ];
  }
  
  if (filters.role) {
    where.role = filters.role;
  }
  
  if (filters.status) {
    where.status = filters.status;
  }
  
  return await prisma.user.findMany({
    where,
    select: {
      userId: true,
      username: true,
      email: true,
      role: true,
      status: true,
      firstName: true,
      lastName: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function createUser(data) {
  // Check if user exists
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { username: data.username },
        { email: data.email }
      ]
    }
  });
  
  if (existing) {
    throw new BadRequestError('Username or email already exists');
  }
  
  // Hash password
  const passwordHash = await bcrypt.hash(data.password, 10);
  
  // Create user with role-specific profile
  const userData = {
    username: data.username,
    email: data.email,
    passwordHash,
    firstName: data.firstName,
    lastName: data.lastName,
    role: data.role,
    status: data.status || 'Active',
    phone: data.phone,
    address: data.address
  };
  
  // Add role-specific profile
  if (data.role === 'Member') {
    const borrowingLimit = getBorrowingLimit(data.membershipType);
    const memberCode = generateMemberCode();
    const membershipDate = new Date();
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    
    userData.member = {
      create: {
        memberCode,
        membershipType: data.membershipType,
        membershipDate,
        expiryDate,
        borrowingLimit
      }
    };
  } else if (data.role === 'Librarian') {
    userData.librarian = {
      create: {
        employeeId: data.employeeId || generateEmployeeId(),
        department: data.department,
        hireDate: data.hireDate ? new Date(data.hireDate) : new Date()
      }
    };
  } else if (data.role === 'Administrator') {
    userData.admin = {
      create: {
        adminLevel: data.adminLevel || 1,
        permissions: data.permissions
      }
    };
  }
  
  const user = await prisma.user.create({
    data: userData,
    include: {
      member: true,
      librarian: true,
      admin: true
    }
  });
  
  delete user.passwordHash;
  return user;
}

export async function updateUser(userId, data) {
  const user = await prisma.user.findUnique({
    where: { userId: BigInt(userId) }
  });
  
  if (!user) {
    throw new NotFoundError('User not found');
  }
  
  const updateData = {};
  
  if (data.role) updateData.role = data.role;
  if (data.status) updateData.status = data.status;
  if (data.firstName) updateData.firstName = data.firstName;
  if (data.lastName) updateData.lastName = data.lastName;
  if (data.phone) updateData.phone = data.phone;
  if (data.address) updateData.address = data.address;
  
  return await prisma.user.update({
    where: { userId: BigInt(userId) },
    data: updateData,
    include: {
      member: true,
      librarian: true,
      admin: true
    }
  });
}

export async function getUserWithProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { userId: BigInt(userId) },
    include: {
      member: true,
      librarian: true,
      admin: true
    }
  });
  
  if (!user) {
    throw new NotFoundError('User not found');
  }
  
  delete user.passwordHash;
  return user;
}
