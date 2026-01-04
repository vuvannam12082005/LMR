# 📚 HƯỚNG DẪN SỬ DỤNG HỆ THỐNG QUẢN LÝ THƯ VIỆN

## 🚀 CÁCH KHỞI ĐỘNG HỆ THỐNG

### Bước 1: Khởi động Docker (Database)

Mở Terminal/PowerShell và chạy:

```bash
docker compose up -d
```

**Giải thích:** Lệnh này sẽ khởi động MySQL database và phpMyAdmin trong Docker containers.

### Bước 2: Khởi động Backend Server

Mở Terminal mới và chạy:

```bash
cd server
npm start
```

**Hoặc nếu muốn auto-reload khi code thay đổi:**

```bash
cd server
npm run dev
```

**Kết quả:** Backend API sẽ chạy tại `http://localhost:3000`

### Bước 3: Khởi động Frontend Server

Mở Terminal mới và chạy:

```bash
cd client
npx http-server -p 8080 --cors
```

**Kết quả:** Frontend sẽ chạy tại `http://localhost:8080`

### Bước 4: Truy cập hệ thống

Mở trình duyệt và truy cập: **http://localhost:8080**

---

## 🔐 TÀI KHOẢN DEMO

### 👨‍💼 Administrator (Quản trị viên)
- **Username:** `admin`
- **Password:** `Password123!`
- **Quyền hạn:**
  - Quản lý người dùng (tạo, sửa, xóa)
  - Cấu hình hệ thống
  - Xem audit logs
  - Tất cả quyền của Librarian

### 📖 Librarian (Thủ thư)
- **Username:** `librarian1`
- **Password:** `Password123!`
- **Quyền hạn:**
  - Cho mượn sách (Checkout)
  - Nhận trả sách (Checkin)
  - Quản lý catalog (thêm/sửa sách và bản sao)
  - Xem thông tin member

**Tài khoản thứ 2:**
- **Username:** `librarian2`
- **Password:** `Password123!`

### 👤 Member (Thành viên)
- **Username:** `member1`
- **Password:** `Password123!`
- **Quyền hạn:**
  - Xem sách đang mượn
  - Gia hạn sách (tối đa 2 lần)
  - Đặt trước sách
  - Xem và thanh toán phí phạt

**Các tài khoản member khác:**
- `member2` đến `member10` (cùng password: `Password123!`)

---

## 📋 HƯỚNG DẪN SỬ DỤNG CHO TỪNG VAI TRÒ

### 🌐 GUEST (Khách)

**Không cần đăng nhập, có thể:**

1. **Tìm kiếm sách:**
   - Vào trang chủ
   - Nhập tên sách, tác giả hoặc ISBN vào ô tìm kiếm
   - Click "Search"

2. **Xem chi tiết sách:**
   - Click vào bất kỳ cuốn sách nào
   - Xem thông tin: tác giả, nhà xuất bản, năm xuất bản
   - Xem danh sách các bản sao và trạng thái

3. **Đăng ký thành viên:**
   - Click "Register" trên menu
   - Điền thông tin: username, email, password, họ tên
   - Chọn loại thành viên:
     - **Student:** Mượn tối đa 5 cuốn
     - **Faculty:** Mượn tối đa 10 cuốn
     - **Public:** Mượn tối đa 3 cuốn
   - Click "Register"

---

### 👤 MEMBER (Thành viên)

**Sau khi đăng nhập:**

#### 1. Xem Dashboard
- Click "Dashboard" để xem tổng quan:
  - Số sách đang mượn
  - Số sách đã đặt trước
  - Tổng phí phạt chưa thanh toán

#### 2. Quản lý sách đang mượn
- Xem danh sách sách đang mượn
- Xem ngày hết hạn (màu đỏ nếu quá hạn)
- **Gia hạn sách:**
  - Click nút "Renew" bên cạnh sách
  - Mỗi sách có thể gia hạn tối đa 2 lần
  - Không thể gia hạn nếu:
    - Đã gia hạn 2 lần
    - Có người đặt trước sách này
    - Tổng phí phạt > 50,000 VND

