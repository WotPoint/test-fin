import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  validate,
  TransactionCreateSchema,
  TransactionUpdateSchema,
  BulkDeleteSchema,
} from '../validation/schemas';

const router = Router();
const prisma = new PrismaClient();

// GET /api/transactions?limit=100&offset=0&type=&categoryId=&accountId=&dateFrom=&dateTo=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, categoryId, accountId, dateFrom, dateTo, limit, offset } = req.query;

    const dateRe = /^\d{4}-\d{2}-\d{2}(T[\d:.Z+-]*)?$/;
    if (dateFrom && !dateRe.test(dateFrom as string)) {
      res.status(400).json({ error: 'Неверный формат dateFrom (ожидается YYYY-MM-DD)' }); return;
    }
    if (dateTo && !dateRe.test(dateTo as string)) {
      res.status(400).json({ error: 'Неверный формат dateTo (ожидается YYYY-MM-DD)' }); return;
    }

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (categoryId) where.categoryId = categoryId;
    if (accountId) where.accountId = accountId;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) (where.date as Record<string, unknown>).gte = new Date(dateFrom as string);
      if (dateTo)   (where.date as Record<string, unknown>).lte = new Date(dateTo as string);
    }

    const take   = limit  ? Math.min(parseInt(limit  as string, 10), 500) : undefined;
    const skip   = offset ? Math.max(parseInt(offset as string, 10), 0)   : 0;

    const [data, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { date: 'desc' },
        ...(take !== undefined ? { take, skip } : {}),
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({ data, total });
  } catch (e) { next(e); }
});

// POST /api/transactions
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, ...rest } = validate(TransactionCreateSchema, req.body);
    const transaction = await prisma.transaction.create({
      data: { ...rest, date: new Date(date) },
    });
    res.status(201).json(transaction);
  } catch (e) { next(e); }
});

// PUT /api/transactions/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { date, ...rest } = validate(TransactionUpdateSchema, req.body);
    const transaction = await prisma.transaction.update({
      where: { id },
      data: { ...rest, ...(date ? { date: new Date(date) } : {}) },
    });
    res.json(transaction);
  } catch (e) { next(e); }
});

// DELETE /api/transactions (bulk)
router.delete('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = validate(BulkDeleteSchema, req.body);
    await prisma.transaction.deleteMany({ where: { id: { in: ids } } });
    res.status(204).send();
  } catch (e) { next(e); }
});

// DELETE /api/transactions/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.transaction.delete({ where: { id } });
    res.status(204).send();
  } catch (e) { next(e); }
});

export default router;
