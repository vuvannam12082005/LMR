# 🏗️ PHÂN TÍCH THIẾT KẾ HỆ THỐNG QUẢN LÝ THƯ VIỆN

## 📐 KIẾN TRÚC TỔNG QUAN

### Mô hình kiến trúc: **MVC + Service Layer (Layered Architecture)**

Hệ thống sử dụng kiến trúc phân lớp (Layered Architecture) với mô hình **MVC + Service Layer**, cụ thể:

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│  (Presentation - View)                                       │
│  - HTML/CSS/JavaScript                                       │
│  - Bootstrap UI Components                                   │
│  - Client-side routing & state management                    │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/REST API
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND API LAYER                        │
├─────────────────────────────────────────────────────────────┤
│  ROUTES (Router)                                             │
│  - Định nghĩa endpoints                                      │
│  - Ánh xạ HTTP methods → Controllers                         │
│  - Apply middleware (auth, RBAC)                             │
├─────────────────────────────────────────────────────────────┤
│  MIDDLEWARE                                                  │
│  - Authentication (JWT verification)                         │
│  - Authorization (RBAC)                                      │
│  - Error handling                                            │
│  - Request validation                                        │
├─────────────────────────────────────────────────────────────┤
│  CONTROLLERS (Controller trong MVC)                          │
│  - Nhận HTTP requests                                        │
│  - Validate input với Zod                                    │
│  - Gọi Service layer                                         │
│  - Trả về HTTP responses                                     │
├─────────────────────────────────────────────────────────────┤
│  SERVICES (Business Logic Layer)                             │
│  - Chứa toàn bộ business logic                               │
│  - Xử lý transactions                                        │
│  - Tương tác với Data Access Layer                           │
│  - Implement business rules                                  │
├─────────────────────────────────────────────────────────────┤
│  DATA ACCESS LAYER (Model trong MVC)                         │
│  - Prisma ORM                                                │
│  - Database queries                                          │
│  - Data mapping                                              │
└─────────────────────────────────────────────────────────────┘
                            ↕ SQL
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                          │
│  - MySQL 8.0                                                 │
│  - 15 tables với relationships                               │
│  - Indexes, constraints                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 XÁC NHẬN: ĐÂY LÀ MVC + SERVICE LAYER

### ✅ **Có phải MVC không?**

**Câu trả lời: CÓ, nhưng là MVC mở rộng với Service Layer**

#### Phân tích từng thành phần MVC:

**1. MODEL (M)**
- **Vị trí:** `server/prisma/schema.prisma` + Prisma Client
- **Vai trò:** 
  - Định nghĩa cấu trúc dữ liệu (15 tables)
  - Quản lý relationships giữa các entities
  - Cung cấp type-safe database access
- **Ví dụ:**
```prisma
model Book {
  isbn            String      @id
  title           String
  author          String
  copies          BookCopy[]
  reservations    Reservation[]
}
```

**2. VIEW (V)**
- **Vị trí:** `client/` folder
  - `index.html` - Template structure
  - `style.css` - Presentation styling
  - `app.js` - View logic & rendering
- **Vai trò:**
  - Hiển thị dữ liệu cho user
  - Nhận input từ user
  - Gửi requests đến Controller (qua API)
- **Ví dụ:**
```javascript
function displayBooks(books) {
  const container = document.getElementById('bookResults');
  container.innerHTML = books.map(book => `
    <div class="card">${book.title}</div>
  `).join('');
}
```

**3. CONTROLLER (C)**
- **Vị trí:** `server/src/controllers/`
  - `auth.controller.js`
  - `book.controller.js`
  - `loan.controller.js`
  - `admin.controller.js`
  - etc.
- **Vai trò:**
  - Nhận HTTP requests từ Routes
  - Validate input data
  - Gọi Service layer để xử lý business logic
  - Format và trả về responses
- **Ví dụ:**
```javascript
// Controller chỉ điều phối, không chứa business logic
export async function search(req, res, next) {
  try {
    const books = await bookService.search(req.query);
    res.json(books);
  } catch (error) {
    next(error);
  }
}
```

