# Requirements Document

## Introduction

This document specifies the requirements for a Library Management System (LMS) MVP web application. The system enables guests to search for books, members to borrow and manage loans, librarians to handle circulation operations, and administrators to manage users and system configuration. The system implements role-based access control (RBAC) with four user types: Guest (public), Member, Librarian, and Administrator.

## Glossary

- **LMS**: Library Management System - the complete web application
- **Guest**: Unauthenticated public user with read-only access to catalog
- **Authenticated_User**: Base authenticated user (abstract role)
- **Member**: Authenticated user who can borrow books and manage their account
- **Librarian**: Staff user who processes checkouts, checkins, and manages catalog (inherits Member permissions)
- **Administrator**: System admin who manages users, configuration, and audit logs (inherits Librarian permissions)
- **Book**: A bibliographic record identified by ISBN
- **Book_Copy**: A physical copy of a book identified by barcode
- **Loan**: A borrowing transaction linking a member to a book copy
- **Reservation**: A hold placed by a member on a book by ISBN
- **Fine**: A monetary penalty for overdue returns or damages
- **Payment**: A transaction record for fine payment
- **Notification**: A message sent to users (email/SMS) - stubbed in MVP
- **Report**: System-generated reports - stubbed in MVP
- **Checkout**: The process of lending a book copy to a member
- **Checkin**: The process of returning a book copy from a member
- **JWT**: JSON Web Token used for authentication
- **RBAC**: Role-Based Access Control system with hierarchical permissions
- **Transaction**: Database transaction ensuring atomicity of operations
- **Race_Condition**: Concurrent access scenario requiring protection
- **Email_Service**: External service for sending emails - stubbed in MVP
- **SMS_Service**: External service for sending SMS - stubbed in MVP
- **Payment_Gateway**: External service for processing payments - stubbed in MVP

## Requirements

### Requirement 1: Guest Catalog Access

**User Story:** As a guest, I want to search and view books without authentication, so that I can browse the library catalog before registering.

#### Acceptance Criteria

1. THE LMS SHALL provide public access to book search without requiring authentication
2. WHEN a guest searches by title, author, or ISBN, THE LMS SHALL return matching books using LIKE pattern matching
3. WHEN a guest views book details, THE LMS SHALL display book information and the status of all book copies
4. THE LMS SHALL allow guests to register as members through a public registration endpoint

### Requirement 2: Member Authentication

**User Story:** As a member, I want to securely login and logout, so that I can access my borrowing account.

#### Acceptance Criteria

1. WHEN a user provides valid credentials, THE LMS SHALL issue a JWT access token
2. WHEN a user provides invalid credentials, THE LMS SHALL reject the login attempt with an error message
3. THE LMS SHALL verify JWT tokens on protected endpoints and attach user identity to requests
4. WHEN a member logs out, THE LMS SHALL invalidate the session on the client side
5. THE LMS SHALL store passwords as bcrypt hashes and never expose them in responses

### Requirement 3: Member Loan Management

**User Story:** As a member, I want to view my current loans and renew them, so that I can manage my borrowed books.

#### Acceptance Criteria

1. WHEN a member requests their loans, THE LMS SHALL return only loans belonging to that member
2. WHEN a member requests loan renewal, THE LMS SHALL verify the renewal count is less than max_renewals system config
3. WHEN a member requests loan renewal, THE LMS SHALL reject renewal if a pending reservation exists for the same ISBN
4. WHEN a member requests loan renewal, THE LMS SHALL reject renewal if total unpaid fines exceed fine_block_threshold system config
5. WHEN renewal is approved, THE LMS SHALL increment renewal count and extend due date by loan_period_days
6. THE LMS SHALL limit member renewals to a maximum of 2 per loan

### Requirement 4: Member Reservation Management

**User Story:** As a member, I want to reserve books by ISBN, so that I can be notified when they become available.

#### Acceptance Criteria

