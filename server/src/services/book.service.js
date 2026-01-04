import prisma from '../config/database.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

export async function search(query) {
  const where = {};
  
  if (query.q) {
    where.OR = [
      { title: { contains: query.q } },
      { author: { contains: query.q } },
      { isbn: { contains: query.q } }
    ];
  }
  
  if (query.categoryId) {
    where.categoryId = BigInt(query.categoryId);
  }
  
  return await prisma.book.findMany({
    where,
    include: {
      category: true
    }
  });
}

export async function getByISBN(isbn) {
  const book = await prisma.book.findUnique({
    where: { isbn },
    include: {
      category: true,
      copies: {
        select: {
          barcode: true,
          status: true,
          condition: true,
          locationCode: true
        }
      }
    }
  });
  
  if (!book) {
    throw new NotFoundError('Book not found');
  }
  
  return book;
}

export async function create(data) {
  return await prisma.book.create({
    data: {
      isbn: data.isbn,
      title: data.title,
      author: data.author,
      publisher: data.publisher,
      publicationYear: data.publicationYear,
      description: data.description,
      language: data.language || 'Vietnamese',
      coverImage: data.coverImage,
      categoryId: data.categoryId ? BigInt(data.categoryId) : null
    },
    include: {
      category: true
    }
  });
}

export async function update(isbn, data) {
  const updateData = {};
  
  if (data.title) updateData.title = data.title;
  if (data.author) updateData.author = data.author;
  if (data.publisher) updateData.publisher = data.publisher;
  if (data.publicationYear) updateData.publicationYear = data.publicationYear;
  if (data.description) updateData.description = data.description;
  if (data.language) updateData.language = data.language;
  if (data.coverImage) updateData.coverImage = data.coverImage;
  if (data.categoryId) updateData.categoryId = BigInt(data.categoryId);
  
  return await prisma.book.update({
    where: { isbn },
    data: updateData,
    include: {
      category: true
    }
  });
}

export async function addCopy(isbn, data) {
  // Verify book exists
  const book = await prisma.book.findUnique({
    where: { isbn }
  });
  
  if (!book) {
    throw new NotFoundError('Book not found');
  }
  
  // Check barcode uniqueness
  const existing = await prisma.bookCopy.findUnique({
    where: { barcode: data.barcode }
  });
  
  if (existing) {
    throw new BadRequestError('Barcode already exists');
  }
  
  return await prisma.bookCopy.create({
    data: {
      barcode: data.barcode,
      isbn: isbn,
      status: 'Available',
      condition: data.condition || 'Good',
      locationCode: data.locationCode
    }
  });
}
