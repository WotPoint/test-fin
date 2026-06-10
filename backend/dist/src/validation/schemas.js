"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecurringUpdateSchema = exports.RecurringCreateSchema = exports.SubcategoryUpdateSchema = exports.SubcategoryCreateSchema = exports.ContributionSchema = exports.GoalUpdateSchema = exports.GoalCreateSchema = exports.BudgetUpdateSchema = exports.BudgetCreateSchema = exports.BulkDeleteSchema = exports.TransactionUpdateSchema = exports.TransactionCreateSchema = exports.ReorderSchema = exports.CategoryUpdateSchema = exports.CategoryCreateSchema = exports.AccountUpdateSchema = exports.AccountCreateSchema = void 0;
exports.validate = validate;
const zod_1 = require("zod");
// ─── Helpers ─────────────────────────────────────────────────────────────────
const pos = zod_1.z.number().positive();
const dateStr = zod_1.z.string().min(1);
const txType = zod_1.z.enum(['income', 'expense', 'transfer']);
const frequency = zod_1.z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']);
function validate(schema, data) {
    const result = schema.safeParse(data);
    if (!result.success) {
        const err = new Error(formatErrors(result.error));
        err.status = 400;
        throw err;
    }
    return result.data;
}
function formatErrors(error) {
    return error.issues.map((issue) => `${issue.path.join('.') || 'value'}: ${issue.message}`).join('; ');
}
// ─── Accounts ────────────────────────────────────────────────────────────────
exports.AccountCreateSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    name: zod_1.z.string().min(1).max(100),
    type: zod_1.z.enum(['cash', 'card', 'ewallet', 'savings', 'investment']),
    currency: zod_1.z.enum(['RUB', 'USD', 'EUR', 'GBP', 'CNY']).default('RUB'),
    initialBalance: zod_1.z.number().default(0),
    color: zod_1.z.string().min(1),
    icon: zod_1.z.string().min(1),
    isArchived: zod_1.z.boolean().default(false),
});
exports.AccountUpdateSchema = exports.AccountCreateSchema.partial().omit({ id: true });
// ─── Categories ──────────────────────────────────────────────────────────────
exports.CategoryCreateSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    name: zod_1.z.string().min(1).max(100),
    type: zod_1.z.enum(['income', 'expense']),
    color: zod_1.z.string().min(1),
    icon: zod_1.z.string().min(1),
    parentId: zod_1.z.string().nullable().optional(),
    isDefault: zod_1.z.boolean().default(false),
    isArchived: zod_1.z.boolean().default(false),
    order: zod_1.z.number().int().default(0),
});
exports.CategoryUpdateSchema = exports.CategoryCreateSchema.partial().omit({ id: true });
exports.ReorderSchema = zod_1.z.object({
    ids: zod_1.z.array(zod_1.z.string().min(1)).min(1),
});
// ─── Transactions ─────────────────────────────────────────────────────────────
exports.TransactionCreateSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    type: txType,
    amount: pos,
    categoryId: zod_1.z.string().nullable().optional(),
    subcategoryId: zod_1.z.string().nullable().optional(),
    accountId: zod_1.z.string().min(1),
    toAccountId: zod_1.z.string().nullable().optional(),
    date: dateStr,
    comment: zod_1.z.string().max(500).nullable().optional(),
    tags: zod_1.z.string().default('[]'),
    recurringId: zod_1.z.string().nullable().optional(),
});
exports.TransactionUpdateSchema = exports.TransactionCreateSchema.partial().omit({ id: true });
exports.BulkDeleteSchema = zod_1.z.object({
    ids: zod_1.z.array(zod_1.z.string()).min(1).max(500),
});
// ─── Budgets ─────────────────────────────────────────────────────────────────
exports.BudgetCreateSchema = zod_1.z.object({
    categoryId: zod_1.z.string().min(1),
    amount: pos,
    month: zod_1.z.number().int().min(1).max(12),
    year: zod_1.z.number().int().min(2000).max(2100),
    alertThreshold: zod_1.z.number().int().min(0).max(100).default(80),
});
exports.BudgetUpdateSchema = exports.BudgetCreateSchema.omit({ categoryId: true }).partial();
// ─── Goals ───────────────────────────────────────────────────────────────────
exports.GoalCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().max(500).nullable().optional(),
    targetAmount: pos,
    currentAmount: zod_1.z.number().default(0),
    deadline: dateStr.nullable().optional(),
    icon: zod_1.z.string().min(1),
    color: zod_1.z.string().min(1),
    isCompleted: zod_1.z.boolean().default(false),
});
exports.GoalUpdateSchema = exports.GoalCreateSchema.partial();
exports.ContributionSchema = zod_1.z.object({
    amount: pos,
    date: dateStr,
});
// ─── Subcategories ───────────────────────────────────────────────────────────
exports.SubcategoryCreateSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    name: zod_1.z.string().min(1).max(100),
    categoryId: zod_1.z.string().min(1),
});
exports.SubcategoryUpdateSchema = exports.SubcategoryCreateSchema.partial().omit({ id: true });
// ─── Recurring ────────────────────────────────────────────────────────────────
exports.RecurringCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(200),
    type: txType,
    amount: pos,
    categoryId: zod_1.z.string().nullable().optional(),
    accountId: zod_1.z.string().min(1),
    frequency,
    startDate: dateStr,
    endDate: dateStr.nullable().optional(),
    nextDate: dateStr,
    lastProcessedDate: dateStr.nullable().optional(),
    isActive: zod_1.z.boolean().default(true),
});
exports.RecurringUpdateSchema = exports.RecurringCreateSchema.partial();