### ➕ **SERVICE LAYER (Bổ sung vào MVC)**

**4. SERVICE LAYER**
- **Vị trí:** `server/src/services/`
  - `auth.service.js`
  - `book.service.js`
  - `loan.service.js`
  - `fine.service.js`
  - etc.
- **Vai trò:**
  - Chứa **TOÀN BỘ business logic**
  - Xử lý transactions phức tạp
  - Implement business rules
  - Tương tác với Model (Prisma)
- **Ví dụ:**
```javascript
// Service chứa business logic phức tạp
export async function checkout(memberCode, barcode, librarianId) {
  return await prisma.$transaction(async (tx) => {
    // 1. Validate member
    const member = await tx.member.findUnique({...});
    if (member.user.status !== 'Active') {
      throw new BadRequestError('Member not active');
    }
    
    // 2. Check borrowing limit
    const activeLoans = await tx.loan.count({...});
    if (activeLoans >= member.borrowingLimit) {
      throw new BadRequestError('Borrowing limit exceeded');
    }
    
    // 3. Conditional update (race condition prevention)
    const updateResult = await tx.bookCopy.updateMany({
      where: { barcode, status: 'Available' },
      data: { status: 'Loaned' }
    });
    
    if (updateResult.count === 0) {
      throw new ConflictError('COPY_NOT_AVAILABLE');
    }
    
    // 4. Create loan
    const loan = await tx.loan.create({...});
    
    // 5. Audit log
    await auditService.log({...});
    
    return loan;
  });
}
```

---

## 🔍 TẠI SAO CẦN SERVICE LAYER?

### Vấn đề với MVC thuần túy:

**MVC truyền thống:**
```
Controller → Model (trực tiếp)
```
- Controller phình to, chứa quá nhiều logic
- Khó tái sử dụng business logic
- Khó test
- Vi phạm Single Responsibility Principle

**MVC + Service Layer:**
```
Controller → Service → Model
```
- Controller mỏng, chỉ xử lý HTTP
- Service chứa business logic, dễ tái sử dụng
- Dễ test (mock service)
- Tuân thủ SOLID principles

### So sánh cụ thể trong dự án:

#### ❌ **Nếu KHÔNG có Service Layer:**
```javascript
// Controller phải chứa tất cả logic (BAD)
export async function checkout(req, res, next) {
  try {
    const { memberCode, barcode } = req.body;
    
    // Validate member
    const member = await prisma.member.findUnique({...});
    if (!member) throw new Error('Member not found');
    if (member.user.status !== 'Active') throw new Error('Not active');
    
    // Check limit
    const activeLoans = await prisma.loan.count({...});
    if (activeLoans >= member.borrowingLimit) throw new Error('Limit exceeded');
    
    // Get config
    const config = await prisma.systemConfig.findUnique({...});
    
    // Update copy
    const updateResult = await prisma.bookCopy.updateMany({...});
    if (updateResult.count === 0) throw new Error('Not available');
    
    // Create loan
    const loan = await prisma.loan.create({...});
    
    // Audit log
    await prisma.auditLog.create({...});
    
    res.json(loan);
  } catch (error) {
    next(error);
  }
}
```
**Vấn đề:**
- Controller quá dài (50+ dòng)
- Khó test
- Không thể reuse logic
- Khó maintain

#### ✅ **Với Service Layer:**
```javascript
// Controller mỏng, chỉ điều phối (GOOD)
export async function checkout(req, res, next) {
  try {
    const data = checkoutSchema.parse(req.body);
    const loan = await loanService.checkout(
      data.memberCode, 
      data.barcode, 
      req.user.userId
    );
    res.status(201).json(loan);
  } catch (error) {
    next(error);
  }
}

// Service chứa business logic (GOOD)
// Có thể reuse, test, maintain dễ dàng
export async function checkout(memberCode, barcode, librarianId) {
  return await prisma.$transaction(async (tx) => {
    // All business logic here
    // 50+ lines of complex logic
  });
}
```

---

## 📂 CẤU TRÚC THƯ MỤC CHI TIẾT

