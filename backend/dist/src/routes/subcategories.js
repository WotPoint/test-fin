"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const schemas_1 = require("../validation/schemas");
const router = (0, express_1.Router)();
// GET /api/subcategories
router.get('/', async (_req, res, next) => {
    try {
        const subs = await prisma_1.prisma.subcategory.findMany({ orderBy: { name: 'asc' } });
        res.json(subs);
    }
    catch (e) {
        next(e);
    }
});
// POST /api/subcategories
router.post('/', async (req, res, next) => {
    try {
        const data = (0, schemas_1.validate)(schemas_1.SubcategoryCreateSchema, req.body);
        const sub = await prisma_1.prisma.subcategory.create({ data });
        res.status(201).json(sub);
    }
    catch (e) {
        next(e);
    }
});
// PUT /api/subcategories/:id
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = (0, schemas_1.validate)(schemas_1.SubcategoryUpdateSchema, req.body);
        const sub = await prisma_1.prisma.subcategory.update({ where: { id }, data });
        res.json(sub);
    }
    catch (e) {
        next(e);
    }
});
// DELETE /api/subcategories/:id
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma_1.prisma.subcategory.delete({ where: { id } });
        res.status(204).send();
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
