import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { validate, AccountCreateSchema, AccountUpdateSchema } from '../validation/schemas';

const router = Router();
const prisma = new PrismaClient();

// GET /api/accounts — includes server-computed balance for every account
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const accounts = await prisma.account.findMany({ orderBy: { createdAt: 'asc' } });

    // Compute balances in DB — correct regardless of how many transactions exist
    const fromAgg = await prisma.transaction.groupBy({
      by: ['accountId', 'type'],
      _sum: { amount: true },
    });

    const toAgg = await prisma.transaction.groupBy({
      by: ['toAccountId'],
      where: { type: 'transfer', toAccountId: { not: null } },
      _sum: { amount: true },
    });

    const balMap: Record<string, number> = {};
    accounts.forEach(a => { balMap[a.id] = a.initialBalance; });

    fromAgg.forEach(row => {
      const sum = row._sum.amount ?? 0;
      if (row.type === 'income') balMap[row.accountId] += sum;
      else if (row.type === 'expense') balMap[row.accountId] -= sum;
      else if (row.type === 'transfer') balMap[row.accountId] -= sum;
    });

    toAgg.forEach(row => {
      if (row.toAccountId && balMap[row.toAccountId] !== undefined) {
        balMap[row.toAccountId] += row._sum.amount ?? 0;
      }
    });

    res.json(accounts.map(a => ({ ...a, balance: balMap[a.id] ?? a.initialBalance })));
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