1. WHEN a member creates a reservation, THE LMS SHALL store the reservation with status Pending
2. WHEN a member views their reservations, THE LMS SHALL return only reservations belonging to that member
3. WHEN a member cancels a reservation, THE LMS SHALL update the reservation status to Cancelled
4. THE LMS SHALL allow reservations by ISBN regardless of current copy availability

### Requirement 5: Member Fine Management

**User Story:** As a member, I want to view my fines and pay them online, so that I can clear my account balance.

#### Acceptance Criteria

1. WHEN a member views their fines, THE LMS SHALL return all fines with status and amount
2. WHEN a member pays a fine online, THE LMS SHALL create a payment record with method Online and status Success
3. WHEN a payment is successful, THE LMS SHALL update the fine status to Paid
4. THE LMS SHALL implement fake payment processing for MVP demonstration purposes

### Requirement 6: Librarian Checkout Operations

**User Story:** As a librarian, I want to checkout books using member code and barcode, so that I can lend books to members.

#### Acceptance Criteria

1. WHEN a librarian initiates checkout, THE LMS SHALL execute the operation within a database transaction
2. WHEN processing checkout, THE LMS SHALL verify the member status is Active
3. WHEN processing checkout, THE LMS SHALL verify the member has not exceeded their borrowing limit
4. WHEN processing checkout, THE LMS SHALL update book copy status from Available to Loaned using conditional update
5. IF the conditional update affects zero rows, THEN THE LMS SHALL fail the checkout with error COPY_NOT_AVAILABLE
6. WHEN checkout succeeds, THE LMS SHALL create a loan record with due date calculated as current date plus loan_period_days
7. WHEN checkout completes, THE LMS SHALL record an audit log entry with action CHECKOUT
8. THE LMS SHALL prevent race conditions by using updateMany with status condition in the transaction

### Requirement 7: Librarian Checkin Operations

**User Story:** As a librarian, I want to checkin returned books, so that I can process returns and calculate fines.

#### Acceptance Criteria

1. WHEN a librarian initiates checkin, THE LMS SHALL execute the operation within a database transaction
2. WHEN processing checkin, THE LMS SHALL verify the loan status is Active
3. WHEN processing checkin, THE LMS SHALL update the loan status to Returned and set return date
4. WHEN return date exceeds due date, THE LMS SHALL calculate overdue days as floor((return_date - due_date) / 1 day)
5. WHEN overdue days is greater than zero, THE LMS SHALL create a fine record with amount equal to overdue_days multiplied by fine_rate_per_day
6. WHEN checkin completes and a pending reservation exists for the ISBN, THE LMS SHALL update book copy status to Reserved
7. WHEN checkin completes and a pending reservation exists, THE LMS SHALL update the earliest reservation to Fulfilled and set expiry date
8. WHEN checkin completes and no pending reservation exists, THE LMS SHALL update book copy status to Available
9. WHEN checkin completes, THE LMS SHALL record an audit log entry with action CHECKIN
10. THE LMS SHALL create only one overdue fine per loan

### Requirement 8: Librarian Catalog Management

**User Story:** As a librarian, I want to create and update books and add book copies, so that I can maintain the library catalog.

#### Acceptance Criteria

1. WHEN a librarian creates a book, THE LMS SHALL store the book with ISBN as primary key
2. WHEN a librarian updates a book, THE LMS SHALL modify the existing book record
3. WHEN a librarian adds a book copy, THE LMS SHALL create a copy with unique barcode linked to the ISBN
4. THE LMS SHALL set new book copies to status Available and condition Good by default

### Requirement 9: Administrator User Management

**User Story:** As an administrator, I want to manage users and their roles, so that I can control system access.

#### Acceptance Criteria