```
server/
├── prisma/
│   ├── schema.prisma          # MODEL - Database schema
│   ├── migrations/            # Database migrations
│   └── seed.js                # Seed data
│
├── src/
│   ├── config/
│   │   └── database.js        # Prisma client singleton
│   │
│   ├── routes/                # ROUTER - Định nghĩa endpoints
│   │   ├── auth.routes.js     # POST /api/auth/login, /register
│   │   ├── book.routes.js     # GET /api/books, /books/:isbn
│   │   ├── loan.routes.js     # POST /api/loans (checkout)
│   │   ├── admin.routes.js    # GET /api/admin/users
│   │   └── ...
│   │
│   ├── middleware/            # MIDDLEWARE - Cross-cutting concerns
│   │   ├── auth.js            # JWT verification
│   │   ├── rbac.js            # Role-based access control
│   │   └── errorHandler.js    # Global error handling
│   │
│   ├── controllers/           # CONTROLLER - HTTP request handlers
│   │   ├── auth.controller.js
│   │   ├── book.controller.js
│   │   ├── loan.controller.js
│   │   └── ...
│   │   # Nhiệm vụ:
│   │   # - Parse request (body, params, query)
│   │   # - Validate với Zod
│   │   # - Gọi Service
│   │   # - Format response
│   │
│   ├── services/              # SERVICE LAYER - Business logic
│   │   ├── auth.service.js
│   │   ├── book.service.js
│   │   ├── loan.service.js
│   │   ├── fine.service.js
│   │   ├── reservation.service.js
│   │   ├── user.service.js
│   │   ├── config.service.js
│   │   └── audit.service.js
│   │   # Nhiệm vụ:
│   │   # - Implement business rules
│   │   # - Handle transactions
│   │   # - Interact với Prisma (Model)
│   │   # - Reusable logic
│   │
│   ├── utils/                 # UTILITIES
│   │   ├── errors.js          # Custom error classes
│   │   └── bigint.js          # BigInt serialization
│   │
│   ├── app.js                 # Express app setup
│   └── index.js               # Server entry point
│
client/                        # VIEW - Frontend
├── index.html                 # HTML template
├── app.js                     # View logic & rendering
└── style.css                  # Styling
```

---

## 🔄 LUỒNG XỬ LÝ REQUEST

### Ví dụ: Checkout một cuốn sách

