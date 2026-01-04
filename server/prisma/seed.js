import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data
  await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 0;`;
  await prisma.payment.deleteMany();
  await prisma.fine.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.bookCopy.deleteMany();
  await prisma.book.deleteMany();
  await prisma.category.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.report.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.member.deleteMany();
  await prisma.librarian.deleteMany();
  await prisma.administrator.deleteMany();
  await prisma.user.deleteMany();
  await prisma.systemConfig.deleteMany();
  await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 1;`;

  console.log('✅ Cleared existing data');

  // System Config
  await prisma.systemConfig.createMany({
    data: [
      { configKey: 'loan_period_days', configValue: '14' },
      { configKey: 'max_renewals', configValue: '2' },
      { configKey: 'fine_rate_per_day', configValue: '5000' },
      { configKey: 'fine_block_threshold', configValue: '50000' },
      { configKey: 'reservation_hold_days', configValue: '3' }
    ]
  });
  console.log('✅ Created system config');

  // Hash password for all users
  const hashedPassword = await bcrypt.hash('Password123!', 10);

  // Create Admin
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@lms.local',
      passwordHash: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'Administrator',
      status: 'Active',
      admin: {
        create: {
          adminLevel: 3,
          permissions: 'ALL'
        }
      }
    }
  });
  console.log('✅ Created admin user');

  // Create Librarians
  const librarian1 = await prisma.user.create({
    data: {
      username: 'librarian1',
      email: 'lib1@lms.local',
      passwordHash: hashedPassword,
      firstName: 'Alice',
      lastName: 'Johnson',
      role: 'Librarian',
      status: 'Active',
      librarian: {
        create: {
          employeeId: 'EMP001',
          department: 'Circulation',
          hireDate: new Date('2023-01-15')
        }
      }
    },
    include: { librarian: true }
  });

  const librarian2 = await prisma.user.create({
    data: {
      username: 'librarian2',
      email: 'lib2@lms.local',
      passwordHash: hashedPassword,
      firstName: 'Bob',
      lastName: 'Williams',
      role: 'Librarian',
      status: 'Active',
      librarian: {
        create: {
          employeeId: 'EMP002',
          department: 'Reference',
          hireDate: new Date('2023-03-20')
        }
      }
    },
    include: { librarian: true }
  });
  console.log('✅ Created 2 librarians');

  // Create Members
  const memberTypes = ['Student', 'Faculty', 'Public'];
  const memberData = [
    { username: 'member1', email: 'member1@lms.local', firstName: 'John', lastName: 'Doe', type: 'Student' },
    { username: 'member2', email: 'member2@lms.local', firstName: 'Jane', lastName: 'Smith', type: 'Faculty' },
    { username: 'member3', email: 'member3@lms.local', firstName: 'Mike', lastName: 'Brown', type: 'Public' },
    { username: 'member4', email: 'member4@lms.local', firstName: 'Sarah', lastName: 'Davis', type: 'Student' },
    { username: 'member5', email: 'member5@lms.local', firstName: 'Tom', lastName: 'Wilson', type: 'Student' },
    { username: 'member6', email: 'member6@lms.local', firstName: 'Emily', lastName: 'Taylor', type: 'Faculty' },
    { username: 'member7', email: 'member7@lms.local', firstName: 'David', lastName: 'Anderson', type: 'Public' },
    { username: 'member8', email: 'member8@lms.local', firstName: 'Lisa', lastName: 'Thomas', type: 'Student' },
    { username: 'member9', email: 'member9@lms.local', firstName: 'James', lastName: 'Jackson', type: 'Faculty' },
    { username: 'member10', email: 'member10@lms.local', firstName: 'Maria', lastName: 'White', type: 'Public' }
  ];

  const members = [];
  for (let i = 0; i < memberData.length; i++) {
    const data = memberData[i];
    const borrowingLimit = data.type === 'Student' ? 5 : data.type === 'Faculty' ? 10 : 3;
    const membershipDate = new Date('2024-01-01');
    const expiryDate = new Date('2025-01-01');

    const member = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        passwordHash: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'Member',
        status: 'Active',
        member: {
          create: {
            memberCode: `MEM2024${String(i + 1).padStart(3, '0')}`,
            membershipType: data.type,
            membershipDate: membershipDate,
            expiryDate: expiryDate,
            borrowingLimit: borrowingLimit
          }
        }
      },
      include: { member: true }
    });
    members.push(member);
  }
  console.log('✅ Created 10 members');

  // Create Categories
  const categories = await prisma.category.createMany({
    data: [
      { categoryName: 'Fiction' },
      { categoryName: 'Non-Fiction' },
      { categoryName: 'Science' },
      { categoryName: 'History' },
      { categoryName: 'Technology' },
      { categoryName: 'Literature' }
    ]
  });
  console.log('✅ Created 6 categories');

  const cats = await prisma.category.findMany();

  // Create Books and Copies
  const booksData = [
    { isbn: '978-0-439-13959-5', title: 'Harry Potter and the Goblet of Fire', author: 'J.K. Rowling', publisher: 'Scholastic', year: 2000, categoryId: cats[5].categoryId },
    { isbn: '978-0-7432-7356-5', title: '1984', author: 'George Orwell', publisher: 'Harcourt', year: 1949, categoryId: cats[5].categoryId },
    { isbn: '978-0-06-112008-4', title: 'To Kill a Mockingbird', author: 'Harper Lee', publisher: 'Harper Perennial', year: 1960, categoryId: cats[5].categoryId },
    { isbn: '978-0-14-028329-5', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', publisher: 'Penguin', year: 1925, categoryId: cats[5].categoryId },
    { isbn: '978-0-452-28423-4', title: 'Pride and Prejudice', author: 'Jane Austen', publisher: 'Penguin Classics', year: 1813, categoryId: cats[5].categoryId },
    { isbn: '978-0-316-76948-0', title: 'The Catcher in the Rye', author: 'J.D. Salinger', publisher: 'Little Brown', year: 1951, categoryId: cats[5].categoryId },
    { isbn: '978-0-06-093546-7', title: 'Brave New World', author: 'Aldous Huxley', publisher: 'Harper Perennial', year: 1932, categoryId: cats[0].categoryId },
    { isbn: '978-0-14-017739-8', title: 'Of Mice and Men', author: 'John Steinbeck', publisher: 'Penguin', year: 1937, categoryId: cats[0].categoryId },
    { isbn: '978-0-7432-7357-2', title: 'Animal Farm', author: 'George Orwell', publisher: 'Harcourt', year: 1945, categoryId: cats[0].categoryId },
    { isbn: '978-0-14-118776-1', title: 'Lord of the Flies', author: 'William Golding', publisher: 'Penguin', year: 1954, categoryId: cats[0].categoryId },
    { isbn: '978-0-06-112241-5', title: 'A Brief History of Time', author: 'Stephen Hawking', publisher: 'Bantam', year: 1988, categoryId: cats[2].categoryId },
    { isbn: '978-0-385-33312-0', title: 'Sapiens', author: 'Yuval Noah Harari', publisher: 'Harper', year: 2011, categoryId: cats[3].categoryId },
    { isbn: '978-0-307-58837-1', title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', publisher: 'Farrar Straus', year: 2011, categoryId: cats[1].categoryId },
    { isbn: '978-1-4516-7388-9', title: 'Steve Jobs', author: 'Walter Isaacson', publisher: 'Simon & Schuster', year: 2011, categoryId: cats[4].categoryId },
    { isbn: '978-0-7432-7357-3', title: 'The Innovators', author: 'Walter Isaacson', publisher: 'Simon & Schuster', year: 2014, categoryId: cats[4].categoryId }
  ];

  let barcodeCounter = 1;
  for (const bookData of booksData) {
    await prisma.book.create({
      data: {
        isbn: bookData.isbn,
        title: bookData.title,
        author: bookData.author,
        publisher: bookData.publisher,
        publicationYear: bookData.year,
        language: 'English',
        categoryId: bookData.categoryId,
        copies: {
          create: [
            {
              barcode: `BC${String(barcodeCounter++).padStart(4, '0')}`,
              status: 'Available',
              condition: 'Good',
              locationCode: `A-${Math.floor(Math.random() * 20) + 1}-${Math.floor(Math.random() * 5) + 1}`
            },
            {
              barcode: `BC${String(barcodeCounter++).padStart(4, '0')}`,
              status: 'Available',
              condition: 'Good',
              locationCode: `A-${Math.floor(Math.random() * 20) + 1}-${Math.floor(Math.random() * 5) + 1}`
            }
          ]
        }
      }
    });
  }

  // Add more books to reach 30
  for (let i = 16; i <= 30; i++) {
    await prisma.book.create({
      data: {
        isbn: `978-0-${String(i).padStart(3, '0')}-${String(i * 100).padStart(5, '0')}-${i % 10}`,
        title: `Book Title ${i}`,
        author: `Author ${i}`,
        publisher: `Publisher ${i}`,
        publicationYear: 2000 + (i % 24),
        language: 'Vietnamese',
        categoryId: cats[i % cats.length].categoryId,
        copies: {
          create: [
            {
              barcode: `BC${String(barcodeCounter++).padStart(4, '0')}`,
              status: 'Available',
              condition: 'Good',
              locationCode: `B-${Math.floor(Math.random() * 20) + 1}-${Math.floor(Math.random() * 5) + 1}`
            },
            {
              barcode: `BC${String(barcodeCounter++).padStart(4, '0')}`,
              status: 'Available',
              condition: 'Fair',
              locationCode: `B-${Math.floor(Math.random() * 20) + 1}-${Math.floor(Math.random() * 5) + 1}`
            }
          ]
        }
      }
    });
  }
  console.log('✅ Created 30 books with 60 copies');

  // Get some copies for loans
  const copies = await prisma.bookCopy.findMany({ take: 20 });

  // Create Active Loans
  const now = new Date();
  for (let i = 0; i < 10; i++) {
    const issueDate = new Date(now);
    issueDate.setDate(issueDate.getDate() - (i + 1));
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 14);

    await prisma.loan.create({
      data: {
        memberId: members[i].member.memberId,
        barcode: copies[i].barcode,
        issueDate: issueDate,
        dueDate: dueDate,
        status: 'Active',
        issuedById: librarian1.librarian.librarianId,
        renewalCount: i % 3
      }
    });

    // Update copy status
    await prisma.bookCopy.update({
      where: { barcode: copies[i].barcode },
      data: { status: 'Loaned' }
    });
  }
  console.log('✅ Created 10 active loans');

  // Create Returned Loans with some fines
  for (let i = 10; i < 20; i++) {
    const issueDate = new Date(now);
    issueDate.setDate(issueDate.getDate() - 30);
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 14);
    const returnDate = new Date(dueDate);
    returnDate.setDate(returnDate.getDate() + (i % 2 === 0 ? 5 : -2)); // Some overdue, some on-time

    const loan = await prisma.loan.create({
      data: {
        memberId: members[i % 10].member.memberId,
        barcode: copies[i].barcode,
        issueDate: issueDate,
        dueDate: dueDate,
        returnDate: returnDate,
        status: 'Returned',
        issuedById: librarian1.librarian.librarianId,
        returnedToId: librarian2.librarian.librarianId,
        renewalCount: 0
      }
    });

    // Create fine if overdue
    if (returnDate > dueDate) {
      const overdueDays = Math.floor((returnDate - dueDate) / (1000 * 60 * 60 * 24));
      const amount = overdueDays * 5000;
      const isPaid = i % 4 === 0;

      await prisma.fine.create({
        data: {
          loanId: loan.loanId,
          memberId: members[i % 10].member.memberId,
          amount: amount,
          reason: 'Overdue',
          status: isPaid ? 'Paid' : 'Unpaid',
          paidAt: isPaid ? new Date() : null
        }
      });
    }
  }
  console.log('✅ Created 10 returned loans with fines');

  // Create Reservations
  const reservationBooks = await prisma.book.findMany({ take: 5 });
  for (let i = 0; i < 5; i++) {
    await prisma.reservation.create({
      data: {
        memberId: members[i + 5].member.memberId,
        isbn: reservationBooks[i].isbn,
        status: 'Pending',
        reserveDate: new Date()
      }
    });
  }
  console.log('✅ Created 5 pending reservations');

  // Create some notifications (stubbed)
  await prisma.notification.createMany({
    data: [
      {
        userId: members[0].userId,
        type: 'LoanDueSoon',
        channel: 'Email',
        content: 'Your loan is due in 2 days',
        status: 'Pending'
      },
      {
        userId: members[1].userId,
        type: 'ReservationReady',
        channel: 'SMS',
        content: 'Your reserved book is ready',
        status: 'Pending'
      }
    ]
  });
  console.log('✅ Created notification stubs');

  // Create audit logs
  await prisma.auditLog.createMany({
    data: [
      {
        userId: librarian1.userId,
        action: 'CHECKOUT',
        entityType: 'Loan',
        entityId: '1',
        ipAddress: '192.168.1.100',
        createdAt: new Date()
      },
      {
        userId: admin.userId,
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: members[0].userId.toString(),
        ipAddress: '192.168.1.101',
        createdAt: new Date()
      }
    ]
  });
  console.log('✅ Created audit logs');

  console.log('🎉 Seed completed successfully!');
  console.log('\n📝 Demo Accounts:');
  console.log('   Admin: admin / Password123!');
  console.log('   Librarian: librarian1 / Password123!');
  console.log('   Member: member1 / Password123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
