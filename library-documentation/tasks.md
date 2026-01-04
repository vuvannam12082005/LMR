# Implementation Plan: Library Management System

## Overview

This implementation plan breaks down the LMS MVP into incremental, testable steps. Each task builds on previous work and includes specific requirements references. The plan follows the incremental commit strategy specified in the requirements.

## Tasks

- [x] 1. Docker setup and database health check
  - Create docker-compose.yml with MySQL 8.0 and phpMyAdmin
  - Configure MySQL timezone to +07:00
  - Add healthcheck for MySQL service
  - Verify containers start successfully
  - _Requirements: 18.1_

- [x] 2. Backend skeleton and health endpoint
  - [x] 2.1 Initialize Node.js project with package.json
    - Add dependencies: express, @prisma/client, bcryptjs, jsonwebtoken, zod, cors, dotenv
    - Add dev dependencies: prisma, vitest, fast-check
    - Configure ES modules (type: "module")
    - _Requirements: 18.1_
  
  - [x] 2.2 Create basic Express app structure
    - Create src/app.js with Express setup
    - Create src/index.js as entry point
    - Add CORS middleware
    - Add JSON body parser
    - _Requirements: 18.1_
  
  - [x] 2.3 Implement GET /health endpoint
    - Return { status: 'ok', timestamp: Date.now() }
    - Test endpoint returns 200 OK
    - _Requirements: 18.1_

- [x] 3. Prisma schema, migrations, and seed data
  - [x] 3.1 Create complete Prisma schema
    - Define all 15 tables: user, member, librarian, administrator, book, book_copy, category, loan, reservation, fine, payment, notification, report, system_config, audit_log
    - Define all enums: Role, UserStatus, CopyStatus, CopyCondition, LoanStatus, ReservationStatus, FineReason, FineStatus, PaymentMethod, PaymentStatus
    - Add all indexes for performance
    - _Requirements: 18.1, 18.7_
  
  - [x] 3.2 Run Prisma migration
    - Execute `npx prisma migrate dev --name init`
    - Verify all tables created in MySQL
    - _Requirements: 18.1_
  
  - [x] 3.3 Create seed script
    - Create prisma/seed.js
    - Seed 1 admin, 2 librarians, 10 members with hashed passwords
    - Seed 6 categories, 30 books, 60 book copies
    - Seed 10 active loans, 10 returned loans
    - Seed 5 pending reservations, 10 fines (5 unpaid, 5 paid)
    - Seed system_config with all 5 required keys
    - Seed demo accounts: admin/Password123!, librarian1/Password123!, member1/Password123!
    - _Requirements: 18.2, 18.3, 18.4, 18.5, 18.6_
  
  - [x] 3.4 Run seed script
    - Execute `npm run db:seed`
    - Verify data in phpMyAdmin
    - _Requirements: 18.2, 18.3, 18.4_

