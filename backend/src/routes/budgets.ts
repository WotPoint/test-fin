import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/budgets?month=&year=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { month, year } = req.query;
    const where: Record<string, unknown> = {};
    if (month) where.month = Number(month);
    if (year) where.year = Number(year);
    const budgets = await prisma.budget.findMany({ where });
    res.json(budgets);
  } catch (e) { next(e); }
});

// POST /api/budgets
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const budget = await prisma.budget.create({ data: req.body });
    res.status(201).json(budget);
  } catch (e) { next(e); }
});

// PUT /api/budgets/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const budget = await prisma.budget.update({ where: { id }, data: req.body });
    res.json(budget);
  } catch (e) { next(e); }
});

// DELETE /api/budgets/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.budget.delete({ where: { id } });
    res.status(204).send();
  } catch (e) { next(e); }
});

export default router;
