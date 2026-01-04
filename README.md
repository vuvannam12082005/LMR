# Library Management System (LMS) MVP

A comprehensive library management system with role-based access control, built with Node.js, Express, Prisma, and MySQL.

## Features

### Guest Features
- Browse book catalog
- Search books by title, author, or ISBN
- View book details and availability
- Register as a member

### Member Features
- View active loans and due dates
- Renew loans (up to 2 times)
- Create and manage reservations
- View and pay fines online
- View borrowing history

### Librarian Features
- Checkout books to members
- Checkin returned books
- Calculate overdue fines automatically
- Manage book catalog (add/edit books and copies)
- Fulfill reservations on checkin

### Administrator Features
- Manage users (create, update roles and status)
- Configure system settings
- View audit logs
- All librarian features

## Tech Stack

### Backend
- **Runtime**: Node.js with ES Modules
- **Framework**: Express.js
- **Database**: MySQL 8.0
- **ORM**: Prisma
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Zod
- **Password Hashing**: bcryptjs

### Frontend
- **UI**: Vanilla JavaScript with Bootstrap 5
- **Icons**: Bootstrap Icons
- **Styling**: Custom CSS with CSS Variables

### Infrastructure
- **Containerization**: Docker Compose
- **Database Admin**: phpMyAdmin

## Project Structure

```
.
├── server/
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema
│   │   ├── seed.js                # Seed data script
│   │   └── migrations/            # Database migrations
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js        # Prisma client singleton
│   │   ├── controllers/           # Request handlers
│   │   ├── middleware/            # Auth, RBAC, error handling
│   │   ├── routes/                # API routes
│   │   ├── services/              # Business logic
│   │   ├── utils/                 # Utilities (errors, bigint)
│   │   ├── app.js                 # Express app setup
│   │   └── index.js               # Server entry point
│   └── package.json
├── client/
│   ├── index.html                 # Main HTML file
│   ├── app.js                     # Frontend JavaScript
│   └── style.css                  # Custom styles
├── docker-compose.yml             # Docker services
└── README.md
```

## Setup Instructions

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)

### Quick Start

1. **Start Docker services**:
   ```bash
   docker compose up -d
   ```

2. **Install backend dependencies**:
   ```bash
   cd server
   npm install
   ```

3. **Run database migration**:
   ```bash
   npx prisma migrate dev
   ```

4. **Seed database with demo data**:
   ```bash
   npm run db:seed
   ```

5. **Start backend server**:
   ```bash
   npm start
   ```

6. **Open frontend**:
   - Open `client/index.html` in a web browser
   - Or serve it with a simple HTTP server:
     ```bash
     cd client
     python -m http.server 8080
     ```
   - Then visit: http://localhost:8080

### Services

- **Backend API**: http://localhost:3000
- **phpMyAdmin**: http://localhost:8081
- **MySQL**: localhost:3307

## Demo Accounts

### Administrator
- **Username**: `admin`
- **Password**: `Password123!`

### Librarian
- **Username**: `librarian1`
- **Password**: `Password123!`

### Member
- **Username**: `member1`
- **Password**: `Password123!`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new member
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (protected)
- `POST /api/auth/logout` - Logout (protected)

### Books (Public)
- `GET /api/books` - Search books
- `GET /api/books/:isbn` - Get book details with copies

### Books (Librarian)
- `POST /api/books` - Add new book
- `PUT /api/books/:isbn` - Update book
- `POST /api/books/:isbn/copies` - Add book copy

### Loans
- `POST /api/loans` - Checkout (Librarian)
- `PUT /api/loans/:id/return` - Checkin (Librarian)
- `PUT /api/loans/:id/renew` - Renew loan (Member)

### Reservations
- `POST /api/reservations` - Create reservation (Member)
- `DELETE /api/reservations/:id` - Cancel reservation (Member)

### Member Self-Service
- `GET /api/me/loans` - Get my active loans
- `GET /api/me/history` - Get my borrowing history
- `GET /api/me/reservations` - Get my reservations
- `GET /api/me/fines` - Get my fines

### Fines
- `POST /api/fines/:id/pay` - Pay fine (Member)

### Admin
- `GET /api/admin/users` - List users
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/:id` - Update user
- `GET /api/admin/config` - Get system config
- `PUT /api/admin/config/:key` - Update config
- `GET /api/admin/audit-logs` - View audit logs

## System Configuration

The system has 5 configurable parameters:

- `loan_period_days`: Default loan period (14 days)
- `max_renewals`: Maximum renewals per loan (2)
- `fine_rate_per_day`: Fine rate for overdue books (5000 VND/day)
- `fine_block_threshold`: Fine threshold to block renewals (50000 VND)
- `reservation_hold_days`: Days to hold reserved books (3 days)

## Key Features Implementation

### Race Condition Prevention
Checkout uses conditional updates to prevent double-lending:
```javascript
const updateResult = await tx.bookCopy.updateMany({
  where: { barcode, status: 'Available' },
  data: { status: 'Loaned' }
});
if (updateResult.count === 0) {
  throw new ConflictError('COPY_NOT_AVAILABLE');
}
```

### Automatic Fine Calculation
Checkin automatically calculates overdue fines:
```javascript
const overdueDays = Math.max(0, Math.floor((returnDate - dueDate) / (1000 * 60 * 60 * 24)));
if (overdueDays > 0) {
  const amount = overdueDays * fineRate;
  // Create fine record
}
```

### Reservation Fulfillment
When a book is returned, the system automatically fulfills the earliest pending reservation:
```javascript
const pendingReservations = await tx.reservation.findMany({
  where: { isbn, status: 'Pending' },
  orderBy: { reserveDate: 'asc' },
  take: 1
});
if (pendingReservations.length > 0) {
  // Fulfill reservation and set copy status to Reserved
}
```

### Role-Based Access Control
RBAC middleware with role hierarchy:
- Administrator > Librarian > Member
- Ownership checks for member-specific endpoints

### Audit Logging
All critical operations (checkout, checkin) are logged:
```javascript
await auditService.log({
  userId: librarianId,
  action: 'CHECKOUT',
  entityType: 'Loan',
  entityId: loan.loanId.toString()
});
```

## Database Schema

### Core Tables
- **User**: Base user table with role and status
- **Member**: Member-specific data (member code, borrowing limit)
- **Librarian**: Librarian-specific data (employee ID, department)
- **Administrator**: Admin-specific data (admin level, permissions)
- **Book**: Book metadata
- **BookCopy**: Physical book copies with status
- **Loan**: Loan records with due dates and renewals
- **Reservation**: Book reservations
- **Fine**: Overdue fines
- **Payment**: Fine payments
- **SystemConfig**: System configuration
- **AuditLog**: Audit trail

## Development

### Run Tests
```bash
cd server
npm test
```

### Database Commands
```bash
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name migration_name

# Reset database
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio
```

## License

MIT

## Contributors

Built as an MVP for library management with focus on:
- Correctness (transaction safety, race condition prevention)
- Security (JWT auth, RBAC, password hashing)
- Usability (intuitive UI, role-based dashboards)
- Maintainability (clean architecture, separation of concerns)
