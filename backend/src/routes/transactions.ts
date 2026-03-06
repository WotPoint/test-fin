import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/transactions
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, categoryId, accountId, dateFrom, dateTo } = req.query;
    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (categoryId) where.categoryId = categoryId;
    if (accountId) where.accountId = accountId;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) (where.date as Record<string, unknown>).gte = new Date(dateFrom as string);
      if (dateTo) (where.date as Record<string, unknown>).lte = new Date(dateTo as string);
    }
    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
    });
    res.json(transactions);
  } catch (e) { next(e); }
});

// POST /api/transactions
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, ...rest } = req.body;
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
    const { date, ...rest } = req.body;
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
    const { ids } = req.body as { ids: string[] };
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
