import { z } from 'zod';
import * as bookService from '../services/book.service.js';

const createBookSchema = z.object({
  isbn: z.string().min(10).max(20),
  title: z.string().min(1).max(255),
  author: z.string().min(1).max(255),
  publisher: z.string().max(100).optional(),
  publicationYear: z.number().int().optional(),
  description: z.string().optional(),
  language: z.string().max(30).optional(),
  coverImage: z.string().max(255).optional(),
  categoryId: z.string().optional()
});

const updateBookSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  author: z.string().min(1).max(255).optional(),
  publisher: z.string().max(100).optional(),
  publicationYear: z.number().int().optional(),
  description: z.string().optional(),
  language: z.string().max(30).optional(),
  coverImage: z.string().max(255).optional(),
  categoryId: z.string().optional()
});

const addCopySchema = z.object({
  barcode: z.string().min(1).max(20),
  condition: z.enum(['New', 'Good', 'Fair', 'Poor']).optional(),
  locationCode: z.string().max(50).optional()
});

export async function search(req, res, next) {
  try {
    const books = await bookService.search(req.query);
    res.json(books);
  } catch (error) {
    next(error);
  }
}

export async function getByISBN(req, res, next) {
  try {
    const book = await bookService.getByISBN(req.params.isbn);
    res.json(book);
  } catch (error) {
    next(error);
  }
}

export async function create(req, res, next) {
  try {
    const data = createBookSchema.parse(req.body);
    const book = await bookService.create(data);
    res.status(201).json(book);
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const data = updateBookSchema.parse(req.body);
    const book = await bookService.update(req.params.isbn, data);
    res.json(book);
  } catch (error) {
    next(error);
  }
}

export async function addCopy(req, res, next) {
  try {
    const data = addCopySchema.parse(req.body);
    const copy = await bookService.addCopy(req.params.isbn, data);
    res.status(201).json(copy);
  } catch (error) {
    next(error);
  }
}
