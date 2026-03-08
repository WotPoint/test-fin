import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { validate, GoalCreateSchema, GoalUpdateSchema, ContributionSchema } from '../schemas';

const router = Router();
const prisma = new PrismaClient();

// GET /api/goals
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const goals = await prisma.goal.findMany({
      include: { contributions: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(goals);
  } catch (e) { next(e); }
});

// POST /api/goals
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { deadline, ...rest } = validate(GoalCreateSchema, req.body);
    const goal = await prisma.goal.create({
      data: {
        ...rest,
        ...(deadline ? { deadline: new Date(deadline) } : {}),
      },
      include: { contributions: true },
    });
    res.status(201).json(goal);
  } catch (e) { next(e); }
});

// PUT /api/goals/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { deadline, ...rest } = validate(GoalUpdateSchema, req.body);
    const goal = await prisma.goal.update({
      where: { id },
      data: {
        ...rest,
        ...(deadline !== undefined ? { deadline: deadline ? new Date(deadline) : null } : {}),
      },
      include: { contributions: true },
    });
    res.json(goal);
  } catch (e) { next(e); }
});

// DELETE /api/goals/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.goal.delete({ where: { id } });
    res.status(204).send();
  } catch (e) { next(e); }
});

// POST /api/goals/:id/contributions
router.post('/:id/contributions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: goalId } = req.params;
    const { amount, date } = validate(ContributionSchema, req.body);
    await prisma.goalContribution.create({
      data: { goalId, amount, date: new Date(date) },
    });
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      include: { contributions: true },
    });
    const currentAmount = goal!.contributions.reduce((sum, c) => sum + c.amount, 0);
    const updated = await prisma.goal.update({
      where: { id: goalId },
      data: { currentAmount },
      include: { contributions: true },
    });
    res.status(201).json(updated);
  } catch (e) { next(e); }
});

// DELETE /api/goals/:id/contributions/:cid
router.delete('/:id/contributions/:cid', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: goalId, cid } = req.params;
    await prisma.goalContribution.delete({ where: { id: cid } });
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      include: { contributions: true },
    });
    const currentAmount = goal!.contributions.reduce((sum, c) => sum + c.amount, 0);
    const updated = await prisma.goal.update({
      where: { id: goalId },
      data: { currentAmount },
      include: { contributions: true },
    });
    res.json(updated);
  } catch (e) { next(e); }
});

export default router;
