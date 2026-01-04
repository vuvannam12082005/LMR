# Design Document: Library Management System

## Overview

The Library Management System (LMS) is a web application built with a three-tier architecture: MySQL database, Node.js/Express REST API backend, and React/MUI frontend. The system implements hierarchical role-based access control (RBAC) with four user types and enforces business rules through transactional operations to prevent race conditions.

### Key Design Principles

- **Transaction-based operations**: All critical operations (checkout, checkin, renew) use database transactions
- **Conditional updates**: Race condition prevention through status-based conditional updates
- **Hierarchical RBAC**: Administrator inherits Librarian permissions, Librarian inherits Member permissions
- **BigInt serialization**: All database BigInt IDs serialized to strings in JSON responses
- **External service stubs**: Email, SMS, and payment gateway stubbed for MVP demonstration

### Technology Stack

- **Database**: MySQL 8.0 with timezone +07:00
- **ORM**: Prisma (MySQL provider)
- **Backend**: Node.js + Express + JWT authentication
- **Frontend**: React (Vite) + Material-UI
- **Containerization**: Docker Compose (MySQL + phpMyAdmin)
- **Validation**: Zod schemas
- **Password hashing**: bcrypt

## Architecture

### System Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        UI[React + MUI Frontend]
    end
    
    subgraph "API Layer"
        API[Express REST API]
        Auth[Auth Middleware]
        RBAC[RBAC Middleware]
        Valid[Validation Middleware]
    end
    
    subgraph "Service Layer"
        AuthSvc[Auth Service]
        BookSvc[Book Service]
        LoanSvc[Loan Service]
        ResSvc[Reservation Service]
        FineSvc[Fine Service]
        UserSvc[User Service]
        ConfigSvc[Config Service]
        AuditSvc[Audit Service]
    end
    
    subgraph "Data Layer"
        Prisma[Prisma Client]
        DB[(MySQL 8.0)]
    end
    
    subgraph "External Services (Stubbed)"
        Email[Email Service]
        SMS[SMS Service]
        Payment[Payment Gateway]
    end
    
    UI --> API
    API --> Auth
    Auth --> RBAC
    RBAC --> Valid
    Valid --> AuthSvc
    Valid --> BookSvc
    Valid --> LoanSvc
    Valid --> ResSvc
    Valid --> FineSvc
    Valid --> UserSvc
    Valid --> ConfigSvc
    Valid --> AuditSvc
    
    AuthSvc --> Prisma
    BookSvc --> Prisma
    LoanSvc --> Prisma
    ResSvc --> Prisma
    FineSvc --> Prisma
    UserSvc --> Prisma
    ConfigSvc --> Prisma
    AuditSvc --> Prisma
    
    Prisma --> DB
    
    LoanSvc -.stub.-> Email
    FineSvc -.stub.-> SMS
    FineSvc -.stub.-> Payment
```


### Module Structure

```
server/
├── src/
│   ├── config/
│   │   ├── database.js          # Prisma client singleton
│   │   └── env.js               # Environment variables
│   ├── middleware/
│   │   ├── auth.js              # JWT verification
│   │   ├── rbac.js              # Role-based access control
│   │   ├── validation.js        # Zod schema validation
│   │   └── errorHandler.js      # Global error handler
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── book.routes.js
│   │   ├── loan.routes.js
│   │   ├── reservation.routes.js
│   │   ├── fine.routes.js
│   │   ├── member.routes.js
│   │   └── admin.routes.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── book.controller.js
│   │   ├── loan.controller.js
│   │   ├── reservation.controller.js
│   │   ├── fine.controller.js
│   │   ├── member.controller.js
│   │   └── admin.controller.js
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── book.service.js
│   │   ├── loan.service.js
│   │   ├── reservation.service.js
│   │   ├── fine.service.js
│   │   ├── user.service.js
│   │   ├── config.service.js
│   │   └── audit.service.js
│   ├── utils/
│   │   ├── bigint.js            # BigInt to string serialization
│   │   ├── errors.js            # Custom error classes
│   │   └── constants.js         # System constants
│   └── app.js                   # Express app setup
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.js
└── package.json
```

### Request Flow

1. **Client Request** → Express Router
2. **Authentication Middleware** → Verify JWT, attach `req.user`
3. **RBAC Middleware** → Check role permissions
4. **Validation Middleware** → Validate request body/params with Zod
5. **Controller** → Parse request, call service
6. **Service** → Business logic + Prisma transactions
7. **Response** → Serialize BigInt to string, return JSON

## Components and Interfaces

### Authentication System

**JWT Payload Structure:**
```typescript
interface JWTPayload {
  userId: string;      // BigInt serialized to string
  role: 'Member' | 'Librarian' | 'Administrator';
  iat: number;
  exp: number;
}
```

**Auth Service Interface:**
```typescript
interface AuthService {
  register(data: RegisterDTO): Promise<{ user: UserResponse }>;
  login(credentials: LoginDTO): Promise<{ accessToken: string; user: UserResponse }>;
  verifyToken(token: string): Promise<JWTPayload>;
}

interface RegisterDTO {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  membershipType: 'Student' | 'Faculty' | 'Public';
}

interface LoginDTO {
  usernameOrEmail: string;
  password: string;
}
```


### RBAC Middleware

**Role Hierarchy:**
```
Administrator (level 3)
    ↓ inherits all permissions
Librarian (level 2)
    ↓ inherits all permissions
Member (level 1)
    ↓ inherits all permissions
Authenticated User (level 0)
```

**RBAC Implementation:**
```typescript
interface RBACConfig {
  allowedRoles: Role[];
  requireOwnership?: boolean;  // For /api/members/{id}/* endpoints
}

function requireRole(config: RBACConfig) {
  return (req, res, next) => {
    const userRole = req.user.role;
    const roleLevel = getRoleLevel(userRole);
    const requiredLevel = Math.min(...config.allowedRoles.map(getRoleLevel));
    
    if (roleLevel < requiredLevel) {
      throw new ForbiddenError('Insufficient permissions');
    }
    
    // Ownership check for member-specific endpoints
    if (config.requireOwnership && req.params.id !== req.user.userId) {
      if (roleLevel < getRoleLevel('Librarian')) {
        throw new ForbiddenError('Cannot access other member data');
      }
    }
    
    next();
  };
}

function getRoleLevel(role: Role): number {
  const levels = { Member: 1, Librarian: 2, Administrator: 3 };
  return levels[role] || 0;
}
```

### Book Service Interface

```typescript
interface BookService {
  search(query: SearchQuery): Promise<Book[]>;
  getByISBN(isbn: string): Promise<BookWithCopies>;
  create(data: CreateBookDTO): Promise<Book>;
  update(isbn: string, data: UpdateBookDTO): Promise<Book>;
  addCopy(isbn: string, data: CreateCopyDTO): Promise<BookCopy>;
}

interface SearchQuery {
  q?: string;           // Search term (title/author/isbn)
  categoryId?: string;
}

interface BookWithCopies {
  isbn: string;
  title: string;
  author: string;
  publisher?: string;
  publicationYear?: number;
  description?: string;
  language: string;
  coverImage?: string;
  category?: Category;
  copies: BookCopyWithStatus[];
}

