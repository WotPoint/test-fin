import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma';
import { parseAlfaStatement } from '../lib/bankParsers/alfa';
import {
  validate,
  TransactionCreateSchema,
  TransactionUpdateSchema,
  BulkDeleteSchema,
} from '../validation/schemas';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

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

    const take = Math.min(limit ? parseInt(limit as string, 10) : 100, 500);
    const skip = offset ? Math.max(parseInt(offset as string, 10), 0) : 0;

    const [data, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { date: 'desc' },
        take,
        skip,
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

// POST /api/transactions/import — import bank statement (XLSX)
router.post('/import', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Файл не загружен' });
      return;
    }

    const operations = parseAlfaStatement(req.file.buffer);
    if (operations.length === 0) {
      res.status(400).json({ error: 'Не удалось извлечь операции из файла' });
      return;
    }

    const account = await prisma.account.findFirst({
      where: { isArchived: false },
      orderBy: { createdAt: 'asc' },
    });
    if (!account) {
      res.status(400).json({ error: 'Нет доступных счетов для импорта. Создайте хотя бы один счёт.' });
      return;
    }

    // Fetch categories once for fuzzy matching
    const categories = await prisma.category.findMany({ where: { isArchived: false } });

    const bankImport = await prisma.bankImport.create({
      data: {
        fileName: req.file.originalname,
        bankName: 'alfa',
        createdCount: 0,
        skippedCount: 0,
      },
    });

    let created = 0;
    let skipped = 0;

    for (const op of operations) {
      const existing = await prisma.transaction.findUnique({
        where: { externalRef: op.externalRef },
      });
      if (existing) {
        skipped++;
        continue;
      }

      // Fuzzy match category
      let category = categories.find(c =>
        c.name.toLowerCase() === op.categoryName.toLowerCase()
      );
      if (!category) {
        category = categories.find(c =>
          c.name.toLowerCase().includes(op.categoryName.toLowerCase()) ||
          op.categoryName.toLowerCase().includes(c.name.toLowerCase())
        );
      }

      await prisma.transaction.create({
        data: {
          type: op.rawType,
          amount: op.amount,
          categoryId: category?.id || null,
          accountId: account.id,
          date: new Date(op.date),
          comment: op.comment,
          tags: '[]',
          externalRef: op.externalRef,
          source: 'alfa',
          bankImportId: bankImport.id,
        },
      });
      created++;
    }

    await prisma.bankImport.update({
      where: { id: bankImport.id },
      data: { createdCount: created, skippedCount: skipped },
    });

    res.json({ created, skipped });
  } catch (e) { next(e); }
});

export default router;