- [x] 4. Core utilities and middleware
  - [x] 4.1 Create Prisma client singleton
    - Create src/config/database.js
    - Export single Prisma client instance
    - _Requirements: 18.1_
  
  - [x] 4.2 Create BigInt serialization utility
    - Create src/utils/bigint.js
    - Implement serializeBigInt function to convert BigInt to string recursively
    - Add BigInt.prototype.toJSON override
    - _Requirements: 14.2_
  
  - [x] 4.3 Create custom error classes
    - Create src/utils/errors.js
    - Implement AppError, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, InternalError
    - _Requirements: 17.1, 17.2_
  
  - [x] 4.4 Create global error handler middleware
    - Create src/middleware/errorHandler.js
    - Handle AppError, Prisma errors, Zod validation errors
    - Return consistent error format: { error: { code, message } }
    - _Requirements: 17.1, 17.2_
  
  - [x] 4.5 Create auth middleware
    - Create src/middleware/auth.js
    - Implement verifyToken function to verify JWT and attach req.user
    - Handle missing/invalid tokens with UnauthorizedError
    - _Requirements: 2.3, 12.4_
  
  - [x] 4.6 Create RBAC middleware
    - Create src/middleware/rbac.js
    - Implement requireRole function with role hierarchy (Admin > Librarian > Member)
    - Support ownership checks for /api/members/{id}/* endpoints
    - _Requirements: 12.1, 12.2, 12.3, 12.5, 12.6_


- [ ] 5. Authentication endpoints
  - [x] 5.1 Create auth service
    - Create src/services/auth.service.js
    - Implement register function (create user + member profile with borrowing limit)
    - Implement login function (verify credentials, generate JWT)
    - Implement verifyToken function
    - _Requirements: 2.1, 2.2, 13.1, 13.2, 13.3_
  
  - [x] 5.2 Create auth controller
    - Create src/controllers/auth.controller.js
    - Implement register, login, getMe, logout handlers
    - Use Zod schemas for validation
    - _Requirements: 2.1, 2.2, 20.1_
  
  - [x] 5.3 Create auth routes
    - Create src/routes/auth.routes.js
    - POST /api/auth/register (public)
    - POST /api/auth/login (public)
    - GET /api/auth/me (protected)
    - POST /api/auth/logout (protected)
    - _Requirements: 20.1_
  
  - [ ]* 5.4 Write property tests for authentication
    - **Property 4: Valid login returns JWT**
    - **Property 5: Invalid login rejection**
    - **Property 7: Password security**
    - **Validates: Requirements 2.1, 2.2, 2.5**
  
  - [ ]* 5.5 Write unit tests for auth edge cases
    - Test registration with duplicate username/email
    - Test login with empty credentials
    - Test JWT expiration handling
    - _Requirements: 2.1, 2.2_

- [ ] 6. System configuration endpoints (Admin)
  - [x] 6.1 Create config service
    - Create src/services/config.service.js
    - Implement getAll, get, update, getAsNumber functions
    - _Requirements: 10.2, 10.3_
  
  - [x] 6.2 Create admin controller for config
    - Create src/controllers/admin.controller.js
    - Implement getConfig, updateConfig handlers
    - _Requirements: 10.2, 10.3, 20.7_
  
  - [x] 6.3 Create admin routes for config
    - Create src/routes/admin.routes.js
    - GET /api/admin/config (Administrator only)
    - PUT /api/admin/config/:key (Administrator only)
    - _Requirements: 20.7_

- [ ] 7. Book catalog endpoints
  - [x] 7.1 Create book service
    - Create src/services/book.service.js
    - Implement search (LIKE matching on title/author/isbn)
    - Implement getByISBN (include copies with status)
    - Implement create, update (Librarian)
    - Implement addCopy (Librarian)
    - _Requirements: 1.2, 1.3, 8.1, 8.2, 8.3, 8.4_
  
  - [x] 7.2 Create book controller
    - Create src/controllers/book.controller.js
    - Implement search, getByISBN, create, update, addCopy handlers
    - Use Zod schemas for validation
    - _Requirements: 1.2, 1.3, 8.1, 8.2, 8.3, 20.2_
  
  - [x] 7.3 Create book routes
    - Create src/routes/book.routes.js
    - GET /api/books (public)
    - GET /api/books/:isbn (public)
    - POST /api/books (Librarian)
    - PUT /api/books/:isbn (Librarian)
    - POST /api/books/:isbn/copies (Librarian)
    - _Requirements: 20.2_
  
  - [ ]* 7.4 Write property tests for book catalog
    - **Property 2: Search result matching**
    - **Property 3: Book detail completeness**
    - **Property 34: Book copy creation defaults**
    - **Property 35: Book copy barcode uniqueness**
    - **Validates: Requirements 1.2, 1.3, 8.3, 8.4**
  
  - [ ]* 7.5 Write unit tests for book operations
    - Test search with empty query
    - Test getByISBN with non-existent ISBN
    - Test create book with duplicate ISBN
    - Test addCopy with duplicate barcode
    - _Requirements: 1.2, 1.3, 8.1, 8.2, 8.3_

- [ ] 8. Reservation endpoints
  - [x] 8.1 Create reservation service
    - Create src/services/reservation.service.js
    - Implement create (allow regardless of copy availability)
    - Implement cancel (update status to Cancelled)
    - Implement getMemberReservations
    - Implement findPendingByISBN, fulfillEarliest (for checkin)
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [x] 8.2 Create reservation controller
    - Create src/controllers/reservation.controller.js
    - Implement create, cancel, getMemberReservations handlers
    - _Requirements: 4.1, 4.2, 4.3, 20.4_
  
  - [x] 8.3 Create reservation routes
    - Create src/routes/reservation.routes.js
    - POST /api/reservations (Member)
    - GET /api/reservations (Member - own reservations via /api/me/reservations alias)
    - DELETE /api/reservations/:id (Member)
    - GET /api/members/:id/reservations (Librarian/Admin)
    - _Requirements: 20.4, 20.5_
  
  - [ ]* 8.4 Write property tests for reservations
    - **Property 27: Reservation creation**
    - **Property 28: Member reservation isolation**
    - **Property 29: Reservation cancellation**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**


- [ ] 9. Checkout transaction (CRITICAL - Core business logic)
  - [x] 9.1 Create audit service
    - Create src/services/audit.service.js
    - Implement log function to create audit log entries
    - Implement getLogs with filtering
    - _Requirements: 11.1, 11.2_
  
  - [x] 9.2 Implement checkout transaction in loan service
    - Create src/services/loan.service.js
    - Implement checkout function with Prisma $transaction
    - Step 1: Find and validate member (status Active, not at borrowing limit)
    - Step 2: Get loan_period_days config
    - Step 3: Conditional update: updateMany(where: { barcode, status: 'Available' }, data: { status: 'Loaned' })
    - Step 4: Check updateResult.count === 0, throw ConflictError('COPY_NOT_AVAILABLE')
    - Step 5: Create loan with calculated dueDate
    - Step 6: Create audit log with action CHECKOUT
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_
  
  - [x] 9.3 Create loan controller for checkout
    - Create src/controllers/loan.controller.js
    - Implement checkout handler
    - Use Zod schema for { memberCode, barcode }
    - _Requirements: 6.1, 20.3_
  
  - [x] 9.4 Create loan routes for checkout
    - Create src/routes/loan.routes.js
    - POST /api/loans (Librarian - checkout)
    - _Requirements: 20.3_
  
  - [ ]* 9.5 Write property tests for checkout
    - **Property 15: Checkout member validation**
    - **Property 16: Checkout race condition prevention**
    - **Property 17: Checkout due date calculation**
    - **Property 18: Checkout audit logging**
    - **Property 19: Checkout atomicity**
    - **Validates: Requirements 6.2, 6.3, 6.5, 6.6, 6.7, 6.1, 16.3**
  
  - [ ]* 9.6 Write unit tests for checkout edge cases
    - Test checkout with inactive member
    - Test checkout with member at borrowing limit
    - Test checkout with non-existent member code
    - Test checkout with non-existent barcode
    - Test concurrent checkout attempts (race condition)
    - _Requirements: 6.2, 6.3, 6.5_

- [ ] 10. Checkin transaction with fine calculation and reservation handling
  - [x] 10.1 Create fine service
    - Create src/services/fine.service.js
    - Implement createOverdueFine function
    - Implement getMemberFines, getTotalUnpaid
    - Implement payFine (fake payment - always succeeds)
    - _Requirements: 7.4, 7.5, 5.2, 5.3_
  
  - [x] 10.2 Implement checkin transaction in loan service
    - Implement checkin function with Prisma $transaction
    - Step 1: Find and validate loan (status Active)
    - Step 2: Update loan to Returned with returnDate
    - Step 3: Calculate overdue days: max(0, floor((returnDate - dueDate) / 1 day))
    - Step 4: If overdue > 0, create fine with amount = overdueDays * fine_rate_per_day
    - Step 5: Check for pending reservations by ISBN
    - Step 6a: If reservation exists, fulfill earliest + set copy Reserved + create notification
    - Step 6b: If no reservation, set copy Available
    - Step 7: Create audit log with action CHECKIN
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10_
  
  - [x] 10.3 Add checkin handler to loan controller
    - Implement checkin handler
    - Return { loan, fine, reservation } result
    - _Requirements: 7.1, 20.3_
  
  - [x] 10.4 Add checkin route
    - PUT /api/loans/:id/return (Librarian)
    - _Requirements: 20.3_
  
  - [ ]* 10.5 Write property tests for checkin
    - **Property 20: Checkin loan validation**
    - **Property 21: Checkin status update**
    - **Property 22: Overdue fine calculation**
    - **Property 23: Reservation fulfillment on checkin**
    - **Property 24: Copy availability on checkin without reservations**
    - **Property 25: Checkin audit logging**
    - **Property 26: Checkin atomicity**
    - **Property 30: Reserved copy checkout prevention**
    - **Validates: Requirements 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 15.6**
  
  - [ ]* 10.6 Write unit tests for checkin scenarios
    - Test checkin on-time (no fine)
    - Test checkin 5 days overdue (fine = 5 * 5000)
    - Test checkin with pending reservation (copy becomes Reserved)
    - Test checkin without reservation (copy becomes Available)
    - Test checkin on already returned loan (should fail)
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 7.8_

- [ ] 11. Checkpoint - Verify core circulation works
  - Ensure all tests pass
  - Manually test checkout → checkin flow
  - Verify race condition prevention works
  - Ask user if questions arise


- [ ] 12. Renew transaction and member self-service endpoints
  - [x] 12.1 Implement renew transaction in loan service
    - Implement renew function with Prisma $transaction
    - Step 1: Find and validate loan (Active, belongs to member)
    - Step 2: Check renewalCount < max_renewals
    - Step 3: Check no pending reservation for ISBN
    - Step 4: Check total unpaid fines <= fine_block_threshold
    - Step 5: Extend dueDate by loan_period_days, increment renewalCount
    - _Requirements: 3.2, 3.3, 3.4, 3.5_
  
  - [x] 12.2 Add renew handler to loan controller
    - Implement renew handler
    - Verify member owns the loan
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 20.3_
  
  - [x] 12.3 Add member self-service handlers to loan controller
    - Implement getMemberLoans (filter by memberId)
    - Implement getMemberHistory (status = Returned)
    - _Requirements: 3.1, 20.5_
  
  - [x] 12.4 Create member routes
    - Create src/routes/member.routes.js
    - GET /api/me/loans (Member - own loans)
    - GET /api/me/history (Member - own history)
    - PUT /api/loans/:id/renew (Member)
    - GET /api/members/:id/loans (Librarian/Admin)
    - GET /api/members/:id/history (Librarian/Admin)
    - _Requirements: 20.3, 20.5_
  
  - [ ]* 12.5 Write property tests for renew
    - **Property 10: Member loan isolation**
    - **Property 11: Renewal count validation**
    - **Property 12: Renewal blocked by pending reservation**
    - **Property 13: Renewal blocked by unpaid fines**
    - **Property 14: Renewal effects**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
  
  - [ ]* 12.6 Write unit tests for renew edge cases
    - Test renew at max renewals (should fail)
    - Test renew with pending reservation (should fail)
    - Test renew with high unpaid fines (should fail)
    - Test renew on non-existent loan
    - Test renew on other member's loan (should fail)
    - _Requirements: 3.2, 3.3, 3.4_

- [ ] 13. Fine payment endpoints
  - [x] 13.1 Add payment handler to fine controller
    - Create src/controllers/fine.controller.js
    - Implement getMemberFines handler
    - Implement payFine handler (fake payment - create payment + update fine status)
    - Generate fake transactionRef
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [x] 13.2 Create fine routes
    - Create src/routes/fine.routes.js
    - GET /api/me/fines (Member - own fines)
    - POST /api/fines/:id/pay (Member)
    - GET /api/members/:id/fines (Librarian/Admin)
    - _Requirements: 20.5_
  
  - [ ]* 13.3 Write property tests for fines
    - **Property 31: Fine display completeness**
    - **Property 32: Fine payment processing**
    - **Validates: Requirements 5.1, 5.2, 5.3**
  
  - [ ]* 13.4 Write unit tests for fine payment
    - Test pay fine updates status to Paid
    - Test pay fine creates payment record
    - Test pay already paid fine (should fail)
    - Test pay other member's fine (should fail)
    - _Requirements: 5.2, 5.3_

- [ ] 14. Admin user management endpoints
  - [x] 14.1 Create user service
    - Create src/services/user.service.js
    - Implement getUsers with filtering (q, role, status)
    - Implement createUser (create user + role-specific profile in transaction)
    - Implement updateUser (allow role and status changes)
    - Implement getUserWithProfile
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [x] 14.2 Add user management handlers to admin controller
    - Implement getUsers, createUser, updateUser handlers
    - Use Zod schemas for validation
    - _Requirements: 9.1, 9.2, 9.3, 20.7_
  
  - [x] 14.3 Add user routes to admin routes
    - GET /api/admin/users (Administrator)
    - POST /api/admin/users (Administrator)
    - PUT /api/admin/users/:id (Administrator)
    - _Requirements: 20.7_
  
  - [ ]* 14.4 Write property tests for user management
    - **Property 36: User filtering**
    - **Property 37: User creation with profile**
    - **Property 38: User status validation**
    - **Property 39: Borrowing limit by membership type**
    - **Validates: Requirements 9.1, 9.2, 9.4, 13.1, 13.2, 13.3**
  
  - [ ]* 14.5 Write unit tests for user management
    - Test create user with each role (Member, Librarian, Administrator)
    - Test update user role
    - Test update user status to Locked
    - Test filter users by role
    - _Requirements: 9.1, 9.2, 9.3_

- [ ] 15. Admin audit log endpoints
  - [x] 15.1 Add audit log handler to admin controller
    - Implement getAuditLogs handler with filtering
    - Support filters: userId, action, startDate, endDate, limit
    - _Requirements: 11.2, 20.7_
  
  - [x] 15.2 Add audit log route to admin routes
    - GET /api/admin/audit-logs (Administrator)
    - _Requirements: 20.7_
  
  - [ ]* 15.3 Write property tests for audit logs
    - **Property 41: Audit log completeness**
    - **Property 42: Audit log filtering**
    - **Validates: Requirements 11.1, 11.2**


- [x] 16. Integration and API consistency
  - [x] 16.1 Wire all routes to Express app
    - Import all route modules in src/app.js
    - Mount routes: /api/auth, /api/books, /api/loans, /api/reservations, /api/me, /api/members, /api/fines, /api/admin
    - Add global error handler as last middleware
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.7_
  
  - [x] 16.2 Verify BigInt serialization across all endpoints
    - Test all endpoints return string IDs, not numbers
    - Add response interceptor if needed
    - _Requirements: 14.2_
  
  - [x] 16.3 Verify error format consistency
    - Test all error responses have { error: { code, message } } structure
    - Test all error codes are from allowed set
    - _Requirements: 17.1, 17.2_
  
  - [ ]* 16.4 Write property tests for cross-cutting concerns
    - **Property 1: Search accessibility**
    - **Property 6: JWT verification and identity extraction**
    - **Property 9: RBAC enforcement**
    - **Property 33: Notification stub behavior**
    - **Property 40: Copy status validation**
    - **Property 43: BigInt serialization**
    - **Property 44: Error response format**
    - **Validates: Requirements 1.1, 2.3, 12.5, 12.6, 19.4, 15.1, 14.2, 17.1, 17.2**
  
  - [ ]* 16.5 Write integration tests for complete flows
    - Test complete checkout → checkin → fine → payment flow
    - Test complete reservation → checkin → fulfillment flow
    - Test complete member registration → login → borrow → renew flow
    - _Requirements: All_

- [ ] 17. Checkpoint - Backend complete
  - Ensure all tests pass (unit + property + integration)
  - Verify all 44 correctness properties have tests
  - Test with Postman/curl for all endpoints
  - Verify seed data works correctly
  - Ask user if questions arise

- [x] 18. Frontend setup and routing
  - [x] 18.1 Initialize React project with Vite
    - Create client/ directory
    - Run `npm create vite@latest . -- --template react`
    - Install dependencies: @mui/material, @emotion/react, @emotion/styled, react-router-dom, axios
    - _Requirements: 18.1_
  
  - [x] 18.2 Create API client utility
    - Create src/api/client.js with axios instance
    - Add base URL configuration
    - Add JWT token interceptor
    - Add response interceptor for error handling
    - _Requirements: 2.3_
  
  - [x] 18.3 Create auth context and hooks
    - Create src/contexts/AuthContext.jsx
    - Implement login, logout, register functions
    - Store JWT in localStorage
    - Provide user state to app
    - _Requirements: 2.1, 2.2, 2.4_
  
  - [x] 18.4 Create route guards
    - Create src/components/ProtectedRoute.jsx
    - Check authentication and role
    - Redirect to login if not authenticated
    - Redirect to home if insufficient role
    - _Requirements: 12.5, 12.6_
  
  - [x] 18.5 Setup React Router with role-based routes
    - Create src/App.jsx with routes
    - Public routes: /, /login, /register, /books, /books/:isbn
    - Member routes: /my-loans, /my-reservations, /my-fines
    - Librarian routes: /checkout, /checkin, /catalog
    - Admin routes: /admin/users, /admin/config, /admin/audit-logs
    - _Requirements: 12.1, 12.2, 12.3_

- [x] 19. Public pages (Guest)
  - [x] 19.1 Create Home page with search
    - Create src/pages/Home.jsx
    - Implement book search form (title/author/isbn)
    - Display search results in grid
    - Link to book detail page
    - _Requirements: 1.1, 1.2_
  
  - [x] 19.2 Create Book Detail page
    - Create src/pages/BookDetail.jsx
    - Display book information
    - Display all copies with status badges
    - Show "Reserve" button for authenticated members
    - _Requirements: 1.3_
  
  - [x] 19.3 Create Login page
    - Create src/pages/Login.jsx
    - Username/email and password form
    - Call login API
    - Redirect to appropriate dashboard based on role
    - _Requirements: 2.1, 20.1_
  
  - [x] 19.4 Create Register page
    - Create src/pages/Register.jsx
    - Form with username, email, password, firstName, lastName, membershipType
    - Call register API
    - Redirect to login on success
    - _Requirements: 1.4, 20.1_

- [ ] 20. Member pages
  - [ ] 20.1 Create My Loans page
    - Create src/pages/member/MyLoans.jsx
    - Display active loans with due dates
    - Show "Renew" button (disabled if at max renewals or blocked)
    - Show renewal count
    - _Requirements: 3.1, 3.5_
  
  - [ ] 20.2 Create My Reservations page
    - Create src/pages/member/MyReservations.jsx
    - Display pending and fulfilled reservations
    - Show "Cancel" button for pending reservations
    - _Requirements: 4.2, 4.3_
  
  - [ ] 20.3 Create My Fines page
    - Create src/pages/member/MyFines.jsx
    - Display unpaid and paid fines
    - Show "Pay Online" button for unpaid fines
    - Simulate payment success
    - _Requirements: 5.1, 5.2, 5.3_


- [ ] 21. Librarian pages
  - [ ] 21.1 Create Checkout page
    - Create src/pages/librarian/Checkout.jsx
    - Form with member code and barcode inputs
    - Call checkout API
    - Display success message with due date
    - Handle COPY_NOT_AVAILABLE error
    - _Requirements: 6.1, 6.5_
  
  - [ ] 21.2 Create Checkin page
    - Create src/pages/librarian/Checkin.jsx
    - Form with barcode or loan ID input
    - Call checkin API
    - Display return details (fine if overdue, reservation if fulfilled)
    - _Requirements: 7.1, 7.4, 7.5, 7.6_
  
  - [ ] 21.3 Create Catalog Management page
    - Create src/pages/librarian/Catalog.jsx
    - List books with search/filter
    - "Add Book" button → form modal
    - "Edit Book" button → form modal
    - "Add Copy" button → form modal
    - _Requirements: 8.1, 8.2, 8.3_

- [ ] 22. Admin pages
  - [ ] 22.1 Create Users Management page
    - Create src/pages/admin/Users.jsx
    - List users with filters (role, status)
    - "Create User" button → form modal
    - "Edit User" button → form modal (change role/status)
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [ ] 22.2 Create System Config page
    - Create src/pages/admin/Config.jsx
    - Display all config keys in table
    - "Edit" button → inline edit or modal
    - Update config values
    - _Requirements: 10.2, 10.3_
  
  - [ ] 22.3 Create Audit Logs page
    - Create src/pages/admin/AuditLogs.jsx
    - Display logs in table with pagination
    - Filters: user, action, date range
    - _Requirements: 11.2_

- [ ] 23. UI polish and navigation
  - [ ] 23.1 Create navigation bar component
    - Create src/components/Navbar.jsx
    - Show different menu items based on role
    - Display current user name
    - Logout button
    - _Requirements: 12.1, 12.2, 12.3_
  
  - [ ] 23.2 Create layout component
    - Create src/components/Layout.jsx
    - Include Navbar
    - Add MUI Container for content
    - _Requirements: 18.1_
  
  - [ ] 23.3 Add loading and error states
    - Create src/components/Loading.jsx
    - Create src/components/ErrorAlert.jsx
    - Use throughout app for better UX
    - _Requirements: 17.1_
  
  - [ ] 23.4 Style with Material-UI theme
    - Create src/theme.js with custom MUI theme
    - Apply consistent colors, typography, spacing
    - _Requirements: 18.1_

- [ ] 24. Final checkpoint - End-to-end testing
  - [ ] 24.1 Test guest flow
    - Search books without login
    - View book details
    - Register as new member
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [ ] 24.2 Test member flow
    - Login as member1
    - View active loans
    - Renew a loan (verify rules: max renewals, pending reservation, unpaid fines)
    - Create reservation
    - View and pay fine
    - _Requirements: 2.1, 3.1, 3.2, 3.3, 3.4, 4.1, 5.2_
  
  - [ ] 24.3 Test librarian flow
    - Login as librarian1
    - Checkout book to member
    - Verify race condition prevention (try double checkout)
    - Checkin book (verify fine calculation)
    - Checkin book with pending reservation (verify fulfillment)
    - Add new book and copies
    - _Requirements: 6.1, 6.5, 7.4, 7.5, 7.6, 8.1, 8.3_
  
  - [ ] 24.4 Test admin flow
    - Login as admin
    - View and filter users
    - Create new user (each role)
    - Update user role and status
    - View and update system config
    - View audit logs with filters
    - _Requirements: 9.1, 9.2, 9.3, 10.2, 10.3, 11.2_
  
  - [ ] 24.5 Verify all acceptance criteria
    - Guest search + book detail ✓
    - Member renew with all rules ✓
    - Librarian checkout/checkin stable (no double-loan) ✓
    - Checkin creates fine if overdue ✓
    - Reservation affects copy status (Reserved when pending) ✓
    - Pay fine fake: creates payment + fine Paid ✓
    - Admin change role/status + view audit logs ✓
    - _Requirements: All acceptance criteria from requirements document_

- [ ] 25. Documentation and deployment preparation
  - [ ] 25.1 Create README.md
    - Document project structure
    - List all features
    - Include setup instructions
    - List demo accounts
    - _Requirements: 18.6_
  
  - [ ] 25.2 Create .env.example files
    - Backend .env.example
    - Frontend .env.example
    - _Requirements: 18.1_
  
  - [ ] 25.3 Verify Docker Compose setup
    - Test `docker compose up -d`
    - Test `docker compose down`
    - Verify data persistence
    - _Requirements: 18.1_
  
  - [ ] 25.4 Create deployment runbook
    - Document step-by-step deployment process
    - Include troubleshooting tips
    - _Requirements: 18.1_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties (minimum 100 iterations each)
- Unit tests validate specific examples and edge cases
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- The implementation follows the incremental commit strategy: Docker → Backend skeleton → Schema → Middleware → Auth → Config → Catalog → Reservations → Checkout → Checkin → Renew → Fines → Admin → Frontend
- All critical operations (checkout, checkin, renew) use database transactions for atomicity
- Race conditions are prevented through conditional updates (updateMany with status checks)
- BigInt serialization is handled globally to ensure all API responses use string IDs
