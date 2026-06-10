"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const schemas_1 = require("../validation/schemas");
const router = (0, express_1.Router)();
// GET /api/accounts — includes server-computed balance for every account
router.get('/', async (_req, res, next) => {
    try {
        const accounts = await prisma_1.prisma.account.findMany({ orderBy: { createdAt: 'asc' } });
        // Compute balances in DB — correct regardless of how many transactions exist
        const fromAgg = await prisma_1.prisma.transaction.groupBy({
            by: ['accountId', 'type'],
            _sum: { amount: true },
        });
        const toAgg = await prisma_1.prisma.transaction.groupBy({
            by: ['toAccountId'],
            where: { type: 'transfer', toAccountId: { not: null } },
            _sum: { amount: true },
        });
        const balMap = {};
        accounts.forEach(a => { balMap[a.id] = a.initialBalance; });
        fromAgg.forEach(row => {
            const sum = row._sum.amount ?? 0;
            if (row.type === 'income')
                balMap[row.accountId] += sum;
            else if (row.type === 'expense')
                balMap[row.accountId] -= sum;
            else if (row.type === 'transfer')
                balMap[row.accountId] -= sum;
        });
        toAgg.forEach(row => {
            if (row.toAccountId && balMap[row.toAccountId] !== undefined) {
                balMap[row.toAccountId] += row._sum.amount ?? 0;
            }
        });
        res.json(accounts.map(a => ({ ...a, balance: balMap[a.id] ?? a.initialBalance })));
    }
    catch (e) {
        next(e);
    }
});
// POST /api/accounts
router.post('/', async (req, res, next) => {
    try {
        const data = (0, schemas_1.validate)(schemas_1.AccountCreateSchema, req.body);
        const account = await prisma_1.prisma.account.create({ data });
        res.status(201).json(account);
    }
    catch (e) {
        next(e);
    }
});
// PUT /api/accounts/:id
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = (0, schemas_1.validate)(schemas_1.AccountUpdateSchema, req.body);
        const account = await prisma_1.prisma.account.update({ where: { id }, data });
        res.json(account);
    }
    catch (e) {
        next(e);
    }
});
// DELETE /api/accounts/:id
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma_1.prisma.account.delete({ where: { id } });
        res.status(204).send();
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
