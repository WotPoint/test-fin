"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const schemas_1 = require("../validation/schemas");
const router = (0, express_1.Router)();
// GET /api/budgets?month=&year=
router.get('/', async (req, res, next) => {
    try {
        const { month, year } = req.query;
        const where = {};
        if (month)
            where.month = Number(month);
        if (year)
            where.year = Number(year);
        const budgets = await prisma_1.prisma.budget.findMany({ where });
        res.json(budgets);
    }
    catch (e) {
        next(e);
    }
});
// POST /api/budgets
router.post('/', async (req, res, next) => {
    try {
        const data = (0, schemas_1.validate)(schemas_1.BudgetCreateSchema, req.body);
        const budget = await prisma_1.prisma.budget.create({ data });
        res.status(201).json(budget);
    }
    catch (e) {
        next(e);
    }
});
// PUT /api/budgets/:id
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = (0, schemas_1.validate)(schemas_1.BudgetUpdateSchema, req.body);
        const budget = await prisma_1.prisma.budget.update({ where: { id }, data });
        res.json(budget);
    }
    catch (e) {
        next(e);
    }
});
// DELETE /api/budgets/:id
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma_1.prisma.budget.delete({ where: { id } });
        res.status(204).send();
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