```
1. CLIENT (View)
   ↓
   User clicks "Checkout" button
   ↓
   app.js gửi POST request:
   POST /api/loans
   Body: { memberCode: "MEM001", barcode: "BC001" }
   Headers: { Authorization: "Bearer <JWT>" }

2. ROUTES (Router)
   ↓
   loan.routes.js nhận request
   ↓
   Apply middleware:
   - verifyToken (auth.js) → Verify JWT
   - requireRole(['Librarian']) → Check role
   ↓
   Route đến Controller:
   router.post('/', verifyToken, requireRole(['Librarian']), loanController.checkout)

3. CONTROLLER
   ↓
   loan.controller.js
   ↓
   export async function checkout(req, res, next) {
     try {
       // Validate input
       const data = checkoutSchema.parse(req.body);
       
       // Gọi Service
       const loan = await loanService.checkout(
         data.memberCode,
         data.barcode,
         req.user.userId
       );
       
       // Return response
       res.status(201).json(loan);
     } catch (error) {
       next(error);
     }
   }

4. SERVICE (Business Logic)
   ↓
   loan.service.js
   ↓
   export async function checkout(memberCode, barcode, librarianId) {
     return await prisma.$transaction(async (tx) => {
       // Step 1: Find member
       const member = await tx.member.findUnique({...});
       
       // Step 2: Validate member status
       if (member.user.status !== 'Active') {
         throw new BadRequestError('Member not active');
       }
       
       // Step 3: Check borrowing limit
       const activeLoans = await tx.loan.count({...});
       if (activeLoans >= member.borrowingLimit) {
         throw new BadRequestError('Limit exceeded');
       }
       
       // Step 4: Get config
       const loanPeriod = await configService.getAsNumber('loan_period_days');
       
       // Step 5: Conditional update (race condition prevention)
       const updateResult = await tx.bookCopy.updateMany({
         where: { barcode, status: 'Available' },
         data: { status: 'Loaned' }
       });
       
       if (updateResult.count === 0) {
         throw new ConflictError('COPY_NOT_AVAILABLE');
       }
       
       // Step 6: Create loan
       const dueDate = new Date();
       dueDate.setDate(dueDate.getDate() + loanPeriod);
       
       const loan = await tx.loan.create({
         data: {
           memberId: member.memberId,
           barcode: barcode,
           dueDate: dueDate,
           status: 'Active',
           issuedById: BigInt(librarianId)
         }
       });
       
       // Step 7: Audit log
       await auditService.log({
         userId: librarianId,
         action: 'CHECKOUT',
         entityType: 'Loan',
         entityId: loan.loanId.toString()
       });
       
       return loan;
     });
   }

5. MODEL (Data Access)
   ↓
   Prisma ORM
   ↓
   - tx.member.findUnique() → SELECT * FROM Member WHERE...
   - tx.loan.count() → SELECT COUNT(*) FROM Loan WHERE...
   - tx.bookCopy.updateMany() → UPDATE BookCopy SET status='Loaned' WHERE...
   - tx.loan.create() → INSERT INTO Loan VALUES...
   - tx.auditLog.create() → INSERT INTO AuditLog VALUES...

6. DATABASE
   ↓
   MySQL executes queries
   ↓
   Returns data

7. RESPONSE FLOW (ngược lại)
   ↓
   Database → Prisma → Service → Controller → Routes → Client
   ↓
   Client nhận response:
   {
     "loanId": "123",
     "memberId": "456",
     "barcode": "BC001",
     "dueDate": "2026-01-18T00:00:00.000Z",
     "status": "Active"
   }
```

---

## 🎨 DESIGN PATTERNS SỬ DỤNG

### 1. **Layered Architecture Pattern**
- Phân tách rõ ràng các layers
- Mỗi layer có trách nhiệm riêng
- Dependencies chỉ đi một chiều (top-down)

### 2. **Repository Pattern** (qua Prisma)
- Prisma ORM đóng vai trò Repository
- Abstraction layer cho database access
- Type-safe queries

### 3. **Service Layer Pattern**
- Tách business logic ra khỏi Controllers
- Reusable, testable
- Single Responsibility

### 4. **Dependency Injection**
- Services inject vào Controllers
- Prisma client inject vào Services
- Dễ mock khi test

### 5. **Middleware Pattern**
- Chain of responsibility
- Cross-cutting concerns (auth, logging, error handling)

### 6. **Factory Pattern**
- Error factories (BadRequestError, NotFoundError, etc.)
- Consistent error creation

### 7. **Singleton Pattern**
- Prisma client singleton (`database.js`)
- Đảm bảo chỉ có 1 database connection pool

### 8. **Transaction Script Pattern**
- Mỗi service method là một transaction script
- Xử lý một use case cụ thể

---

## 🔐 SECURITY ARCHITECTURE

### 1. **Authentication Layer**
```
JWT Token → auth.js middleware → Verify & decode → req.user
```

### 2. **Authorization Layer**
```
req.user → rbac.js middleware → Check role hierarchy → Allow/Deny
```

### 3. **Role Hierarchy**
```
Administrator (level 3)
    ↓ has all permissions of
Librarian (level 2)
    ↓ has all permissions of
Member (level 1)
```

### 4. **Input Validation**
```
Request → Zod schema → Validate → Controller
```

### 5. **Error Handling**
```
Any error → errorHandler middleware → Consistent format → Response
```

---

## 💾 DATA FLOW ARCHITECTURE

### Write Operations (Create/Update/Delete)
```
Client → Controller → Service → Prisma → Database
                                    ↓
                              Transaction
                              (ACID properties)
```

### Read Operations (Query)
```
Client → Controller → Service → Prisma → Database
                                    ↓
                              Caching (future)
```