1. WHEN an administrator views users, THE LMS SHALL return user list with optional filtering by role and status
2. WHEN an administrator creates a user, THE LMS SHALL create both user record and role-specific profile record
3. WHEN an administrator updates a user, THE LMS SHALL allow modification of role and status fields
4. THE LMS SHALL support user status values: Active, Inactive, Locked, Pending

### Requirement 10: Administrator System Configuration

**User Story:** As an administrator, I want to view and update system configuration, so that I can adjust business rules.

#### Acceptance Criteria

1. THE LMS SHALL store system configuration as key-value pairs in SystemConfig table
2. WHEN an administrator views configuration, THE LMS SHALL return all configuration keys and values
3. WHEN an administrator updates a configuration value, THE LMS SHALL modify the existing config record
4. THE LMS SHALL require these configuration keys: loan_period_days, max_renewals, fine_rate_per_day, fine_block_threshold, reservation_hold_days

### Requirement 11: Administrator Audit Logging

**User Story:** As an administrator, I want to view audit logs, so that I can track system activities.

#### Acceptance Criteria

1. WHEN significant actions occur, THE LMS SHALL create audit log entries with user, action, entity type, entity ID, and timestamp
2. WHEN an administrator views audit logs, THE LMS SHALL return log entries with filtering and sorting capabilities
3. THE LMS SHALL record audit logs for checkout, checkin, user creation, and role changes

### Requirement 12: Role-Based Access Control

**User Story:** As a system architect, I want hierarchical role-based access control, so that users can only access authorized features.

#### Acceptance Criteria

