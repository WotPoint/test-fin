"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const schemas_1 = require("../validation/schemas");
const router = (0, express_1.Router)();
// GET /api/goals
router.get('/', async (_req, res, next) => {
    try {
        const goals = await prisma_1.prisma.goal.findMany({
            include: { contributions: true },
            orderBy: { createdAt: 'asc' },
        });
        res.json(goals);
    }
    catch (e) {
        next(e);
    }
});
// POST /api/goals
router.post('/', async (req, res, next) => {
    try {
        const { deadline, ...rest } = (0, schemas_1.validate)(schemas_1.GoalCreateSchema, req.body);
        const goal = await prisma_1.prisma.goal.create({
            data: {
                ...rest,
                ...(deadline ? { deadline: new Date(deadline) } : {}),
            },
            include: { contributions: true },
        });
        res.status(201).json(goal);
    }
    catch (e) {
        next(e);
    }
});
// PUT /api/goals/:id
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { deadline, ...rest } = (0, schemas_1.validate)(schemas_1.GoalUpdateSchema, req.body);
        const goal = await prisma_1.prisma.goal.update({
            where: { id },
            data: {
                ...rest,
                ...(deadline !== undefined ? { deadline: deadline ? new Date(deadline) : null } : {}),
            },
            include: { contributions: true },
        });
        res.json(goal);
    }
    catch (e) {
        next(e);
    }
});
// DELETE /api/goals/:id
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma_1.prisma.goal.delete({ where: { id } });
        res.status(204).send();
    }
    catch (e) {
        next(e);
    }
});
// POST /api/goals/:id/contributions
router.post('/:id/contributions', async (req, res, next) => {
    try {
        const { id: goalId } = req.params;
        const { amount, date } = (0, schemas_1.validate)(schemas_1.ContributionSchema, req.body);
        const [, updated] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.goalContribution.create({
                data: { goalId, amount, date: new Date(date) },
            }),
            prisma_1.prisma.goal.update({
                where: { id: goalId },
                data: { currentAmount: { increment: amount } },
                include: { contributions: true },
            }),
        ]);
        res.status(201).json(updated);
    }
    catch (e) {
        next(e);
    }
});
// DELETE /api/goals/:id/contributions/:cid
router.delete('/:id/contributions/:cid', async (req, res, next) => {
    try {
        const { id: goalId, cid } = req.params;
        const contribution = await prisma_1.prisma.goalContribution.findUnique({ where: { id: cid } });
        if (!contribution) {
            res.status(404).json({ error: 'Вклад не найден' });
            return;
        }
        const [, updated] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.goalContribution.delete({ where: { id: cid } }),
            prisma_1.prisma.goal.update({
                where: { id: goalId },
                data: { currentAmount: { decrement: contribution.amount } },
                include: { contributions: true },
            }),
        ]);
        res.json(updated);
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
