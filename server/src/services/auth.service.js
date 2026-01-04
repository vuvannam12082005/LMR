import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../utils/errors.js';

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

export async function register(data) {
  const { username, email, password, firstName, lastName, membershipType } = data;

  // Check if user exists
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { username },
        { email }
      ]
    }
  });

  if (existing) {
    throw new BadRequestError('Username or email already exists');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user with member profile
  const borrowingLimit = getBorrowingLimit(membershipType);
  const memberCode = generateMemberCode();
  const membershipDate = new Date();
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);

  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      firstName,
      lastName,
      role: 'Member',
      status: 'Active',
      member: {
        create: {
          memberCode,
          membershipType,
          membershipDate,
          expiryDate,
          borrowingLimit
        }
      }
    },
    include: {
      member: true
    }
  });

  // Remove passwordHash from response
  delete user.passwordHash;

  return { user };
}

export async function login(credentials) {
  const { usernameOrEmail, password } = credentials;

  // Find user
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: usernameOrEmail },
        { email: usernameOrEmail }
      ]
    }
  });

  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Check status
  if (user.status !== 'Active') {
    throw new UnauthorizedError('Account is not active');
  }

  // Update last login
  await prisma.user.update({
    where: { userId: user.userId },
    data: { lastLogin: new Date() }
  });

  // Generate JWT
  const token = jwt.sign(
    {
      userId: user.userId.toString(),
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  // Remove passwordHash from response
  delete user.passwordHash;

  return {
    accessToken: token,
    user: {
      userId: user.userId.toString(),
      username: user.username,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    }
  };
}

export async function getMe(userId) {
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