### Complex Operations (Checkout/Checkin)
```
Client → Controller → Service → Prisma Transaction
                                    ↓
                              Multiple operations
                              (atomic, consistent)
```

---

## 🧪 TESTABILITY

### Unit Testing Strategy

**1. Service Layer Tests** (Quan trọng nhất)
```javascript
// Mock Prisma
const mockPrisma = {
  member: { findUnique: jest.fn() },
  loan: { create: jest.fn() }
};

// Test business logic
test('checkout should throw error if member inactive', async () => {
  mockPrisma.member.findUnique.mockResolvedValue({
    user: { status: 'Inactive' }
  });
  
  await expect(
    loanService.checkout('MEM001', 'BC001', '1')
  ).rejects.toThrow('Member not active');
});
```

**2. Controller Tests**
```javascript
// Mock Service
const mockLoanService = {
  checkout: jest.fn()
};

// Test HTTP handling
test('checkout controller should return 201', async () => {
  mockLoanService.checkout.mockResolvedValue({ loanId: '123' });
  
  const req = { body: { memberCode: 'MEM001', barcode: 'BC001' } };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  
  await loanController.checkout(req, res, jest.fn());
  
  expect(res.status).toHaveBeenCalledWith(201);
});
```

**3. Integration Tests**
```javascript
// Test full flow
test('checkout integration', async () => {
  const response = await request(app)
    .post('/api/loans')
    .set('Authorization', `Bearer ${librarianToken}`)
    .send({ memberCode: 'MEM001', barcode: 'BC001' });
  
  expect(response.status).toBe(201);
  expect(response.body.loanId).toBeDefined();
});
```

---

## 📊 PERFORMANCE CONSIDERATIONS

### 1. **Database Optimization**
- Indexes trên các cột thường query (isbn, barcode, memberId)
- Composite indexes cho queries phức tạp
- Connection pooling (Prisma default)

### 2. **Transaction Management**
- Sử dụng Prisma transactions cho operations phức tạp
- Minimize transaction scope
- Avoid nested transactions

### 3. **Query Optimization**
- Select only needed fields
- Use `include` thay vì multiple queries
- Pagination cho large datasets

### 4. **Caching Strategy** (Future)
```
Service Layer → Cache Layer → Database
                    ↓
              Redis/Memory Cache
```

---

## 🔄 SCALABILITY

### Horizontal Scaling
```
Load Balancer
    ↓
┌─────────┬─────────┬─────────┐
│ API 1   │ API 2   │ API 3   │
└─────────┴─────────┴─────────┘
         ↓
    Database Pool
         ↓
      MySQL
```

### Vertical Scaling
- Increase server resources
- Optimize database queries
- Add indexes

### Microservices (Future)
```
API Gateway
    ↓
┌──────────┬──────────┬──────────┐
│ Auth     │ Catalog  │ Loan     │
│ Service  │ Service  │ Service  │
└──────────┴──────────┴──────────┘
```

---

## ✅ KẾT LUẬN

### Hệ thống sử dụng: **MVC + Service Layer Architecture**

**Lý do:**
1. ✅ Có đầy đủ Model, View, Controller
2. ✅ Bổ sung Service Layer để tách business logic
3. ✅ Tuân thủ SOLID principles
4. ✅ Separation of Concerns rõ ràng
5. ✅ Dễ test, maintain, scale

**Không phải:**
- ❌ MVC thuần túy (có thêm Service Layer)
- ❌ Microservices (monolithic)
- ❌ Event-driven (request-response)
- ❌ CQRS (không tách read/write models)

**Best practices được áp dụng:**
- ✅ Layered Architecture
- ✅ Dependency Injection
- ✅ Repository Pattern (via Prisma)
- ✅ Middleware Pattern
- ✅ Error Handling Strategy
- ✅ Transaction Management
- ✅ Security by Design (JWT, RBAC)

**Đây là một kiến trúc hiện đại, phù hợp cho:**
- Web applications vừa và lớn
- RESTful APIs
- Systems cần business logic phức tạp
- Projects cần maintainability và testability cao