interface BookCopyWithStatus {
  barcode: string;
  status: 'Available' | 'Loaned' | 'Reserved' | 'Lost' | 'Repair';
  condition: 'New' | 'Good' | 'Fair' | 'Poor';
  locationCode?: string;
}
```

### Loan Service Interface

```typescript
interface LoanService {
  checkout(data: CheckoutDTO, librarianId: string): Promise<Loan>;
  checkin(loanId: string, librarianId: string): Promise<CheckinResult>;
  renew(loanId: string, memberId: string): Promise<Loan>;
  getMemberLoans(memberId: string, status?: LoanStatus): Promise<Loan[]>;
  getMemberHistory(memberId: string): Promise<Loan[]>;
}

interface CheckoutDTO {
  memberCode: string;
  barcode: string;
}

interface CheckinResult {
  loan: Loan;
  fine?: Fine;
  reservation?: Reservation;
}
```


### Reservation Service Interface

```typescript
interface ReservationService {
  create(memberId: string, isbn: string): Promise<Reservation>;
  cancel(reserveId: string, memberId: string): Promise<void>;
  getMemberReservations(memberId: string): Promise<Reservation[]>;
  findPendingByISBN(isbn: string): Promise<Reservation[]>;
  fulfillEarliest(isbn: string, holdDays: number): Promise<Reservation | null>;
}
```

### Fine Service Interface

```typescript
interface FineService {
  createOverdueFine(loanId: string, memberId: string, overdueDays: number, ratePerDay: number): Promise<Fine>;
  getMemberFines(memberId: string, status?: FineStatus): Promise<Fine[]>;
  payFine(fineId: string, memberId: string, method: PaymentMethod): Promise<Payment>;
  getTotalUnpaid(memberId: string): Promise<number>;
  waiveFine(fineId: string, librarianId: string, reason: string): Promise<Fine>;
}
```

### User Service Interface

```typescript
interface UserService {
  getUsers(filters: UserFilters): Promise<User[]>;
  createUser(data: CreateUserDTO): Promise<User>;
  updateUser(userId: string, data: UpdateUserDTO): Promise<User>;
  getUserWithProfile(userId: string): Promise<UserWithProfile>;
}

interface UserFilters {
  q?: string;
  role?: Role;
  status?: UserStatus;
}

interface CreateUserDTO {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  phone?: string;
  address?: string;
  // Role-specific fields
  membershipType?: string;  // For Member
  employeeId?: string;      // For Librarian
  department?: string;      // For Librarian
  adminLevel?: number;      // For Administrator
}
```

### Config Service Interface

```typescript
interface ConfigService {
  getAll(): Promise<SystemConfig[]>;
  get(key: string): Promise<string>;
  update(key: string, value: string): Promise<SystemConfig>;
  getAsNumber(key: string): Promise<number>;
}
```

### Audit Service Interface

```typescript
interface AuditService {
  log(data: AuditLogDTO): Promise<void>;
  getLogs(filters: AuditFilters): Promise<AuditLog[]>;
}

interface AuditLogDTO {
  userId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  ipAddress?: string;
}

interface AuditFilters {
  userId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}
