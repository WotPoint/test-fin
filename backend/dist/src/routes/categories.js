"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const schemas_1 = require("../validation/schemas");
const router = (0, express_1.Router)();
// GET /api/categories
router.get('/', async (_req, res, next) => {
    try {
        const categories = await prisma_1.prisma.category.findMany({ orderBy: { order: 'asc' } });
        res.json(categories);
    }
    catch (e) {
        next(e);
    }
});
// POST /api/categories
router.post('/', async (req, res, next) => {
    try {
        const data = (0, schemas_1.validate)(schemas_1.CategoryCreateSchema, req.body);
        const category = await prisma_1.prisma.category.create({ data });
        res.status(201).json(category);
    }
    catch (e) {
        next(e);
    }
});
// PUT /api/categories/reorder — must be before /:id
router.put('/reorder', async (req, res, next) => {
    try {
        const { ids } = (0, schemas_1.validate)(schemas_1.ReorderSchema, req.body);
        await prisma_1.prisma.$transaction(ids.map((id, index) => prisma_1.prisma.category.update({ where: { id }, data: { order: index } })));
        res.json({ ok: true });
    }
    catch (e) {
        next(e);
    }
});
// PUT /api/categories/:id
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = (0, schemas_1.validate)(schemas_1.CategoryUpdateSchema, req.body);
        const category = await prisma_1.prisma.category.update({ where: { id }, data });
        res.json(category);
    }
    catch (e) {
        next(e);
    }
});
// DELETE /api/categories/:id
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const txCount = await prisma_1.prisma.transaction.count({ where: { categoryId: id } });
        if (txCount > 0) {
            res.status(409).json({ error: `Невозможно удалить: категория используется в ${txCount} транзакции(-ях)` });
            return;
        }
        await prisma_1.prisma.category.delete({ where: { id } });
        res.status(204).send();
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
