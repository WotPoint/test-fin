import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import { addDays, addMonths, addQuarters, addYears } from 'date-fns';
import { validate, RecurringCreateSchema, RecurringUpdateSchema } from '../validation/schemas';

const router = Router();

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
  switch (frequency) {
    case 'daily':     return addDays(current, 1);
    case 'weekly':    return addDays(current, 7);
    case 'monthly':   return addMonths(current, 1);
    case 'quarterly': return addQuarters(current, 1);
    case 'yearly':    return addYears(current, 1);
    default:          return addMonths(current, 1);
  }
}

// POST /api/recurring/process — generate transactions up to today
router.post('/process', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const actives = await prisma.recurringTransaction.findMany({ where: { isActive: true } });
    const created: unknown[] = [];

    const MAX_ITERATIONS = 100;
    for (const r of actives) {
      let nextDate = new Date(r.nextDate);
      let iterations = 0;
      while (nextDate <= today) {
        if (++iterations > MAX_ITERATIONS) {
          console.error(`[recurring] Превышен лимит итераций для правила ${r.id} (${r.name})`);
          break;
        }
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