```

## Data Models

### Database Schema (Prisma)

The complete schema includes 15 tables as specified in the course report:


**Core Tables:**

1. **user** - Base user account (userId, username, passwordHash, email, role, status)
2. **member** - Member profile (memberId FK userId, memberCode, membershipType, borrowingLimit)
3. **librarian** - Librarian profile (librarianId FK userId, employeeId, department)
4. **administrator** - Admin profile (adminId FK userId, adminLevel, permissions)

**Catalog Tables:**

5. **category** - Book categories (categoryId, categoryName, parentId for hierarchy)
6. **book** - Book records (isbn PK, title, author, publisher, categoryId FK)
7. **book_copy** - Physical copies (barcode PK, isbn FK, status, condition, locationCode)

**Transaction Tables:**

8. **loan** - Borrowing records (loanId, memberId FK, barcode FK, issueDate, dueDate, returnDate, status, issuedById FK, returnedToId FK)
9. **reservation** - Book holds (reserveId, memberId FK, isbn FK, reserveDate, status, expiryDate)
10. **fine** - Penalties (fineId, loanId FK, memberId FK, amount, reason, status, waivedById FK)
11. **payment** - Fine payments (paymentId, fineId FK, memberId FK, amount, method, transactionRef, status, processedById FK)

**System Tables:**

12. **notification** - Email/SMS notifications (notificationId, userId FK, type, channel, content, status, sentAt) - stubbed
13. **report** - Generated reports (reportId, reportType, generatedBy FK, parameters, filePath, createdAt) - stubbed
14. **system_config** - Configuration key-value pairs (configKey PK, configValue, updatedAt)
15. **audit_log** - Activity logs (logId, userId FK, action, entityType, entityId, ipAddress, createdAt)

### Entity Relationship Diagram

```mermaid
erDiagram
    user ||--o| member : "is"
    user ||--o| librarian : "is"
    user ||--o| administrator : "is"
    user ||--o{ audit_log : "creates"
    user ||--o{ notification : "receives"
    
    member ||--o{ loan : "borrows"
    member ||--o{ reservation : "reserves"
    member ||--o{ fine : "owes"
    member ||--o{ payment : "pays"
    
    librarian ||--o{ loan : "issues"
    librarian ||--o{ loan : "receives_return"
    librarian ||--o{ fine : "waives"
    librarian ||--o{ payment : "processes"
    
    administrator ||--o{ report : "generates"
    
    category ||--o{ book : "contains"
    category ||--o{ category : "parent_of"
    
    book ||--o{ book_copy : "has"
    book ||--o{ reservation : "reserved_by"
    
    book_copy ||--o{ loan : "loaned_in"
    
    loan ||--o{ fine : "incurs"
    
    fine ||--o{ payment : "paid_by"
```

### Key Enums

```prisma
enum Role {
  Member
  Librarian
  Administrator
}

enum UserStatus {
  Active
  Inactive
  Locked
  Pending
}

enum CopyStatus {
  Available
  Loaned
  Reserved
  Lost
  Repair
}

enum CopyCondition {
  New
  Good
  Fair
  Poor
}

enum LoanStatus {
  Active
  Returned
  Lost
}

enum ReservationStatus {
  Pending
  Fulfilled
  Expired
  Cancelled
}

enum FineReason {
  Overdue
  Damage
  Lost
}

enum FineStatus {
  Unpaid
  Paid
  Waived
}

enum PaymentMethod {
  Cash
  Card
  Online
}

enum PaymentStatus {
  Success
  Failed
}
```


### Critical Indexes

```prisma
// Performance-critical indexes
@@index([title])                              // book: search by title
@@index([author])                             // book: search by author
@@index([isbn, status])                       // book_copy: find available copies
@@index([memberId, status, dueDate])          // loan: member's active loans
@@index([barcode, status])                    // loan: copy loan status
@@index([isbn, status, reserveDate])          // reservation: pending by book
@@index([memberId, status])                   // fine: member unpaid fines
@@index([memberId, createdAt])                // payment: member payment history
@@index([createdAt])                          // audit_log: recent logs
@@index([userId, action])                     // audit_log: user actions
```

## Business Logic Implementation

### Checkout Transaction Flow

The checkout operation is the most critical transaction, requiring atomicity and race condition prevention.

**Transaction Steps:**

```typescript
async function checkout(memberCode: string, barcode: string, librarianId: string): Promise<Loan> {
  return await prisma.$transaction(async (tx) => {
    // Step 1: Find and validate member
    const member = await tx.member.findUnique({
      where: { memberCode },
      include: { user: true }
    });
    
    if (!member) throw new NotFoundError('Member not found');
    if (member.user.status !== 'Active') throw new BadRequestError('Member account not active');
    
    // Step 2: Check borrowing limit
    const activeLoansCount = await tx.loan.count({
      where: { memberId: member.memberId, status: 'Active' }
    });
    
    if (activeLoansCount >= member.borrowingLimit) {
      throw new BadRequestError('Borrowing limit exceeded');
    }
    
    // Step 3: Get system config
    const loanPeriodDays = await getConfigAsNumber(tx, 'loan_period_days');
    
    // Step 4: Conditional update to prevent race condition
    const updateResult = await tx.bookCopy.updateMany({
      where: {
        barcode: barcode,
        status: 'Available'  // CRITICAL: Only update if Available
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
        issuedById: BigInt(librarianId),
        renewalCount: 0
      }
    });
    
    // Step 7: Audit log
    await tx.auditLog.create({
      data: {
        userId: BigInt(librarianId),
        action: 'CHECKOUT',
        entityType: 'Loan',
        entityId: loan.loanId.toString()
      }
    });
    
    return loan;
  });
}
```

**Race Condition Prevention:**

The key is Step 4's conditional update:
```sql
UPDATE book_copy 
SET status = 'Loaned' 
WHERE barcode = ? AND status = 'Available'
```

If two librarians scan the same barcode simultaneously:
- First transaction: `updateMany` returns `count = 1`, proceeds
- Second transaction: `updateMany` returns `count = 0` (status already 'Loaned'), fails with COPY_NOT_AVAILABLE


### Checkin Transaction Flow

The checkin operation handles returns, calculates fines, and manages reservations.

**Transaction Steps:**

```typescript
async function checkin(loanId: string, librarianId: string): Promise<CheckinResult> {
  return await prisma.$transaction(async (tx) => {
    // Step 1: Find and validate loan
    const loan = await tx.loan.findUnique({
      where: { loanId: BigInt(loanId) },
      include: { copy: { include: { book: true } } }
    });
    
    if (!loan) throw new NotFoundError('Loan not found');
    if (loan.status !== 'Active') throw new BadRequestError('Loan already returned');
    
    // Step 2: Update loan to Returned
    const returnDate = new Date();
    await tx.loan.update({
      where: { loanId: loan.loanId },
      data: {
        status: 'Returned',
        returnDate: returnDate,
        returnedToId: BigInt(librarianId)
      }
    });
    
    // Step 3: Calculate and create fine if overdue
    let fine = null;
    const overdueDays = Math.max(0, Math.floor((returnDate - loan.dueDate) / (1000 * 60 * 60 * 24)));
    
    if (overdueDays > 0) {
      const fineRate = await getConfigAsNumber(tx, 'fine_rate_per_day');
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
      const holdDays = await getConfigAsNumber(tx, 'reservation_hold_days');
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
          content: `Your reserved book is ready for pickup`,
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
    await tx.auditLog.create({
      data: {
        userId: BigInt(librarianId),
        action: 'CHECKIN',
        entityType: 'Loan',
        entityId: loan.loanId.toString()
      }
    });
    
    return { loan, fine, reservation };
  });
}
```

**Key Business Rules:**

1. **Fine calculation**: `overdueDays = max(0, floor((returnDate - dueDate) / 1 day))`
2. **One fine per loan**: Only create fine if overdueDays > 0, never duplicate
3. **Reservation priority**: Earliest reserveDate gets fulfilled first
4. **Copy status logic**:
   - If pending reservation exists → `Reserved`
   - If no pending reservation → `Available`


### Renew Transaction Flow

The renew operation extends the due date with multiple validation rules.

**Transaction Steps:**

```typescript
async function renew(loanId: string, memberId: string): Promise<Loan> {
  return await prisma.$transaction(async (tx) => {
    // Step 1: Find and validate loan
    const loan = await tx.loan.findUnique({
      where: { loanId: BigInt(loanId) },
      include: { copy: true }
    });
    
    if (!loan) throw new NotFoundError('Loan not found');
    if (loan.status !== 'Active') throw new BadRequestError('Cannot renew returned loan');
    if (loan.memberId.toString() !== memberId) throw new ForbiddenError('Not your loan');
    
    // Step 2: Check renewal count
    const maxRenewals = await getConfigAsNumber(tx, 'max_renewals');
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
    const fineThreshold = await getConfigAsNumber(tx, 'fine_block_threshold');
    const totalUnpaid = await tx.fine.aggregate({
      where: {
        memberId: BigInt(memberId),
        status: 'Unpaid'
      },
      _sum: { amount: true }
    });
    
    const unpaidAmount = totalUnpaid._sum.amount || 0;
    if (unpaidAmount > fineThreshold) {
      throw new BadRequestError('Cannot renew: unpaid fines exceed threshold');
    }
    
    // Step 5: Extend due date
    const loanPeriodDays = await getConfigAsNumber(tx, 'loan_period_days');
    const newDueDate = new Date(loan.dueDate);
    newDueDate.setDate(newDueDate.getDate() + loanPeriodDays);
    
    const updatedLoan = await tx.loan.update({
      where: { loanId: loan.loanId },
      data: {
        dueDate: newDueDate,
        renewalCount: loan.renewalCount + 1
      }
    });
    
    return updatedLoan;
  });
}
```

**Renewal Validation Rules:**

1. ✅ Loan must be Active
2. ✅ renewalCount < max_renewals (default: 2)
3. ✅ No Pending reservation for same ISBN
4. ✅ Total unpaid fines ≤ fine_block_threshold (default: 50,000 VND)
5. ✅ Member must own the loan


### Borrowing Limit Calculation

When creating a member, set borrowingLimit based on membershipType:

```typescript
function getBorrowingLimit(membershipType: string): number {
  const limits = {
    'Student': 5,
    'Faculty': 10,
    'Public': 3
  };
  return limits[membershipType] || 3;
}

async function createMember(userData: CreateUserDTO): Promise<User> {
  return await prisma.$transaction(async (tx) => {
    // Create user
    const user = await tx.user.create({
      data: {
        username: userData.username,
        email: userData.email,
        passwordHash: await bcrypt.hash(userData.password, 10),
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: 'Member',
        status: 'Active'
      }
    });
    
    // Create member profile
    const borrowingLimit = getBorrowingLimit(userData.membershipType);
    const memberCode = generateMemberCode(); // e.g., MEM2024001
    
    const membershipDate = new Date();
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year membership
    
    await tx.member.create({
      data: {
        memberId: user.userId,
        memberCode: memberCode,
        membershipType: userData.membershipType,
        membershipDate: membershipDate,
        expiryDate: expiryDate,
        borrowingLimit: borrowingLimit
      }
    });
    
    return user;
  });
}
```

### BigInt Serialization

All API responses must serialize BigInt to string to prevent JSON serialization errors.

**Global JSON Serializer:**

```typescript
// utils/bigint.js
BigInt.prototype.toJSON = function() {
  return this.toString();
};

// Alternative: Response transformer
function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      result[key] = serializeBigInt(obj[key]);
    }
    return result;
  }
  
  return obj;
}

// Usage in controller
res.json(serializeBigInt(data));
```

## API Endpoints

### Authentication Endpoints

**POST /api/auth/register**
```typescript
Request:
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "Password123!",
  "firstName": "John",
  "lastName": "Doe",
  "membershipType": "Student"
}

Response: 201 Created
{
  "user": {
    "userId": "1",
    "username": "john_doe",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "Member",
    "status": "Active"
  }
}
```

**POST /api/auth/login**
```typescript
Request:
{
  "usernameOrEmail": "john_doe",
  "password": "Password123!"
}

Response: 200 OK
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "userId": "1",
    "username": "john_doe",
    "role": "Member",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

**GET /api/auth/me**
```typescript
Headers: Authorization: Bearer <token>

Response: 200 OK
{
  "userId": "1",
  "username": "john_doe",
  "email": "john@example.com",
  "role": "Member",
  "status": "Active",
  "firstName": "John",
  "lastName": "Doe"
}
```

**POST /api/auth/logout**
```typescript
Headers: Authorization: Bearer <token>

Response: 200 OK
{
  "ok": true
}
```


### Book Endpoints

**GET /api/books**
```typescript
Query: ?q=harry&categoryId=2

Response: 200 OK
[
  {
    "isbn": "978-0-439-13959-5",
    "title": "Harry Potter and the Goblet of Fire",
    "author": "J.K. Rowling",
    "publisher": "Scholastic",
    "publicationYear": 2000,
    "language": "English",
    "category": {
      "categoryId": "2",
      "categoryName": "Fiction"
    }
  }
]
```

**GET /api/books/:isbn**
```typescript
Response: 200 OK
{
  "isbn": "978-0-439-13959-5",
  "title": "Harry Potter and the Goblet of Fire",
  "author": "J.K. Rowling",
  "publisher": "Scholastic",
  "publicationYear": 2000,
  "description": "The fourth book in the Harry Potter series...",
  "language": "English",
  "coverImage": "https://example.com/cover.jpg",
  "category": {
    "categoryId": "2",
    "categoryName": "Fiction"
  },
  "copies": [
    {
      "barcode": "BC001",
      "status": "Available",
      "condition": "Good",
      "locationCode": "A-12-3"
    },
    {
      "barcode": "BC002",
      "status": "Loaned",
      "condition": "Fair",
      "locationCode": "A-12-3"
    }
  ]
}
```

**POST /api/books** (Librarian)
```typescript
Request:
{
  "isbn": "978-0-439-13959-5",
  "title": "Harry Potter and the Goblet of Fire",
  "author": "J.K. Rowling",
  "publisher": "Scholastic",
  "publicationYear": 2000,
  "description": "The fourth book...",
  "language": "English",
  "categoryId": "2"
}

Response: 201 Created
{
  "isbn": "978-0-439-13959-5",
  "title": "Harry Potter and the Goblet of Fire",
  ...
}
```

**PUT /api/books/:isbn** (Librarian)
```typescript
Request:
{
  "description": "Updated description...",
  "categoryId": "3"
}

Response: 200 OK
{
  "isbn": "978-0-439-13959-5",
  "title": "Harry Potter and the Goblet of Fire",
  ...
}
```

**POST /api/books/:isbn/copies** (Librarian)
```typescript
Request:
{
  "barcode": "BC003",
  "condition": "New",
  "locationCode": "A-12-4"
}

Response: 201 Created
{
  "barcode": "BC003",
  "isbn": "978-0-439-13959-5",
  "status": "Available",
  "condition": "New",
  "locationCode": "A-12-4"
}
```

### Loan Endpoints

**POST /api/loans** (Librarian - Checkout)
```typescript
Request:
{
  "memberCode": "MEM2024001",
  "barcode": "BC001"
}

Response: 201 Created
{
  "loanId": "1",
  "memberId": "5",
  "barcode": "BC001",
  "issueDate": "2024-01-15T10:00:00Z",
  "dueDate": "2024-01-29T10:00:00Z",
  "status": "Active",
  "renewalCount": 0
}

Error: 409 Conflict
{
  "error": {
    "code": "COPY_NOT_AVAILABLE",
    "message": "Book copy is not available for checkout"
  }
}
```

**GET /api/loans** (Librarian)
```typescript
Query: ?memberId=5&status=Active

Response: 200 OK
[
  {
    "loanId": "1",
    "member": {
      "memberId": "5",
      "memberCode": "MEM2024001",
      "user": {
        "firstName": "John",
        "lastName": "Doe"
      }
    },
    "copy": {
      "barcode": "BC001",
      "book": {
        "isbn": "978-0-439-13959-5",
        "title": "Harry Potter and the Goblet of Fire"
      }
    },
    "issueDate": "2024-01-15T10:00:00Z",
    "dueDate": "2024-01-29T10:00:00Z",
    "status": "Active",
    "renewalCount": 0
  }
]
```

**PUT /api/loans/:id/return** (Librarian - Checkin)
```typescript
Response: 200 OK
{
  "loan": {
    "loanId": "1",
    "status": "Returned",
    "returnDate": "2024-01-30T14:00:00Z"
  },
  "fine": {
    "fineId": "1",
    "amount": "5000.00",
    "reason": "Overdue",
    "status": "Unpaid"
  },
  "reservation": null
}
```

**PUT /api/loans/:id/renew** (Member)
```typescript
Response: 200 OK
{
  "loanId": "1",
  "dueDate": "2024-02-12T10:00:00Z",
  "renewalCount": 1
}

Error: 400 Bad Request
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Cannot renew: book has pending reservation"
  }
}
```


### Member Endpoints

**GET /api/me/loans** (Member - own loans)
```typescript
Response: 200 OK
[
  {
    "loanId": "1",
    "copy": {
      "barcode": "BC001",
      "book": {
        "isbn": "978-0-439-13959-5",
        "title": "Harry Potter and the Goblet of Fire",
        "author": "J.K. Rowling"
      }
    },
    "issueDate": "2024-01-15T10:00:00Z",
    "dueDate": "2024-01-29T10:00:00Z",
    "renewalCount": 0,
    "status": "Active"
  }
]
```

**GET /api/me/history** (Member - loan history)
```typescript
Response: 200 OK
[
  {
    "loanId": "10",
    "copy": {
      "book": {
        "title": "The Great Gatsby"
      }
    },
    "issueDate": "2023-12-01T10:00:00Z",
    "dueDate": "2023-12-15T10:00:00Z",
    "returnDate": "2023-12-14T09:00:00Z",
    "status": "Returned"
  }
]
```

**GET /api/members/:id/loans** (Librarian/Admin - any member)
```typescript
Response: 200 OK
[
  {
    "loanId": "1",
    "memberId": "5",
    ...
  }
]
```

**GET /api/members/:id/history** (Librarian/Admin)
```typescript
Response: 200 OK
[...]
```

### Reservation Endpoints

**POST /api/reservations** (Member)
```typescript
Request:
{
  "isbn": "978-0-439-13959-5"
}

Response: 201 Created
{
  "reserveId": "1",
  "memberId": "5",
  "isbn": "978-0-439-13959-5",
  "reserveDate": "2024-01-15T10:00:00Z",
  "status": "Pending",
  "expiryDate": null
}
```

**GET /api/reservations** (Member - own reservations)
```typescript
Response: 200 OK
[
  {
    "reserveId": "1",
    "book": {
      "isbn": "978-0-439-13959-5",
      "title": "Harry Potter and the Goblet of Fire",
      "author": "J.K. Rowling"
    },
    "reserveDate": "2024-01-15T10:00:00Z",
    "status": "Pending"
  }
]
```

**GET /api/members/:id/reservations** (Librarian/Admin)
```typescript
Response: 200 OK
[...]
```

**DELETE /api/reservations/:id** (Member)
```typescript
Response: 200 OK
{
  "ok": true
}
```

### Fine Endpoints

**GET /api/me/fines** (Member - own fines)
```typescript
Response: 200 OK
[
  {
    "fineId": "1",
    "loan": {
      "loanId": "1",
      "copy": {
        "book": {
          "title": "Harry Potter and the Goblet of Fire"
        }
      }
    },
    "amount": "5000.00",
    "reason": "Overdue",
    "status": "Unpaid",
    "createdAt": "2024-01-30T14:00:00Z"
  }
]
```

**GET /api/members/:id/fines** (Librarian/Admin)
```typescript
Response: 200 OK
[...]
```

**POST /api/fines/:id/pay** (Member - fake payment)
```typescript
Request:
{
  "method": "Online"
}

Response: 200 OK
{
  "payment": {
    "paymentId": "1",
    "fineId": "1",
    "amount": "5000.00",
    "method": "Online",
    "status": "Success",
    "transactionRef": "TXN20240115001",
    "createdAt": "2024-01-15T11:00:00Z"
  },
  "fine": {
    "fineId": "1",
    "status": "Paid",
    "paidAt": "2024-01-15T11:00:00Z"
  }
}
```


### Admin Endpoints

**GET /api/admin/users**
```typescript
Query: ?q=john&role=Member&status=Active

Response: 200 OK
[
  {
    "userId": "5",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "Member",
    "status": "Active",
    "firstName": "John",
    "lastName": "Doe",
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

**POST /api/admin/users**
```typescript
Request:
{
  "username": "librarian2",
  "email": "lib2@example.com",
  "password": "Password123!",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "Librarian",
  "employeeId": "EMP002",
  "department": "Circulation"
}

Response: 201 Created
{
  "userId": "10",
  "username": "librarian2",
  "role": "Librarian",
  ...
}
```

**PUT /api/admin/users/:id**
```typescript
Request:
{
  "role": "Administrator",
  "status": "Active"
}

Response: 200 OK
{
  "userId": "10",
  "role": "Administrator",
  "status": "Active",
  ...
}
```

**GET /api/admin/config**
```typescript
Response: 200 OK
[
  {
    "configKey": "loan_period_days",
    "configValue": "14",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  {
    "configKey": "max_renewals",
    "configValue": "2",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  {
    "configKey": "fine_rate_per_day",
    "configValue": "5000",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  {
    "configKey": "fine_block_threshold",
    "configValue": "50000",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  {
    "configKey": "reservation_hold_days",
    "configValue": "3",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
]
```

**PUT /api/admin/config/:key**
```typescript
Request:
{
  "value": "21"
}

Response: 200 OK
{
  "configKey": "loan_period_days",
  "configValue": "21",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

**GET /api/admin/audit-logs**
```typescript
Query: ?userId=5&action=CHECKOUT&limit=50

Response: 200 OK
[
  {
    "logId": "1",
    "user": {
      "userId": "3",
      "username": "librarian1",
      "firstName": "Alice",
      "lastName": "Johnson"
    },
    "action": "CHECKOUT",
    "entityType": "Loan",
    "entityId": "1",
    "ipAddress": "192.168.1.100",
    "createdAt": "2024-01-15T10:00:00Z"
  }
]
```

## Seed Data Specification

The seed script must create realistic demo data for immediate system demonstration.

### Demo Accounts

```typescript
const demoAccounts = [
  {
    username: 'admin',
    password: 'Password123!',
    email: 'admin@lms.local',
    firstName: 'System',
    lastName: 'Administrator',
    role: 'Administrator',
    adminLevel: 3
  },
  {
    username: 'librarian1',
    password: 'Password123!',
    email: 'lib1@lms.local',
    firstName: 'Alice',
    lastName: 'Johnson',
    role: 'Librarian',
    employeeId: 'EMP001',
    department: 'Circulation'
  },
  {
    username: 'librarian2',
    password: 'Password123!',
    email: 'lib2@lms.local',
    firstName: 'Bob',
    lastName: 'Williams',
    role: 'Librarian',
    employeeId: 'EMP002',
    department: 'Reference'
  },
  {
    username: 'member1',
    password: 'Password123!',
    email: 'member1@lms.local',
    firstName: 'John',
    lastName: 'Doe',
    role: 'Member',
    membershipType: 'Student',
    memberCode: 'MEM2024001'
  }
  // ... 9 more members with varied membershipTypes
];
```


### Categories

```typescript
const categories = [
  { categoryId: 1, categoryName: 'Fiction', parentId: null },
  { categoryId: 2, categoryName: 'Non-Fiction', parentId: null },
  { categoryId: 3, categoryName: 'Science', parentId: 2 },
  { categoryId: 4, categoryName: 'History', parentId: 2 },
  { categoryId: 5, categoryName: 'Technology', parentId: 2 },
  { categoryId: 6, categoryName: 'Literature', parentId: 1 }
];
```

### Books and Copies

Create 30 books across categories with 2 copies each (60 total copies):

```typescript
const books = [
  {
    isbn: '978-0-439-13959-5',
    title: 'Harry Potter and the Goblet of Fire',
    author: 'J.K. Rowling',
    publisher: 'Scholastic',
    publicationYear: 2000,
    categoryId: 6,
    copies: [
      { barcode: 'BC001', status: 'Available', condition: 'Good', locationCode: 'A-12-3' },
      { barcode: 'BC002', status: 'Loaned', condition: 'Fair', locationCode: 'A-12-3' }
    ]
  },
  {
    isbn: '978-0-7432-7356-5',
    title: '1984',
    author: 'George Orwell',
    publisher: 'Harcourt',
    publicationYear: 1949,
    categoryId: 6,
    copies: [
      { barcode: 'BC003', status: 'Available', condition: 'Good', locationCode: 'A-15-1' },
      { barcode: 'BC004', status: 'Reserved', condition: 'Good', locationCode: 'A-15-1' }
    ]
  }
  // ... 28 more books
];
```

### Loans

Create 10 active loans and 10 returned loans:

```typescript
const activeLoans = [
  {
    memberId: 4, // member1
    barcode: 'BC002',
    issueDate: new Date('2024-01-10'),
    dueDate: new Date('2024-01-24'),
    status: 'Active',
    issuedById: 2, // librarian1
    renewalCount: 0
  }
  // ... 9 more active loans
];

const returnedLoans = [
  {
    memberId: 5, // member2
    barcode: 'BC010',
    issueDate: new Date('2023-12-01'),
    dueDate: new Date('2023-12-15'),
    returnDate: new Date('2023-12-20'), // 5 days overdue
    status: 'Returned',
    issuedById: 2,
    returnedToId: 3, // librarian2
    renewalCount: 1
  }
  // ... 9 more returned loans
];
```

### Reservations

Create 5 pending reservations:

```typescript
const reservations = [
  {
    memberId: 6,
    isbn: '978-0-7432-7356-5', // 1984
    reserveDate: new Date('2024-01-12'),
    status: 'Pending'
  }
  // ... 4 more pending reservations
];
```

### Fines

Create 5 unpaid fines and 5 paid fines:

```typescript
const unpaidFines = [
  {
    loanId: 11, // from returnedLoans
    memberId: 5,
    amount: 25000, // 5 days * 5000
    reason: 'Overdue',
    status: 'Unpaid'
  }
  // ... 4 more unpaid fines
];

const paidFines = [
  {
    loanId: 12,
    memberId: 6,
    amount: 10000,
    reason: 'Overdue',
    status: 'Paid',
    paidAt: new Date('2024-01-05')
  }
  // ... 4 more paid fines with corresponding payments
];
```

### System Config

```typescript
const systemConfig = [
  { configKey: 'loan_period_days', configValue: '14' },
  { configKey: 'max_renewals', configValue: '2' },
  { configKey: 'fine_rate_per_day', configValue: '5000' },
  { configKey: 'fine_block_threshold', configValue: '50000' },
  { configKey: 'reservation_hold_days', configValue: '3' }
];
```

### Notifications (Stubbed)

Create a few notification records to demonstrate structure:

```typescript
const notifications = [
  {
    userId: 4,
    type: 'LoanDueSoon',
    channel: 'Email',
    content: 'Your loan for "Harry Potter" is due in 2 days',
    status: 'Pending',
    sentAt: null
  },
  {
    userId: 6,
    type: 'ReservationReady',
    channel: 'SMS',
    content: 'Your reserved book "1984" is ready for pickup',
    status: 'Pending',
    sentAt: null
  }
];
```

### Reports (Stubbed)

Create a few report records to demonstrate structure:

```typescript
const reports = [
  {
    reportType: 'MonthlyCirculation',
    generatedBy: 1, // admin
    parameters: JSON.stringify({ month: '2024-01', format: 'PDF' }),
    filePath: '/reports/circulation_2024_01.pdf',
    createdAt: new Date('2024-01-31')
  }
];
```


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

The following properties are derived from the acceptance criteria in the requirements document. Each property is universally quantified (applies to all valid inputs) and will be validated through property-based testing.

### Authentication and Authorization Properties

**Property 1: Search accessibility**
*For any* search query, unauthenticated requests to the book search endpoint should succeed without requiring a JWT token.
**Validates: Requirements 1.1**

**Property 2: Search result matching**
*For any* search term and book collection, all returned books should contain the search term in their title, author, or ISBN fields (case-insensitive LIKE matching).
**Validates: Requirements 1.2**

**Property 3: Book detail completeness**
*For any* book ISBN, the book detail response should include all book fields and the status of all associated book copies.
**Validates: Requirements 1.3**

**Property 4: Valid login returns JWT**
*For any* user with valid credentials, login should return a JWT token that can be verified and contains the correct userId and role.
**Validates: Requirements 2.1**

**Property 5: Invalid login rejection**
*For any* invalid credentials (wrong password or non-existent user), login should fail with an appropriate error message.
**Validates: Requirements 2.2**

**Property 6: JWT verification and identity extraction**
*For any* valid JWT token, protected endpoints should successfully verify the token and make user identity available in the request context.
**Validates: Requirements 2.3**

**Property 7: Password security**
*For any* user account, the password should be stored as a bcrypt hash in the database, and no API response should ever contain the passwordHash field.
**Validates: Requirements 2.5**

**Property 8: Role hierarchy permissions**
*For any* user with Administrator role, they should be able to access all Librarian and Member endpoints; for any user with Librarian role, they should be able to access all Member endpoints.
**Validates: Requirements 12.2, 12.3**

**Property 9: RBAC enforcement**
*For any* protected endpoint with role requirements, requests from users with insufficient role level should be rejected with FORBIDDEN error code.
**Validates: Requirements 12.5, 12.6**


### Loan Management Properties

**Property 10: Member loan isolation**
*For any* member requesting their loans, the response should contain only loans belonging to that member and no loans from other members.
**Validates: Requirements 3.1**

**Property 11: Renewal count validation**
*For any* loan with renewalCount equal to max_renewals config value, renewal requests should be rejected.
**Validates: Requirements 3.2, 3.6**

**Property 12: Renewal blocked by pending reservation**
*For any* loan where a pending reservation exists for the same ISBN, renewal requests should be rejected.
**Validates: Requirements 3.3**

**Property 13: Renewal blocked by unpaid fines**
*For any* member with total unpaid fines exceeding fine_block_threshold config value, renewal requests should be rejected.
**Validates: Requirements 3.4**

**Property 14: Renewal effects**
*For any* successful renewal, the loan's renewalCount should increment by 1 and dueDate should extend by loan_period_days from the current dueDate.
**Validates: Requirements 3.5**

**Property 15: Checkout member validation**
*For any* checkout attempt, if the member status is not Active or if the member's active loan count equals or exceeds their borrowingLimit, the checkout should be rejected.
**Validates: Requirements 6.2, 6.3, 13.4**

**Property 16: Checkout race condition prevention**
*For any* book copy, if two concurrent checkout attempts are made for the same barcode, exactly one should succeed and the other should fail with COPY_NOT_AVAILABLE error.
**Validates: Requirements 6.5, 6.8**

**Property 17: Checkout due date calculation**
*For any* successful checkout, the created loan's dueDate should equal the checkout date plus loan_period_days config value.
**Validates: Requirements 6.6**

**Property 18: Checkout audit logging**
*For any* successful checkout, an audit log entry with action CHECKOUT should be created with the librarian's userId and the loan's loanId.
**Validates: Requirements 6.7**

**Property 19: Checkout atomicity**
*For any* checkout attempt that fails validation (invalid member, limit exceeded, copy unavailable), no loan record should be created and the book copy status should remain unchanged.
**Validates: Requirements 6.1, 16.1, 16.3**

**Property 20: Checkin loan validation**
*For any* checkin attempt on a loan with status other than Active, the checkin should be rejected.
**Validates: Requirements 7.2**

**Property 21: Checkin status update**
*For any* successful checkin, the loan status should be updated to Returned and returnDate should be set to the current timestamp.
**Validates: Requirements 7.3**

**Property 22: Overdue fine calculation**
*For any* checkin where returnDate exceeds dueDate, a fine should be created with amount equal to floor((returnDate - dueDate) / 1 day) * fine_rate_per_day config value, and only one fine should be created per loan.
**Validates: Requirements 7.4, 7.5, 7.10**

**Property 23: Reservation fulfillment on checkin**
*For any* checkin where pending reservations exist for the ISBN, the book copy status should be set to Reserved, the earliest reservation (by reserveDate) should be updated to Fulfilled with expiryDate set to current date plus reservation_hold_days, and a notification record should be created.
**Validates: Requirements 7.6, 7.7, 15.2, 15.3, 15.4**

**Property 24: Copy availability on checkin without reservations**
*For any* checkin where no pending reservations exist for the ISBN, the book copy status should be set to Available.
**Validates: Requirements 7.8, 15.5**

**Property 25: Checkin audit logging**
*For any* successful checkin, an audit log entry with action CHECKIN should be created with the librarian's userId and the loan's loanId.
**Validates: Requirements 7.9**

**Property 26: Checkin atomicity**
*For any* checkin operation, if any step fails (loan not found, already returned), no changes should be committed (loan status unchanged, no fine created, copy status unchanged).
**Validates: Requirements 7.1, 16.2, 16.3**


### Reservation and Fine Properties

**Property 27: Reservation creation**
*For any* member creating a reservation for a valid ISBN, the reservation should be stored with status Pending regardless of current copy availability.
**Validates: Requirements 4.1, 4.4**

**Property 28: Member reservation isolation**
*For any* member requesting their reservations, the response should contain only reservations belonging to that member.
**Validates: Requirements 4.2**

**Property 29: Reservation cancellation**
*For any* member cancelling their own reservation, the reservation status should be updated to Cancelled.
**Validates: Requirements 4.3**

**Property 30: Reserved copy checkout prevention**
*For any* book copy with status Reserved, checkout attempts should be rejected until the reservation expires or is cancelled.
**Validates: Requirements 15.6**

**Property 31: Fine display completeness**
*For any* member viewing their fines, all fines should include status, amount, reason, and associated loan information.
**Validates: Requirements 5.1**

**Property 32: Fine payment processing**
*For any* unpaid fine, when a member pays online, a payment record should be created with method Online and status Success, and the fine status should be updated to Paid with paidAt timestamp.
**Validates: Requirements 5.2, 5.3**

**Property 33: Notification stub behavior**
*For any* operation that triggers notifications (reservation ready, loan due soon), a notification record should be created in the database with status Pending, but no actual email or SMS should be sent.
**Validates: Requirements 19.4**

### Catalog Management Properties

**Property 34: Book copy creation defaults**
*For any* new book copy created by a librarian, if condition is not specified, it should default to Good, and status should default to Available.
**Validates: Requirements 8.4**

**Property 35: Book copy barcode uniqueness**
*For any* book copy, the barcode should be unique across all copies, and each copy should be correctly linked to its ISBN.
**Validates: Requirements 8.3**

### User Management Properties

**Property 36: User filtering**
*For any* user query with role and status filters, all returned users should match the specified role and status values.
**Validates: Requirements 9.1**

**Property 37: User creation with profile**
*For any* user created by an administrator, both the user record and the appropriate role-specific profile record (member, librarian, or administrator) should be created atomically.
**Validates: Requirements 9.2**

**Property 38: User status validation**
*For any* user status value, only Active, Inactive, Locked, and Pending should be accepted; other values should be rejected.
**Validates: Requirements 9.4**

**Property 39: Borrowing limit by membership type**
*For any* member created with membershipType Student, the borrowingLimit should be 5; for Faculty, it should be 10; for Public, it should be 3.
**Validates: Requirements 13.1, 13.2, 13.3**

**Property 40: Copy status validation**
*For any* book copy status value, only Available, Loaned, Reserved, Lost, and Repair should be accepted; other values should be rejected.
**Validates: Requirements 15.1**


### System Configuration and Audit Properties

**Property 41: Audit log completeness**
*For any* audit log entry, it should contain userId, action, entityType, entityId, ipAddress (if available), and createdAt timestamp.
**Validates: Requirements 11.1**

**Property 42: Audit log filtering**
*For any* audit log query with userId or action filters, all returned logs should match the specified filter values.
**Validates: Requirements 11.2**

### Data Serialization Properties

**Property 43: BigInt serialization**
*For any* API response containing database records with BigInt primary keys, all ID fields should be serialized as strings, not numbers.
**Validates: Requirements 14.2, 14.3**

### Error Handling Properties

**Property 44: Error response format**
*For any* error condition, the response should have structure { error: { code, message } } where code is one of: BAD_REQUEST, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, INTERNAL_ERROR.
**Validates: Requirements 17.1, 17.2**

## Error Handling

### Error Classes

The system implements custom error classes for consistent error handling:

```typescript
class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number
  ) {
    super(message);
  }
}

class BadRequestError extends AppError {
  constructor(message: string) {
    super('BAD_REQUEST', message, 400);
  }
}

class UnauthorizedError extends AppError {
  constructor(message: string) {
    super('UNAUTHORIZED', message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message: string) {
    super('FORBIDDEN', message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(message: string) {
    super('NOT_FOUND', message, 404);
  }
}

class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
  }
}

class InternalError extends AppError {
  constructor(message: string) {
    super('INTERNAL_ERROR', message, 500);
  }
}
```

### Global Error Handler

```typescript
function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message
      }
    });
  }
  
  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Unique constraint violation'
        }
      });
    }
  }
  
  // Validation errors (Zod)
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'Validation failed',
        details: err.errors
      }
    });
  }
  
  // Unknown errors
  console.error('Unhandled error:', err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  });
}
```

### Validation Error Handling

All request validation uses Zod schemas:

```typescript
const checkoutSchema = z.object({
  memberCode: z.string().min(1),
  barcode: z.string().min(1)
});

function validateRequest(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (err) {
      next(err); // Caught by global error handler
    }
  };
}
```


## Testing Strategy

### Dual Testing Approach

The LMS will use both unit testing and property-based testing to ensure comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs through randomization

Both testing approaches are complementary and necessary. Unit tests catch concrete bugs in specific scenarios, while property tests verify general correctness across a wide range of inputs.

### Property-Based Testing Framework

**Framework**: We will use **fast-check** for Node.js/TypeScript property-based testing.

**Configuration**:
- Minimum 100 iterations per property test (due to randomization)
- Each property test must reference its design document property
- Tag format: `// Feature: library-management-system, Property {number}: {property_text}`

**Example Property Test Structure**:

```typescript
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';

describe('Loan Management Properties', () => {
  it('Property 11: Renewal count validation', async () => {
    // Feature: library-management-system, Property 11: Renewal count validation
    
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          loanId: fc.bigInt({ min: 1n, max: 1000n }),
          renewalCount: fc.integer({ min: 0, max: 5 }),
          maxRenewals: fc.integer({ min: 1, max: 3 })
        }),
        async ({ loanId, renewalCount, maxRenewals }) => {
          // Setup: Create loan with renewalCount
          const loan = await createTestLoan({ 
            loanId, 
            renewalCount,
            status: 'Active' 
          });
          
          // Setup: Set max_renewals config
          await setConfig('max_renewals', maxRenewals.toString());
          
          // Act: Attempt renewal
          const result = await renewLoan(loanId.toString(), loan.memberId);
          
          // Assert: Should fail if at max, succeed otherwise
          if (renewalCount >= maxRenewals) {
            expect(result.error).toBeDefined();
            expect(result.error.code).toBe('BAD_REQUEST');
          } else {
            expect(result.loan.renewalCount).toBe(renewalCount + 1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Testing Strategy

**Framework**: Vitest for unit and integration tests

**Test Organization**:
```
server/src/
├── services/
│   ├── loan.service.js
│   └── loan.service.test.js
├── controllers/
│   ├── loan.controller.js
│   └── loan.controller.test.js
```

**Unit Test Focus Areas**:

1. **Specific Examples**: Test concrete scenarios that demonstrate correct behavior
   - Example: Checkout with valid member and available copy succeeds
   - Example: Login with demo account credentials succeeds

2. **Edge Cases**: Test boundary conditions
   - Example: Member at exactly borrowing limit
   - Example: Loan due today (not overdue yet)
   - Example: Empty search query returns all books

3. **Error Conditions**: Test validation and error handling
   - Example: Checkout with invalid member code returns NOT_FOUND
   - Example: Renew with non-existent loan ID returns NOT_FOUND
   - Example: Login with empty password returns BAD_REQUEST

4. **Integration Points**: Test component interactions
   - Example: Checkout creates loan AND updates copy status AND creates audit log
   - Example: Payment updates fine status AND creates payment record

**Example Unit Test**:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { checkout } from './loan.service';

describe('Loan Service - Checkout', () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it('should successfully checkout available copy to active member', async () => {
    // Arrange
    const member = await createTestMember({ 
      memberCode: 'TEST001',
      status: 'Active',
      borrowingLimit: 5 
    });
    const copy = await createTestCopy({ 
      barcode: 'BC001',
      status: 'Available' 
    });
    const librarian = await createTestLibrarian();

    // Act
    const result = await checkout('TEST001', 'BC001', librarian.userId);

    // Assert
    expect(result.loan).toBeDefined();
    expect(result.loan.memberId).toBe(member.memberId);
    expect(result.loan.barcode).toBe('BC001');
    expect(result.loan.status).toBe('Active');
    
    // Verify copy status changed
    const updatedCopy = await getCopy('BC001');
    expect(updatedCopy.status).toBe('Loaned');
    
    // Verify audit log created
    const auditLog = await getLatestAuditLog();
    expect(auditLog.action).toBe('CHECKOUT');
  });

  it('should reject checkout when member at borrowing limit', async () => {
    // Arrange
    const member = await createTestMember({ 
      memberCode: 'TEST002',
      borrowingLimit: 2 
    });
    await createTestLoans(member.memberId, 2); // Already at limit
    const copy = await createTestCopy({ status: 'Available' });
    const librarian = await createTestLibrarian();

    // Act & Assert
    await expect(
      checkout('TEST002', copy.barcode, librarian.userId)
    ).rejects.toThrow('Borrowing limit exceeded');
  });

  it('should reject checkout of non-available copy', async () => {
    // Arrange
    const member = await createTestMember({ memberCode: 'TEST003' });
    const copy = await createTestCopy({ 
      barcode: 'BC002',
      status: 'Loaned' // Already loaned
    });
    const librarian = await createTestLibrarian();

    // Act & Assert
    await expect(
      checkout('TEST003', 'BC002', librarian.userId)
    ).rejects.toThrow('COPY_NOT_AVAILABLE');
  });
});
```

### Test Data Generators

For property-based testing, create generators for domain objects:

```typescript
// test/generators.ts
import fc from 'fast-check';

export const memberCodeArb = fc.string({ 
  minLength: 8, 
  maxLength: 20 
}).map(s => 'MEM' + s);

export const barcodeArb = fc.string({ 
  minLength: 5, 
  maxLength: 20 
}).map(s => 'BC' + s);

export const isbnArb = fc.string({ 
  minLength: 13, 
  maxLength: 17 
}).filter(s => /^978-\d-\d{3}-\d{5}-\d$/.test(s));

export const membershipTypeArb = fc.constantFrom('Student', 'Faculty', 'Public');

export const copyStatusArb = fc.constantFrom(
  'Available', 'Loaned', 'Reserved', 'Lost', 'Repair'
);

export const userRoleArb = fc.constantFrom('Member', 'Librarian', 'Administrator');

export const memberArb = fc.record({
  memberCode: memberCodeArb,
  membershipType: membershipTypeArb,
  status: fc.constantFrom('Active', 'Inactive', 'Locked'),
  borrowingLimit: fc.integer({ min: 1, max: 10 })
});

export const loanArb = fc.record({
  memberId: fc.bigInt({ min: 1n, max: 1000n }),
  barcode: barcodeArb,
  issueDate: fc.date({ min: new Date('2024-01-01') }),
  dueDate: fc.date({ min: new Date('2024-01-15') }),
  status: fc.constantFrom('Active', 'Returned', 'Lost'),
  renewalCount: fc.integer({ min: 0, max: 3 })
});
```

### Test Coverage Goals

- **Unit test coverage**: Minimum 80% line coverage for services and controllers
- **Property test coverage**: All 44 correctness properties must have corresponding property tests
- **Integration test coverage**: All API endpoints must have at least one successful request test

### Continuous Integration

Tests will run automatically on:
- Every commit (pre-commit hook)
- Every pull request
- Before deployment

**CI Configuration** (example for GitHub Actions):

```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: testpass
          MYSQL_DATABASE: lms_test
        ports:
          - 3306:3306
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npx prisma migrate deploy
      - run: npm test
      - run: npm run test:coverage
```

### Manual Testing Checklist

Before release, manually verify:

- [ ] Guest can search books without login
- [ ] Member can login with demo credentials
- [ ] Member can renew loan (within limits)
- [ ] Member renewal blocked when at max renewals
- [ ] Member renewal blocked when pending reservation exists
- [ ] Member renewal blocked when unpaid fines exceed threshold
- [ ] Librarian can checkout book to member
- [ ] Librarian checkout fails for non-available copy (race condition test)
- [ ] Librarian checkin calculates fine correctly for overdue
- [ ] Librarian checkin fulfills pending reservation
- [ ] Member can pay fine (fake payment succeeds)
- [ ] Admin can view and update system config
- [ ] Admin can manage users (create, update role/status)
- [ ] Admin can view audit logs

## Deployment Configuration

### Environment Variables

```bash
# Database
DATABASE_URL="mysql://lms:lms123@localhost:3307/lms_mvp"

# JWT
JWT_SECRET="your-secret-key-change-in-production"
JWT_EXPIRES_IN="24h"

# Server
PORT=3000
NODE_ENV="production"

# CORS
CORS_ORIGIN="http://localhost:5173"
```

### Docker Compose Production

```yaml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    container_name: lms_mysql_prod
    command: --default-time-zone=+07:00
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: lms_mvp
      MYSQL_USER: lms
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    ports:
      - "3307:3306"
    volumes:
      - lms_mysql_data:/var/lib/mysql
    restart: unless-stopped

  backend:
    build: ./server
    container_name: lms_backend
    depends_on:
      - mysql
    environment:
      DATABASE_URL: "mysql://lms:${MYSQL_PASSWORD}@mysql:3306/lms_mvp"
      JWT_SECRET: ${JWT_SECRET}
      PORT: 3000
    ports:
      - "3000:3000"
    restart: unless-stopped

  frontend:
    build: ./client
    container_name: lms_frontend
    depends_on:
      - backend
    ports:
      - "80:80"
    restart: unless-stopped

volumes:
  lms_mysql_data:
```

### Runbook

**Initial Setup:**

```bash
# 1. Start database
docker compose up -d

# 2. Install backend dependencies
cd server
npm install

# 3. Run migrations
npx prisma migrate deploy

# 4. Seed database
npm run db:seed

# 5. Start backend
npm run dev

# 6. Install frontend dependencies (in new terminal)
cd client
npm install

# 7. Start frontend
npm run dev
```

**Access Points:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- phpMyAdmin: http://localhost:8081
- API Health: http://localhost:3000/health

**Demo Accounts:**
- Admin: `admin` / `Password123!`
- Librarian: `librarian1` / `Password123!`
- Member: `member1` / `Password123!`

## Summary

This design document specifies a complete Library Management System with:

- **15-table database schema** aligned with course report
- **Hierarchical RBAC** (Guest → Member → Librarian → Administrator)
- **Transaction-based operations** with race condition prevention
- **44 correctness properties** for property-based testing
- **Comprehensive API** with both `/api/me/*` and `/api/members/{id}/*` endpoints
- **Stubbed external services** (email, SMS, payment gateway)
- **Complete seed data** for immediate demonstration

The system prioritizes data integrity through transactions, prevents race conditions through conditional updates, and ensures correctness through comprehensive property-based testing.
