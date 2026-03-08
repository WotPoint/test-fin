import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { validate, SubcategoryCreateSchema, SubcategoryUpdateSchema } from '../schemas';

const router = Router();
const prisma = new PrismaClient();

// GET /api/subcategories
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const subs = await prisma.subcategory.findMany({ orderBy: { name: 'asc' } });
    res.json(subs);
  } catch (e) { next(e); }
});

// POST /api/subcategories
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = validate(SubcategoryCreateSchema, req.body);
    const sub = await prisma.subcategory.create({ data });
    res.status(201).json(sub);
  } catch (e) { next(e); }
});

// PUT /api/subcategories/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = validate(SubcategoryUpdateSchema, req.body);
    const sub = await prisma.subcategory.update({ where: { id }, data });
    res.json(sub);
  } catch (e) { next(e); }
});

// DELETE /api/subcategories/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.subcategory.delete({ where: { id } });
    res.status(204).send();
  } catch (e) { next(e); }
});

export default router;
