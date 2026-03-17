import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  validate,
  CategoryCreateSchema,
  CategoryUpdateSchema,
  ReorderSchema,
} from '../validation/schemas';

const router = Router();
const prisma = new PrismaClient();

// GET /api/categories
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { order: 'asc' } });
    res.json(categories);
  } catch (e) { next(e); }
});

// POST /api/categories
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = validate(CategoryCreateSchema, req.body);
    const category = await prisma.category.create({ data });
    res.status(201).json(category);
  } catch (e) { next(e); }
});

// PUT /api/categories/reorder — must be before /:id
router.put('/reorder', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = validate(ReorderSchema, req.body);
    await Promise.all(ids.map((id, index) =>
      prisma.category.update({ where: { id }, data: { order: index } })
    ));
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// PUT /api/categories/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = validate(CategoryUpdateSchema, req.body);
    const category = await prisma.category.update({ where: { id }, data });
    res.json(category);
  } catch (e) { next(e); }
});

// DELETE /api/categories/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const txCount = await prisma.transaction.count({ where: { categoryId: id } });
    if (txCount > 0) {
      res.status(409).json({ error: `Невозможно удалить: категория используется в ${txCount} транзакции(-ях)` });
      return;
    }
    await prisma.category.delete({ where: { id } });
    res.status(204).send();
  } catch (e) { next(e); }
});

export default router;