#### 3. Đặt trước sách
- Tìm sách muốn đặt
- Click vào sách để xem chi tiết
- Click nút "Reserve This Book"
- Xem danh sách đặt trước tại "My Reservations"
- **Hủy đặt trước:**
  - Vào "My Reservations"
  - Click "Cancel" bên cạnh sách đã đặt

#### 4. Thanh toán phí phạt
- Vào "My Fines" để xem danh sách phí phạt
- Phí phạt được tính: **5,000 VND/ngày** cho sách trả trễ
- Click "Pay" để thanh toán online (giả lập)
- Sau khi thanh toán, trạng thái chuyển sang "Paid"

#### 5. Xem lịch sử mượn
- Vào "My History" để xem tất cả sách đã mượn trước đây

---

### 📖 LIBRARIAN (Thủ thư)

**Sau khi đăng nhập:**

#### 1. Cho mượn sách (Checkout)
- Click "Checkout" trên menu
- Nhập thông tin:
  - **Member Code:** Mã thành viên (VD: MEM2024001)
  - **Barcode:** Mã vạch sách (VD: BC0001)
- Click "Checkout"
- Hệ thống sẽ:
  - Kiểm tra thành viên có active không
  - Kiểm tra đã đạt giới hạn mượn chưa
  - Kiểm tra sách có available không
  - Tạo loan record với ngày hết hạn (14 ngày)
  - Ghi audit log

**Lưu ý:** Hệ thống ngăn chặn cho mượn cùng 1 sách 2 lần (race condition prevention)

#### 2. Nhận trả sách (Checkin)
- Click "Checkin" trên menu
- Nhập **Barcode** của sách
- Chọn tình trạng sách (Good/Fair/Poor/Damaged)
- Click "Checkin"
- Hệ thống sẽ:
  - Tính số ngày trễ (nếu có)
  - Tự động tạo phí phạt nếu trả trễ
  - Kiểm tra có ai đặt trước không
  - Nếu có đặt trước: chuyển sách sang "Reserved" và thông báo cho người đặt
  - Nếu không: chuyển sách sang "Available"
  - Ghi audit log

#### 3. Quản lý Catalog
- Click "Manage Books" trên menu

**Thêm sách mới:**
- Tab "Add Book"
- Điền thông tin: ISBN, Title, Author, Publisher, Year, Language, Category
- Click "Add Book"

**Thêm bản sao:**
- Tab "Add Copy"
- Nhập ISBN của sách
- Nhập Barcode (mã vạch duy nhất)
- Chọn Condition (New/Good/Fair)
- Nhập Location Code (vị trí trong thư viện)
- Click "Add Copy"

#### 4. Xem thông tin Member
- Có thể xem loans, reservations, fines của bất kỳ member nào
- Truy cập qua URL: `/api/members/{memberId}/loans`

---

### 👨‍💼 ADMINISTRATOR (Quản trị viên)

**Sau khi đăng nhập:**

#### 1. Quản lý người dùng
- Click "Admin" trên menu
- Tab "Users"

**Xem danh sách users:**
- Hiển thị tất cả users với thông tin: username, email, role, status

**Tạo user mới:**
- Click "Create User"
- Chọn role: Member/Librarian/Administrator
- Điền thông tin tương ứng:
  - **Member:** cần membershipType
  - **Librarian:** cần employeeId, department
  - **Administrator:** cần adminLevel

**Sửa user:**
- Click "Edit" bên cạnh user
- Có thể thay đổi:
  - Role (nâng/hạ quyền)
  - Status (Active/Inactive/Locked)
  - Thông tin cá nhân

#### 2. Cấu hình hệ thống
- Tab "System Config"
- Xem và chỉnh sửa các tham số:

| Tham số | Giá trị mặc định | Mô tả |
|---------|------------------|-------|
| `loan_period_days` | 14 | Số ngày mượn sách |
| `max_renewals` | 2 | Số lần gia hạn tối đa |
| `fine_rate_per_day` | 5000 | Phí phạt/ngày (VND) |
| `fine_block_threshold` | 50000 | Ngưỡng phí chặn gia hạn (VND) |
| `reservation_hold_days` | 3 | Số ngày giữ sách đã đặt |

