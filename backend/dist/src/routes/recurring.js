"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const uuid_1 = require("uuid");
const date_fns_1 = require("date-fns");
const schemas_1 = require("../validation/schemas");
const router = (0, express_1.Router)();
// GET /api/recurring
router.get('/', async (_req, res, next) => {
    try {
        const recurring = await prisma_1.prisma.recurringTransaction.findMany();
        res.json(recurring);
    }
    catch (e) {
        next(e);
    }
});
// POST /api/recurring
router.post('/', async (req, res, next) => {
    try {
        const { startDate, endDate, nextDate, lastProcessedDate, ...rest } = (0, schemas_1.validate)(schemas_1.RecurringCreateSchema, req.body);
        const item = await prisma_1.prisma.recurringTransaction.create({
            data: {
                ...rest,
                startDate: new Date(startDate),
                nextDate: new Date(nextDate),
                ...(endDate ? { endDate: new Date(endDate) } : {}),
                ...(lastProcessedDate ? { lastProcessedDate: new Date(lastProcessedDate) } : {}),
            },
        });
        res.status(201).json(item);
    }
    catch (e) {
        next(e);
    }
});
// PUT /api/recurring/:id
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { startDate, endDate, nextDate, lastProcessedDate, ...rest } = (0, schemas_1.validate)(schemas_1.RecurringUpdateSchema, req.body);
        const item = await prisma_1.prisma.recurringTransaction.update({
            where: { id },
            data: {
                ...rest,
                ...(startDate ? { startDate: new Date(startDate) } : {}),
                ...(nextDate ? { nextDate: new Date(nextDate) } : {}),
                ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
                ...(lastProcessedDate !== undefined ? { lastProcessedDate: lastProcessedDate ? new Date(lastProcessedDate) : null } : {}),
            },
        });
        res.json(item);
    }
    catch (e) {
        next(e);
    }
});
// DELETE /api/recurring/:id
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma_1.prisma.recurringTransaction.delete({ where: { id } });
        res.status(204).send();
    }
    catch (e) {
        next(e);
    }
});
function getNextDate(current, frequency) {
    switch (frequency) {
        case 'daily': return (0, date_fns_1.addDays)(current, 1);
        case 'weekly': return (0, date_fns_1.addDays)(current, 7);
        case 'monthly': return (0, date_fns_1.addMonths)(current, 1);
        case 'quarterly': return (0, date_fns_1.addQuarters)(current, 1);
        case 'yearly': return (0, date_fns_1.addYears)(current, 1);
        default: return (0, date_fns_1.addMonths)(current, 1);
    }
}
// POST /api/recurring/process — generate transactions up to today
router.post('/process', async (_req, res, next) => {
    try {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const actives = await prisma_1.prisma.recurringTransaction.findMany({ where: { isActive: true } });
        const created = [];
        const MAX_ITERATIONS = 100;
        for (const r of actives) {
            let nextDate = new Date(r.nextDate);
            let iterations = 0;
            while (nextDate <= today) {
                if (++iterations > MAX_ITERATIONS) {
                    console.error(`[recurring] Превышен лимит итераций для правила ${r.id} (${r.name})`);
                    break;
                }
                if (r.endDate && nextDate > new Date(r.endDate))
                    break;
                const tx = await prisma_1.prisma.transaction.create({
                    data: {
                        id: (0, uuid_1.v4)(),
                        type: r.type,
                        amount: r.amount,
                        categoryId: r.categoryId,
                        accountId: r.accountId,
                        date: nextDate,
                        comment: r.name,
                        tags: '[]',
                        recurringId: r.id,
                    },
                });
                created.push(tx);
                nextDate = getNextDate(nextDate, r.frequency);
            }
            await prisma_1.prisma.recurringTransaction.update({
                where: { id: r.id },
                data: { nextDate, lastProcessedDate: new Date() },
            });
        }
        res.json({ processed: actives.length, created: created.length });
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
