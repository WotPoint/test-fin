import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { validate, AccountCreateSchema, AccountUpdateSchema } from '../validation/schemas';

const router = Router();
const prisma = new PrismaClient();

// GET /api/accounts
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const accounts = await prisma.account.findMany({ orderBy: { createdAt: 'asc' } });
    res.json(accounts);
  } catch (e) { next(e); }
});

// POST /api/accounts
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = validate(AccountCreateSchema, req.body);
    const account = await prisma.account.create({ data });
    res.status(201).json(account);
  } catch (e) { next(e); }
});

// PUT /api/accounts/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = validate(AccountUpdateSchema, req.body);
    const account = await prisma.account.update({ where: { id }, data });
    res.json(account);
  } catch (e) { next(e); }
});

// DELETE /api/accounts/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.account.delete({ where: { id } });
    res.status(204).send();
  } catch (e) { next(e); }
});

export default router;