1. THE LMS SHALL implement hierarchical roles: Guest (unauthenticated) → Authenticated_User → Member → Librarian → Administrator
2. WHEN a user has Administrator role, THE LMS SHALL grant all Librarian and Member permissions
3. WHEN a user has Librarian role, THE LMS SHALL grant all Member permissions
4. WHEN a protected endpoint is accessed, THE LMS SHALL verify the JWT token and extract user identity
5. WHEN role verification is required, THE LMS SHALL check the user role against allowed roles for the endpoint
6. WHEN authorization fails, THE LMS SHALL return error with code FORBIDDEN
7. THE LMS SHALL support both ownership-based routes /api/me/* for MVP security and resource-based routes /api/members/{id}/* for report compatibility

### Requirement 13: Borrowing Limits by Membership Type

**User Story:** As a system, I want to enforce borrowing limits based on membership type, so that resources are fairly distributed.

#### Acceptance Criteria

1. WHEN a member with type Student is created, THE LMS SHALL set borrowing limit to 5
2. WHEN a member with type Faculty is created, THE LMS SHALL set borrowing limit to 10
3. WHEN a member with type Public is created, THE LMS SHALL set borrowing limit to 3
4. WHEN checkout is attempted, THE LMS SHALL verify active loan count is less than borrowing limit

### Requirement 14: Database BigInt Handling

**User Story:** As a developer, I want consistent ID serialization, so that JavaScript clients can handle large integers.

#### Acceptance Criteria

1. THE LMS SHALL use BigInt for all primary keys in the database
2. WHEN the LMS returns JSON responses, THE LMS SHALL serialize all BigInt values as strings
3. THE LMS SHALL never return raw BigInt values in JSON responses

### Requirement 15: Reservation Impact on Copy Status

**User Story:** As a member, I want reserved books to be held for me, so that I have priority access when they are returned.

#### Acceptance Criteria

1. THE LMS SHALL support book copy status values: Available, Loaned, Reserved, Lost, Repair
2. WHEN checkin occurs and pending reservations exist for the ISBN, THE LMS SHALL set copy status to Reserved
3. WHEN a copy is reserved, THE LMS SHALL fulfill the earliest pending reservation by reservation date
4. WHEN a reservation is fulfilled, THE LMS SHALL set expiry date to current date plus reservation_hold_days
5. WHEN checkin occurs and no pending reservations exist, THE LMS SHALL set copy status to Available
6. WHEN a copy status is Reserved, THE LMS SHALL prevent checkout until reservation expires or is cancelled

### Requirement 16: Transaction Atomicity

**User Story:** As a system architect, I want atomic transactions for critical operations, so that data integrity is maintained.

#### Acceptance Criteria

1. WHEN checkout is processed, THE LMS SHALL execute all operations within a single database transaction
2. WHEN checkin is processed, THE LMS SHALL execute all operations within a single database transaction
3. IF any operation within a transaction fails, THEN THE LMS SHALL rollback all changes
4. THE LMS SHALL use Prisma transaction API for multi-step operations

### Requirement 17: Error Response Format

**User Story:** As a frontend developer, I want consistent error responses, so that I can handle errors uniformly.

#### Acceptance Criteria

1. WHEN an error occurs, THE LMS SHALL return JSON with structure { error: { code, message } }
2. THE LMS SHALL use standard error codes: BAD_REQUEST, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, INTERNAL_ERROR
3. THE LMS SHALL include descriptive error messages for debugging

### Requirement 18: Database Schema and Seeding

**User Story:** As a developer, I want a complete database schema with seed data, so that I can demonstrate the system immediately.

#### Acceptance Criteria

1. THE LMS SHALL implement the complete Prisma schema with 15 tables: user, member, librarian, administrator, book, book_copy, category, loan, reservation, fine, payment, notification, audit_log, system_config, report
2. WHEN the database is seeded, THE LMS SHALL create 1 administrator, 2 librarians, and 10 members
3. WHEN the database is seeded, THE LMS SHALL create 6 categories, 30 books, and 60 book copies
4. WHEN the database is seeded, THE LMS SHALL create 10 active loans, 10 returned loans, 5 pending reservations, and 10 fines
5. WHEN the database is seeded, THE LMS SHALL create all required system configuration keys with default values
6. THE LMS SHALL provide demo accounts: admin/Password123!, librarian1/Password123!, member1/Password123!
7. THE LMS SHALL use table and field names consistent with the course report database schema

### Requirement 19: External Service Integration Stubs

**User Story:** As a developer, I want stubbed external services for MVP, so that the system can be demonstrated without real integrations.

#### Acceptance Criteria

1. THE LMS SHALL create notification table structure for email and SMS notifications
2. THE LMS SHALL create report table structure for system-generated reports
3. WHEN payment processing is triggered, THE LMS SHALL simulate successful payment without calling real payment gateway
4. WHEN notification sending is triggered, THE LMS SHALL create notification records without sending real emails or SMS
5. THE LMS SHALL mark external service integration points clearly for future implementation

### Requirement 20: API Endpoint Compatibility

**User Story:** As a frontend developer, I want API endpoints that match the course report specification, so that the implementation aligns with documentation.

#### Acceptance Criteria

1. THE LMS SHALL provide authentication endpoints: POST /api/auth/login, POST /api/auth/logout, POST /api/auth/register
2. THE LMS SHALL provide book endpoints: GET /api/books, GET /api/books/{isbn}, POST /api/books, PUT /api/books/{isbn}, POST /api/books/{isbn}/copies
3. THE LMS SHALL provide loan endpoints: GET /api/loans, POST /api/loans, PUT /api/loans/{id}/return, PUT /api/loans/{id}/renew
4. THE LMS SHALL provide reservation endpoints: GET /api/reservations, POST /api/reservations, DELETE /api/reservations/{id}
5. THE LMS SHALL provide member endpoints: GET /api/members/{id}/loans, GET /api/members/{id}/history, GET /api/members/{id}/reservations, GET /api/members/{id}/fines
6. THE LMS SHALL provide /api/me/* endpoints as aliases for current authenticated user for MVP security
7. THE LMS SHALL provide admin endpoints: GET /api/admin/users, POST /api/admin/users, PUT /api/admin/users/{id}, GET /api/admin/config, PUT /api/admin/config/{key}, GET /api/admin/audit-logs
