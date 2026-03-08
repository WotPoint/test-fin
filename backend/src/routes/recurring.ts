import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { validate, RecurringCreateSchema, RecurringUpdateSchema } from '../schemas';

const router = Router();
const prisma = new PrismaClient();

// GET /api/recurring
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const recurring = await prisma.recurringTransaction.findMany();
    res.json(recurring);
  } catch (e) { next(e); }
});

// POST /api/recurring
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, nextDate, lastProcessedDate, ...rest } = validate(RecurringCreateSchema, req.body);
    const item = await prisma.recurringTransaction.create({
      data: {
        ...rest,
        startDate: new Date(startDate),
        nextDate: new Date(nextDate),
        ...(endDate ? { endDate: new Date(endDate) } : {}),
        ...(lastProcessedDate ? { lastProcessedDate: new Date(lastProcessedDate) } : {}),
      },
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

// PUT /api/recurring/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, nextDate, lastProcessedDate, ...rest } = validate(RecurringUpdateSchema, req.body);
    const item = await prisma.recurringTransaction.update({
      where: { id },
      data: {
        ...rest,
        ...(startDate ? { startDate: new Date(startDate) } : {}),
        ...(nextDate ? { nextDate: new Date(nextDate) } : {}),
        ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
        ...(lastProcessedDate !== undefined ? { lastProcessedDate: lastProcessedDate ? new Date(lastProcessedDate) : null } : {}),
      },
    });
    res.json(item);
  } catch (e) { next(e); }
});

// DELETE /api/recurring/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.recurringTransaction.delete({ where: { id } });
    res.status(204).send();
  } catch (e) { next(e); }
});

function getNextDate(current: Date, frequency: string): Date {
  const next = new Date(current);
  switch (frequency) {
    case 'daily':     next.setDate(next.getDate() + 1);         break;
    case 'weekly':    next.setDate(next.getDate() + 7);         break;
    case 'monthly':   next.setMonth(next.getMonth() + 1);       break;
    case 'quarterly': next.setMonth(next.getMonth() + 3);       break;
    case 'yearly':    next.setFullYear(next.getFullYear() + 1); break;
  }
  return next;
}

// POST /api/recurring/process — generate transactions up to today
router.post('/process', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const actives = await prisma.recurringTransaction.findMany({ where: { isActive: true } });
    const created: unknown[] = [];

    for (const r of actives) {
      let nextDate = new Date(r.nextDate);
      while (nextDate <= today) {
        if (r.endDate && nextDate > new Date(r.endDate)) break;
        const tx = await prisma.transaction.create({
          data: {
            id: uuidv4(),
            type: r.type,
            amount: r.amount,
            categoryId: r.categoryId,
            accountId: r.accountId,
            date: nextDate,
            comment: r.name,
            tags: '[]',
            recurringId: r.id,
          },
        });
        created.push(tx);
        nextDate = getNextDate(nextDate, r.frequency);
      }
      await prisma.recurringTransaction.update({
        where: { id: r.id },
        data: { nextDate, lastProcessedDate: new Date() },
      });
    }

    res.json({ processed: actives.length, created: created.length });
  } catch (e) { next(e); }
});

export default router;
