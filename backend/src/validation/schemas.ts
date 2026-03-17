import { z, ZodSchema, ZodError } from 'zod';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const pos = z.number().positive();
const dateStr = z.string().min(1);
const txType = z.enum(['income', 'expense', 'transfer']);
const frequency = z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']);

export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const err = new Error(formatErrors(result.error));
    (err as NodeJS.ErrnoException & { status: number }).status = 400;
    throw err;
  }
  return result.data;
}

function formatErrors(error: ZodError): string {
  return error.issues.map((issue) => `${issue.path.join('.') || 'value'}: ${issue.message}`).join('; ');
}

// ─── Accounts ────────────────────────────────────────────────────────────────

export const AccountCreateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(100),
  type: z.enum(['cash', 'card', 'ewallet', 'savings', 'investment']),
  currency: z.enum(['RUB', 'USD', 'EUR', 'GBP', 'CNY']).default('RUB'),
  initialBalance: z.number().default(0),
  color: z.string().min(1),
  icon: z.string().min(1),
  isArchived: z.boolean().default(false),
});

export const AccountUpdateSchema = AccountCreateSchema.partial().omit({ id: true });

// ─── Categories ──────────────────────────────────────────────────────────────

export const CategoryCreateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(100),
  type: z.enum(['income', 'expense']),
  color: z.string().min(1),
  icon: z.string().min(1),
  parentId: z.string().nullable().optional(),
  isDefault: z.boolean().default(false),
  isArchived: z.boolean().default(false),
  order: z.number().int().default(0),
});

export const CategoryUpdateSchema = CategoryCreateSchema.partial().omit({ id: true });

export const ReorderSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

// ─── Transactions ─────────────────────────────────────────────────────────────

export const TransactionCreateSchema = z.object({
  id: z.string().optional(),
  type: txType,
  amount: pos,
  categoryId: z.string().nullable().optional(),
  subcategoryId: z.string().nullable().optional(),
  accountId: z.string().min(1),
  toAccountId: z.string().nullable().optional(),
  date: dateStr,
  comment: z.string().max(500).nullable().optional(),
  tags: z.string().default('[]'),
  recurringId: z.string().nullable().optional(),
});

export const TransactionUpdateSchema = TransactionCreateSchema.partial().omit({ id: true });

export const BulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1).max(500),
});

// ─── Budgets ─────────────────────────────────────────────────────────────────

export const BudgetCreateSchema = z.object({
  categoryId: z.string().min(1),
  amount: pos,
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  alertThreshold: z.number().int().min(0).max(100).default(80),
});

export const BudgetUpdateSchema = BudgetCreateSchema.omit({ categoryId: true }).partial();

// ─── Goals ───────────────────────────────────────────────────────────────────

export const GoalCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).nullable().optional(),
  targetAmount: pos,
  currentAmount: z.number().default(0),
  deadline: dateStr.nullable().optional(),
  icon: z.string().min(1),
  color: z.string().min(1),
  isCompleted: z.boolean().default(false),
});

export const GoalUpdateSchema = GoalCreateSchema.partial();

export const ContributionSchema = z.object({
  amount: pos,
  date: dateStr,
});

// ─── Subcategories ───────────────────────────────────────────────────────────

export const SubcategoryCreateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(100),
  categoryId: z.string().min(1),
});

export const SubcategoryUpdateSchema = SubcategoryCreateSchema.partial().omit({ id: true });

// ─── Recurring ────────────────────────────────────────────────────────────────

export const RecurringCreateSchema = z.object({
  name: z.string().min(1).max(200),
  type: txType,
  amount: pos,
  categoryId: z.string().nullable().optional(),
  accountId: z.string().min(1),
  frequency,
  startDate: dateStr,
  endDate: dateStr.nullable().optional(),
  nextDate: dateStr,
  lastProcessedDate: dateStr.nullable().optional(),
  isActive: z.boolean().default(true),
});

export const RecurringUpdateSchema = RecurringCreateSchema.partial();
