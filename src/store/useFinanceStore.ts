import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO, isBefore, addDays } from 'date-fns';
import type {
  Account, Category, Subcategory, Transaction, RecurringTransaction,
  Budget, Goal, GoalContribution
} from '../types';
import { defaultSubcategories } from './initialData';
import {
  accountsApi, transactionsApi, categoriesApi, budgetsApi, goalsApi, recurringApi
} from '../api/client';

// ─── Date normalization helpers ───────────────────────────────────────────────

function fmtDate(val: string | Date | null | undefined): string {
  if (!val) return '';
  return format(new Date(val as string), 'yyyy-MM-dd');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeTransaction(tx: any): Transaction {
  return {
    ...tx,
    date: fmtDate(tx.date),
    tags: typeof tx.tags === 'string' ? JSON.parse(tx.tags) : (tx.tags ?? []),
    categoryId: tx.categoryId ?? '',
    createdAt: tx.createdAt ? new Date(tx.createdAt).toISOString() : new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeAccount(a: any): Account {
  return { ...a, createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : new Date().toISOString() };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeGoal(g: any): Goal {
  return {
    ...g,
    deadline: g.deadline ? fmtDate(g.deadline) : undefined,
    createdAt: g.createdAt ? new Date(g.createdAt).toISOString() : new Date().toISOString(),
    contributions: (g.contributions ?? []).map((c: GoalContribution & { date: string }) => ({
      ...c,
      date: fmtDate(c.date),
    })),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeRecurring(r: any): RecurringTransaction {
  return {
    ...r,
    startDate: fmtDate(r.startDate),
    nextDate: fmtDate(r.nextDate),
    endDate: r.endDate ? fmtDate(r.endDate) : undefined,
    lastProcessedDate: r.lastProcessedDate ? fmtDate(r.lastProcessedDate) : undefined,
  };
}

// ─── Store interface ──────────────────────────────────────────────────────────

interface FinanceStore {
  accounts: Account[];
  categories: Category[];
  subcategories: Subcategory[];
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
  budgets: Budget[];
  goals: Goal[];
  isLoading: boolean;

  loadData: () => Promise<void>;

  // Account actions
  addAccount: (acc: Omit<Account, 'id' | 'createdAt'>) => Promise<void>;
  updateAccount: (id: string, updates: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;

  // Category actions
  addCategory: (cat: Omit<Category, 'id' | 'isDefault'>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // Subcategory actions (in-memory only)
  addSubcategory: (sub: Omit<Subcategory, 'id'>) => void;
  deleteSubcategory: (id: string) => void;

  // Transaction actions
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  bulkDeleteTransactions: (ids: string[]) => Promise<void>;

  // Recurring actions
  addRecurring: (r: Omit<RecurringTransaction, 'id'>) => Promise<void>;
  updateRecurring: (id: string, updates: Partial<RecurringTransaction>) => Promise<void>;
  deleteRecurring: (id: string) => Promise<void>;
  processRecurring: () => Promise<void>;

  // Budget actions
  setBudget: (categoryId: string, month: number, year: number, amount: number, alertThreshold?: number) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;

  // Goal actions
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'isCompleted'>) => Promise<void>;
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addToGoal: (id: string, amount: number, comment?: string) => Promise<void>;

  // Category order
  reorderCategories: (ids: string[]) => Promise<void>;

  // Selectors
  getAccountBalance: (accountId: string) => number;
  getTotalBalance: () => number;
  getMonthlyStats: (month: number, year: number) => { income: number; expense: number; net: number };
  getCategorySpending: (month: number, year: number) => Record<string, number>;
  getBudgetUsage: (categoryId: string, month: number, year: number) => { budget: number; spent: number; percentage: number };
  getAppNotifications: () => AppNotification[];
  getTagStats: (startDate: string, endDate: string) => { tag: string; amount: number; count: number }[];
}

export interface AppNotification {
  id: string;
  type: 'budget_over' | 'budget_alert' | 'goal_deadline' | 'goal_overdue' | 'recurring_today';
  title: string;
  message: string;
  severity: 'red' | 'yellow' | 'blue';
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useFinanceStore = create<FinanceStore>()(
  immer((set, get) => ({
    accounts: [],
    categories: [],
    subcategories: defaultSubcategories,
    transactions: [],
    recurringTransactions: [],
    budgets: [],
    goals: [],
    isLoading: false,

    loadData: async () => {
      set(s => { s.isLoading = true; });
      try {
        const [accounts, categories, transactions, budgets, goals, recurring] = await Promise.all([
          accountsApi.getAll(),
          categoriesApi.getAll(),
          transactionsApi.getAll(),
          budgetsApi.getAll(),
          goalsApi.getAll(),
          recurringApi.getAll(),
        ]);
        set(s => {
          s.accounts = accounts.map(normalizeAccount);
          s.categories = categories;
          s.transactions = transactions.map(normalizeTransaction);
          s.budgets = budgets;
          s.goals = goals.map(normalizeGoal);
          s.recurringTransactions = recurring.map(normalizeRecurring);
          s.isLoading = false;
        });
      } catch (e) {
        console.error('Failed to load data from API:', e);
        set(s => { s.isLoading = false; });
      }
    },

    // ── Accounts ────────────────────────────────────────────────────────────

    addAccount: async (acc) => {
      const created = await accountsApi.create({ ...acc, id: uuidv4() });
      set(s => { s.accounts.push(normalizeAccount(created)); });
    },

    updateAccount: async (id, updates) => {
      const updated = await accountsApi.update(id, updates);
      set(s => {
        const i = s.accounts.findIndex(a => a.id === id);
        if (i !== -1) s.accounts[i] = normalizeAccount(updated);
      });
    },

    deleteAccount: async (id) => {
      await accountsApi.remove(id);
      set(s => { s.accounts = s.accounts.filter(a => a.id !== id); });
    },

    // ── Categories ──────────────────────────────────────────────────────────

    addCategory: async (cat) => {
      const created = await categoriesApi.create({ ...cat, id: uuidv4(), isDefault: false });
      set(s => { s.categories.push(created); });
    },

    updateCategory: async (id, updates) => {
      const updated = await categoriesApi.update(id, updates);
      set(s => {
        const i = s.categories.findIndex(c => c.id === id);
        if (i !== -1) s.categories[i] = updated;
      });
    },

    deleteCategory: async (id) => {
      await categoriesApi.remove(id);
      set(s => { s.categories = s.categories.filter(c => c.id !== id); });
    },

    // ── Subcategories (in-memory only) ──────────────────────────────────────

    addSubcategory: (sub) => set(s => {
      s.subcategories.push({ ...sub, id: uuidv4() });
    }),

    deleteSubcategory: (id) => set(s => {
      s.subcategories = s.subcategories.filter(s => s.id !== id);
    }),

    // ── Transactions ────────────────────────────────────────────────────────

    addTransaction: async (tx) => {
      const body = {
        ...tx,
        id: uuidv4(),
        tags: JSON.stringify(tx.tags ?? []),
      };
      const created = await transactionsApi.create(body as Parameters<typeof transactionsApi.create>[0]);
      set(s => { s.transactions.push(normalizeTransaction(created)); });
    },

    updateTransaction: async (id, updates) => {
      const body = {
        ...updates,
        ...(updates.tags !== undefined ? { tags: JSON.stringify(updates.tags) } : {}),
      };
      const updated = await transactionsApi.update(id, body as Parameters<typeof transactionsApi.update>[1]);
      set(s => {
        const i = s.transactions.findIndex(t => t.id === id);
        if (i !== -1) s.transactions[i] = normalizeTransaction(updated);
      });
    },

    deleteTransaction: async (id) => {
      await transactionsApi.remove(id);
      set(s => { s.transactions = s.transactions.filter(t => t.id !== id); });
    },

    bulkDeleteTransactions: async (ids) => {
      await transactionsApi.bulkRemove(ids);
      set(s => { s.transactions = s.transactions.filter(t => !ids.includes(t.id)); });
    },

    // ── Recurring ───────────────────────────────────────────────────────────

    addRecurring: async (r) => {
      const created = await recurringApi.create(r);
      set(s => { s.recurringTransactions.push(normalizeRecurring(created)); });
    },

    updateRecurring: async (id, updates) => {
      const updated = await recurringApi.update(id, updates);
      set(s => {
        const i = s.recurringTransactions.findIndex(r => r.id === id);
        if (i !== -1) s.recurringTransactions[i] = normalizeRecurring(updated);
      });
    },

    deleteRecurring: async (id) => {
      await recurringApi.remove(id);
      set(s => { s.recurringTransactions = s.recurringTransactions.filter(r => r.id !== id); });
    },

    processRecurring: async () => {
      await recurringApi.process();
      // Reload transactions and recurring from API after processing
      const [transactions, recurring] = await Promise.all([
        transactionsApi.getAll(),
        recurringApi.getAll(),
      ]);
      set(s => {
        s.transactions = transactions.map(normalizeTransaction);
        s.recurringTransactions = recurring.map(normalizeRecurring);
      });
    },

    // ── Budgets ─────────────────────────────────────────────────────────────

    setBudget: async (categoryId, month, year, amount, alertThreshold = 80) => {
      const existing = get().budgets.find(b => b.categoryId === categoryId && b.month === month && b.year === year);
      if (existing) {
        const updated = await budgetsApi.update(existing.id, { amount, alertThreshold });
        set(s => {
          const i = s.budgets.findIndex(b => b.id === existing.id);
          if (i !== -1) s.budgets[i] = updated;
        });
      } else {
        const created = await budgetsApi.create({ categoryId, month, year, amount, alertThreshold });
        set(s => { s.budgets.push(created); });
      }
    },

    deleteBudget: async (id) => {
      await budgetsApi.remove(id);
      set(s => { s.budgets = s.budgets.filter(b => b.id !== id); });
    },

    // ── Goals ───────────────────────────────────────────────────────────────

    addGoal: async (goal) => {
      const created = await goalsApi.create(goal);
      set(s => { s.goals.push(normalizeGoal(created)); });
    },

    updateGoal: async (id, updates) => {
      const updated = await goalsApi.update(id, updates);
      set(s => {
        const i = s.goals.findIndex(g => g.id === id);
        if (i !== -1) s.goals[i] = normalizeGoal(updated);
      });
    },

    deleteGoal: async (id) => {
      await goalsApi.remove(id);
      set(s => { s.goals = s.goals.filter(g => g.id !== id); });
    },

    addToGoal: async (id, amount) => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const updated = await goalsApi.addContribution(id, amount, today);
      set(s => {
        const i = s.goals.findIndex(g => g.id === id);
        if (i !== -1) s.goals[i] = normalizeGoal(updated);
      });
    },

    // ── Category order ──────────────────────────────────────────────────────

    reorderCategories: async (ids) => {
      await categoriesApi.reorder(ids);
      set(s => {
        const ordered = ids
          .map(id => s.categories.find(c => c.id === id))
          .filter(Boolean) as Category[];
        const rest = s.categories.filter(c => !ids.includes(c.id));
        s.categories = [...ordered, ...rest];
      });
    },

    // ── Selectors ───────────────────────────────────────────────────────────

    getAccountBalance: (accountId) => {
      const { accounts, transactions } = get();
      const account = accounts.find(a => a.id === accountId);
      if (!account) return 0;
      let balance = account.initialBalance;
      transactions.forEach(tx => {
        if (tx.accountId === accountId) {
          if (tx.type === 'income') balance += tx.amount;
          else if (tx.type === 'expense') balance -= tx.amount;
          else if (tx.type === 'transfer') balance -= tx.amount;
        }
        if (tx.toAccountId === accountId && tx.type === 'transfer') {
          balance += tx.amount;
        }
      });
      return balance;
    },

    getTotalBalance: () => {
      const { accounts } = get();
      return accounts.filter(a => !a.isArchived).reduce((sum, a) => sum + get().getAccountBalance(a.id), 0);
    },

    getMonthlyStats: (month, year) => {
      const { transactions } = get();
      let income = 0, expense = 0;
      transactions.forEach(tx => {
        const d = parseISO(tx.date);
        if (d.getMonth() + 1 === month && d.getFullYear() === year) {
          if (tx.type === 'income') income += tx.amount;
          else if (tx.type === 'expense') expense += tx.amount;
        }
      });
      return { income, expense, net: income - expense };
    },

    getCategorySpending: (month, year) => {
      const { transactions } = get();
      const result: Record<string, number> = {};
      transactions.forEach(tx => {
        if (tx.type !== 'expense') return;
        const d = parseISO(tx.date);
        if (d.getMonth() + 1 !== month || d.getFullYear() !== year) return;
        result[tx.categoryId] = (result[tx.categoryId] || 0) + tx.amount;
      });
      return result;
    },

    getBudgetUsage: (categoryId, month, year) => {
      const { budgets } = get();
      const budget = budgets.find(b => b.categoryId === categoryId && b.month === month && b.year === year);
      const spending = get().getCategorySpending(month, year);
      const spent = spending[categoryId] || 0;
      const budgetAmount = budget?.amount || 0;
      return {
        budget: budgetAmount,
        spent,
        percentage: budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 0,
      };
    },

    getAppNotifications: () => {
      const { budgets, goals, recurringTransactions, categories } = get();
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const notifications: AppNotification[] = [];

      budgets.filter(b => b.month === month && b.year === year).forEach(b => {
        const { spent, percentage } = get().getBudgetUsage(b.categoryId, month, year);
        const cat = categories.find(c => c.id === b.categoryId);
        const name = cat?.name || 'Категория';
        if (percentage >= 100) {
          notifications.push({
            id: `budget-over-${b.id}`,
            type: 'budget_over',
            title: `Бюджет превышен: ${name}`,
            message: `Потрачено ${Math.round(spent)} ₽ из ${b.amount} ₽`,
            severity: 'red',
          });
        } else if (percentage >= b.alertThreshold) {
          notifications.push({
            id: `budget-alert-${b.id}`,
            type: 'budget_alert',
            title: `Бюджет на исходе: ${name}`,
            message: `Использовано ${percentage}% (${Math.round(spent)} из ${b.amount} ₽)`,
            severity: 'yellow',
          });
        }
      });

      goals.filter(g => !g.isCompleted && g.deadline).forEach(g => {
        const deadline = parseISO(g.deadline!);
        const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          notifications.push({
            id: `goal-overdue-${g.id}`,
            type: 'goal_overdue',
            title: `Дедлайн просрочен: ${g.name}`,
            message: `Срок был ${format(deadline, 'dd.MM.yyyy')}`,
            severity: 'red',
          });
        } else if (diffDays <= 7) {
          notifications.push({
            id: `goal-deadline-${g.id}`,
            type: 'goal_deadline',
            title: `Дедлайн цели: ${g.name}`,
            message: `Осталось ${diffDays} дн. до ${format(deadline, 'dd.MM.yyyy')}`,
            severity: 'yellow',
          });
        }
      });

      const todayStr = format(now, 'yyyy-MM-dd');
      const tomorrowStr = format(addDays(now, 1), 'yyyy-MM-dd');
      recurringTransactions
        .filter(r => r.isActive && (r.nextDate === todayStr || r.nextDate === tomorrowStr))
        .forEach(r => {
          notifications.push({
            id: `recurring-${r.id}`,
            type: 'recurring_today',
            title: r.nextDate === todayStr ? `Платёж сегодня: ${r.name}` : `Платёж завтра: ${r.name}`,
            message: `${r.amount.toLocaleString('ru-RU')} ₽`,
            severity: 'blue',
          });
        });

      return notifications;
    },

    getTagStats: (startDate, endDate) => {
      const { transactions } = get();
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      const tagMap: Record<string, { amount: number; count: number }> = {};
      transactions.forEach(tx => {
        if (tx.type !== 'expense') return;
        const d = parseISO(tx.date);
        if (isBefore(d, start) || isBefore(end, d)) return;
        (tx.tags || []).forEach(tag => {
          if (!tagMap[tag]) tagMap[tag] = { amount: 0, count: 0 };
          tagMap[tag].amount += tx.amount;
          tagMap[tag].count += 1;
        });
      });
      return Object.entries(tagMap)
        .map(([tag, s]) => ({ tag, ...s }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);
    },

  }))
);
