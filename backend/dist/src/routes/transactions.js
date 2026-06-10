"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const prisma_1 = require("../lib/prisma");
const alfa_1 = require("../lib/bankParsers/alfa");
const schemas_1 = require("../validation/schemas");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// GET /api/transactions?limit=100&offset=0&type=&categoryId=&accountId=&dateFrom=&dateTo=
router.get('/', async (req, res, next) => {
    try {
        const { type, categoryId, accountId, dateFrom, dateTo, limit, offset } = req.query;
        const dateRe = /^\d{4}-\d{2}-\d{2}(T[\d:.Z+-]*)?$/;
        if (dateFrom && !dateRe.test(dateFrom)) {
            res.status(400).json({ error: 'Неверный формат dateFrom (ожидается YYYY-MM-DD)' });
            return;
        }
        if (dateTo && !dateRe.test(dateTo)) {
            res.status(400).json({ error: 'Неверный формат dateTo (ожидается YYYY-MM-DD)' });
            return;
        }
        const where = {};
        if (type)
            where.type = type;
        if (categoryId)
            where.categoryId = categoryId;
        if (accountId)
            where.accountId = accountId;
        if (dateFrom || dateTo) {
            where.date = {};
            if (dateFrom)
                where.date.gte = new Date(dateFrom);
            if (dateTo)
                where.date.lte = new Date(dateTo);
        }
        const take = Math.min(limit ? parseInt(limit, 10) : 100, 500);
        const skip = offset ? Math.max(parseInt(offset, 10), 0) : 0;
        const [data, total] = await Promise.all([
            prisma_1.prisma.transaction.findMany({
                where,
                orderBy: { date: 'desc' },
                take,
                skip,
            }),
            prisma_1.prisma.transaction.count({ where }),
        ]);
        res.json({ data, total });
    }
    catch (e) {
        next(e);
    }
});
// POST /api/transactions
router.post('/', async (req, res, next) => {
    try {
        const { date, ...rest } = (0, schemas_1.validate)(schemas_1.TransactionCreateSchema, req.body);
        const transaction = await prisma_1.prisma.transaction.create({
            data: { ...rest, date: new Date(date) },
        });
        res.status(201).json(transaction);
    }
    catch (e) {
        next(e);
    }
});
// PUT /api/transactions/:id
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { date, ...rest } = (0, schemas_1.validate)(schemas_1.TransactionUpdateSchema, req.body);
        const transaction = await prisma_1.prisma.transaction.update({
            where: { id },
            data: { ...rest, ...(date ? { date: new Date(date) } : {}) },
        });
        res.json(transaction);
    }
    catch (e) {
        next(e);
    }
});
// DELETE /api/transactions (bulk)
router.delete('/', async (req, res, next) => {
    try {
        const { ids } = (0, schemas_1.validate)(schemas_1.BulkDeleteSchema, req.body);
        await prisma_1.prisma.transaction.deleteMany({ where: { id: { in: ids } } });
        res.status(204).send();
    }
    catch (e) {
        next(e);
    }
});
// DELETE /api/transactions/:id
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma_1.prisma.transaction.delete({ where: { id } });
        res.status(204).send();
    }
    catch (e) {
        next(e);
    }
});
// POST /api/transactions/import — import bank statement (XLSX)
router.post('/import', upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'Файл не загружен' });
            return;
        }
        const operations = (0, alfa_1.parseAlfaStatement)(req.file.buffer);
        if (operations.length === 0) {
            res.status(400).json({ error: 'Не удалось извлечь операции из файла' });
            return;
        }
        const account = await prisma_1.prisma.account.findFirst({
            where: { isArchived: false },
            orderBy: { createdAt: 'asc' },
        });
        if (!account) {
            res.status(400).json({ error: 'Нет доступных счетов для импорта. Создайте хотя бы один счёт.' });
            return;
        }
        // Fetch categories once for fuzzy matching
        const categories = await prisma_1.prisma.category.findMany({ where: { isArchived: false } });
        const bankImport = await prisma_1.prisma.bankImport.create({
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
            const existing = await prisma_1.prisma.transaction.findUnique({
                where: { externalRef: op.externalRef },
            });
            if (existing) {
                skipped++;
                continue;
            }
            // Fuzzy match category
            let category = categories.find(c => c.name.toLowerCase() === op.categoryName.toLowerCase());
            if (!category) {
                category = categories.find(c => c.name.toLowerCase().includes(op.categoryName.toLowerCase()) ||
                    op.categoryName.toLowerCase().includes(c.name.toLowerCase()));
            }
            await prisma_1.prisma.transaction.create({
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
        await prisma_1.prisma.bankImport.update({
            where: { id: bankImport.id },
            data: { createdCount: created, skippedCount: skipped },
        });
        res.json({ created, skipped });
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