**Cách sửa:**
- Click "Edit" bên cạnh config
- Nhập giá trị mới
- Click "Save"

#### 3. Xem Audit Logs
- Tab "Audit Logs"
- Xem lịch sử tất cả thao tác quan trọng:
  - CHECKOUT: Cho mượn sách
  - CHECKIN: Nhận trả sách
  - CREATE_USER: Tạo user mới
  - UPDATE_CONFIG: Thay đổi cấu hình
- Có thể lọc theo:
  - User
  - Action
  - Date range

---

## 🔧 QUẢN LÝ DATABASE

### Truy cập phpMyAdmin
- URL: **http://localhost:8081**
- Username: `root`
- Password: `rootpass`

### Các bảng chính:
- `User`: Thông tin người dùng
- `Member`: Thông tin thành viên
- `Book`: Thông tin sách
- `BookCopy`: Các bản sao vật lý
- `Loan`: Phiếu mượn
- `Reservation`: Đặt trước
- `Fine`: Phí phạt
- `SystemConfig`: Cấu hình hệ thống
- `AuditLog`: Nhật ký hệ thống

### Reset Database
Nếu muốn reset về dữ liệu ban đầu:

```bash
cd server
npx prisma migrate reset
npm run db:seed
```

---

## 🐛 XỬ LÝ LỖI THƯỜNG GẶP

### 1. "Failed to fetch" khi search sách
**Nguyên nhân:** Backend chưa chạy hoặc CORS issue

**Giải pháp:**
- Kiểm tra backend đang chạy: `http://localhost:3000/health`
- Restart backend server
- Kiểm tra CORS trong `server/src/app.js`

### 2. "Port already in use"
**Nguyên nhân:** Port đã được sử dụng bởi process khác

**Giải pháp:**
```bash
# Tìm process đang dùng port 3000
netstat -ano | findstr :3000

# Kill process (thay PID bằng số thực tế)
taskkill /PID <PID> /F
```

### 3. Database connection error
**Nguyên nhân:** Docker chưa chạy hoặc MySQL chưa ready

**Giải pháp:**
```bash
# Kiểm tra Docker containers
docker compose ps

# Restart Docker
docker compose down
docker compose up -d

# Đợi 10 giây để MySQL khởi động
```

### 4. "Cannot find module"
**Nguyên nhân:** Dependencies chưa được cài

**Giải pháp:**
```bash
cd server
npm install
```

---

## 📊 THÔNG TIN HỆ THỐNG

### Ports đang sử dụng:
- **3000:** Backend API
- **3307:** MySQL Database
- **8080:** Frontend Web
- **8081:** phpMyAdmin

### Công nghệ:
- **Backend:** Node.js + Express + Prisma
- **Database:** MySQL 8.0
- **Frontend:** Vanilla JavaScript + Bootstrap 5
- **Authentication:** JWT (JSON Web Token)

### Dữ liệu có sẵn:
- ✅ 30 sách với 60 bản sao
- ✅ 13 users (1 admin, 2 librarians, 10 members)
- ✅ 20 loans (10 active, 10 returned)
- ✅ 5 reservations
- ✅ 5 fines
- ✅ 6 categories

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề, hãy kiểm tra:
1. Docker đang chạy: `docker compose ps`
2. Backend đang chạy: `http://localhost:3000/health`
3. Frontend đang chạy: `http://localhost:8080`
4. Database có dữ liệu: `http://localhost:8081`

---

## 🎯 TÍNH NĂNG NỔI BẬT

✅ **Race Condition Prevention:** Ngăn chặn cho mượn cùng 1 sách 2 lần đồng thời

✅ **Automatic Fine Calculation:** Tự động tính phí phạt khi trả sách trễ

✅ **Reservation Fulfillment:** Tự động thông báo khi sách đã đặt có sẵn

✅ **Audit Logging:** Ghi lại tất cả thao tác quan trọng

✅ **Role-Based Access Control:** Phân quyền rõ ràng theo vai trò

✅ **Transaction Safety:** Đảm bảo tính toàn vẹn dữ liệu với database transactions

---

**Chúc bạn sử dụng hệ thống hiệu quả! 📚✨**
