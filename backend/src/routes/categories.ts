import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

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
    const category = await prisma.category.create({ data: req.body });
    res.status(201).json(category);
  } catch (e) { next(e); }
});

// PUT /api/categories/reorder — должен быть ДО /:id
router.put('/reorder', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body as { ids: string[] };
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
    const category = await prisma.category.update({ where: { id }, data: req.body });
    res.json(category);
  } catch (e) { next(e); }
});

// DELETE /api/categories/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.category.delete({ where: { id } });
    res.status(204).send();
  } catch (e) { next(e); }
});

export default router;
