import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO, isBefore, addDays } from 'date-fns';
import type {
  Account, Category, Subcategory, Transaction, RecurringTransaction,
  Budget, Goal
} from '../types';
import {
  accountsApi, transactionsApi, categoriesApi, subcategoriesApi, budgetsApi, goalsApi, recurringApi
} from '../api/client';
import { normalizeTransaction, normalizeAccount, normalizeGoal, normalizeRecurring } from '../utils/normalize';
import toast from 'react-hot-toast';

// ─── Store interface ──────────────────────────────────────────────────────────

interface FinanceStore {
  accounts: Account[];
  categories: Category[];
  subcategories: Subcategory[];
  transactions: Transaction[];
  transactionsTotal: number;
  recurringTransactions: RecurringTransaction[];
  budgets: Budget[];
  goals: Goal[];
  isLoading: boolean;

  loadData: () => Promise<void>;
  loadMoreTransactions: () => Promise<void>;

  // Account actions
  addAccount: (acc: Omit<Account, 'id' | 'createdAt'>) => Promise<void>;
  updateAccount: (id: string, updates: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;

  // Category actions
  addCategory: (cat: Omit<Category, 'id' | 'isDefault'>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // Subcategory actions
  addSubcategory: (sub: Omit<Subcategory, 'id'>) => Promise<void>;
  deleteSubcategory: (id: string) => Promise<void>;

  // Transaction actions
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  bulkDeleteTransactions: (ids: string[]) => Promise<void>;
  importBankStatement: (file: File) => Promise<{ created: number; skipped: number }>;

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

function handleApiError(e: unknown, fallback: string): never {
  const msg = e instanceof Error ? e.message : fallback;
  toast.error(msg);
  throw e;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useFinanceStore = create<FinanceStore>()(
  immer((set, get) => ({
    accounts: [],
    categories: [],
    subcategories: [],
    transactions: [],
    transactionsTotal: 0,
    recurringTransactions: [],
    budgets: [],
    goals: [],
    isLoading: false,

    loadData: async () => {
      set(s => { s.isLoading = true; });
      try {
        const [accounts, categories, subcategories, txResult, budgets, goals, recurring] = await Promise.all([
          accountsApi.getAll(),
          categoriesApi.getAll(),
          subcategoriesApi.getAll(),
          transactionsApi.getAll({}),
          budgetsApi.getAll(),
          goalsApi.getAll(),
          recurringApi.getAll(),
        ]);
        set(s => {
          s.accounts = accounts.map(normalizeAccount);
          s.categories = categories;
          s.subcategories = subcategories;
          s.transactions = txResult.data.map(normalizeTransaction);
          s.transactionsTotal = txResult.total;
          s.budgets = budgets;
          s.goals = goals.map(normalizeGoal);
          s.recurringTransactions = recurring.map(normalizeRecurring);
          s.isLoading = false;
        });
      } catch (e) {
        console.error('Failed to load data from API:', e);
        set(s => { s.isLoading = false; });
        toast.error('Не удалось загрузить данные. Проверьте подключение.');
      }
    },

    loadMoreTransactions: async () => {
      try {
        const { transactions } = get();
        const txResult = await transactionsApi.getAll({
          limit: '100',
          offset: String(transactions.length),
        });
        set(s => {
          txResult.data.map(normalizeTransaction).forEach(tx => s.transactions.push(tx));
          s.transactionsTotal = txResult.total;
        });
      } catch (e) {
        handleApiError(e, 'Ошибка при загрузке транзакций');
      }
    },

    // ── Accounts ────────────────────────────────────────────────────────────

    addAccount: async (acc) => {
      try {
        const created = await accountsApi.create({ ...acc, id: uuidv4() });
        set(s => { s.accounts.push(normalizeAccount(created)); });
      } catch (e) {
        handleApiError(e, 'Ошибка при создании счёта');
      }
    },

    updateAccount: async (id, updates) => {
      try {
        const updated = await accountsApi.update(id, updates);
        set(s => {
          const i = s.accounts.findIndex(a => a.id === id);
          if (i !== -1) s.accounts[i] = normalizeAccount(updated);
        });
      } catch (e) {
        handleApiError(e, 'Ошибка при обновлении счёта');
      }
    },

    deleteAccount: async (id) => {
      try {
        await accountsApi.remove(id);
        set(s => { s.accounts = s.accounts.filter(a => a.id !== id); });
      } catch (e) {
        handleApiError(e, 'Ошибка при удалении счёта');
      }
    },

    // ── Categories ──────────────────────────────────────────────────────────

    addCategory: async (cat) => {
      try {
        const created = await categoriesApi.create({ ...cat, id: uuidv4(), isDefault: false });
        set(s => { s.categories.push(created); });
      } catch (e) {
        handleApiError(e, 'Ошибка при создании категории');
      }
    },

    updateCategory: async (id, updates) => {
      try {
        const updated = await categoriesApi.update(id, updates);
        set(s => {
          const i = s.categories.findIndex(c => c.id === id);
          if (i !== -1) s.categories[i] = updated;
        });
      } catch (e) {
        handleApiError(e, 'Ошибка при обновлении категории');
      }
    },

    deleteCategory: async (id) => {
      try {
        await categoriesApi.remove(id);
        set(s => { s.categories = s.categories.filter(c => c.id !== id); });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Ошибка удаления категории');
      }
    },

    // ── Subcategories ────────────────────────────────────────────────────────

    addSubcategory: async (sub) => {
      try {
        const created = await subcategoriesApi.create(sub);
        set(s => { s.subcategories.push(created); });
      } catch (e) {
        handleApiError(e, 'Ошибка при создании подкатегории');
      }
    },

    deleteSubcategory: async (id) => {
      try {
        await subcategoriesApi.remove(id);
        set(s => { s.subcategories = s.subcategories.filter(sc => sc.id !== id); });
      } catch (e) {
        handleApiError(e, 'Ошибка при удалении подкатегории');
      }
    },

    // ── Transactions ────────────────────────────────────────────────────────

    addTransaction: async (tx) => {
      try {
        const body = {
          ...tx,
          id: uuidv4(),
          tags: JSON.stringify(tx.tags ?? []),
        };
        const created = await transactionsApi.create(body as Parameters<typeof transactionsApi.create>[0]);
        set(s => { s.transactions.push(normalizeTransaction(created)); });
        // Refresh server-computed balances
        const accounts = await accountsApi.getAll();
        set(s => { s.accounts = accounts.map(normalizeAccount); });
      } catch (e) {
        handleApiError(e, 'Ошибка при создании транзакции');
      }
    },

    updateTransaction: async (id, updates) => {
      try {
        const body = {
          ...updates,
          ...(updates.tags !== undefined ? { tags: JSON.stringify(updates.tags) } : {}),
        };
        const updated = await transactionsApi.update(id, body as Parameters<typeof transactionsApi.update>[1]);
        set(s => {
          const i = s.transactions.findIndex(t => t.id === id);
          if (i !== -1) s.transactions[i] = normalizeTransaction(updated);
        });
        // Refresh server-computed balances
        const accounts = await accountsApi.getAll();
        set(s => { s.accounts = accounts.map(normalizeAccount); });
      } catch (e) {
        handleApiError(e, 'Ошибка при обновлении транзакции');
      }
    },

    deleteTransaction: async (id) => {
      try {
        await transactionsApi.remove(id);
        set(s => { s.transactions = s.transactions.filter(t => t.id !== id); });
        // Refresh server-computed balances
        const accounts = await accountsApi.getAll();
        set(s => { s.accounts = accounts.map(normalizeAccount); });
      } catch (e) {
        handleApiError(e, 'Ошибка при удалении транзакции');
      }
    },

    bulkDeleteTransactions: async (ids) => {
      try {
        await transactionsApi.bulkRemove(ids);
        set(s => { s.transactions = s.transactions.filter(t => !ids.includes(t.id)); });
        // Refresh server-computed balances
        const accounts = await accountsApi.getAll();
        set(s => { s.accounts = accounts.map(normalizeAccount); });
      } catch (e) {
        handleApiError(e, 'Ошибка при массовом удалении транзакций');
      }
    },

    importBankStatement: async (file) => {
      try {
        const result = await transactionsApi.importFile(file);
        await get().loadData();
        return result;
      } catch (e) {
        handleApiError(e, 'Ошибка при импорте выписки');
      }
    },

    // ── Recurring ───────────────────────────────────────────────────────────

    addRecurring: async (r) => {
      try {
        const created = await recurringApi.create(r);
        set(s => { s.recurringTransactions.push(normalizeRecurring(created)); });
      } catch (e) {
        handleApiError(e, 'Ошибка при создании регулярной транзакции');
      }
    },

    updateRecurring: async (id, updates) => {
      try {
        const updated = await recurringApi.update(id, updates);
        set(s => {
          const i = s.recurringTransactions.findIndex(r => r.id === id);
          if (i !== -1) s.recurringTransactions[i] = normalizeRecurring(updated);
        });
      } catch (e) {
        handleApiError(e, 'Ошибка при обновлении регулярной транзакции');
      }
    },

    deleteRecurring: async (id) => {
      try {
        await recurringApi.remove(id);
        set(s => { s.recurringTransactions = s.recurringTransactions.filter(r => r.id !== id); });
      } catch (e) {
        handleApiError(e, 'Ошибка при удалении регулярной транзакции');
      }
    },

    processRecurring: async () => {
      try {
        const result = await recurringApi.process();
        // Always update recurring rules (nextDate changes)
        const recurring = await recurringApi.getAll();
        set(s => { s.recurringTransactions = recurring.map(normalizeRecurring); });
        // Only reload transactions if new ones were actually created
        if (result.created > 0) {
          const txResult = await transactionsApi.getAll({});
          set(s => {
            s.transactions = txResult.data.map(normalizeTransaction);
            s.transactionsTotal = txResult.total;
          });
        }
      } catch (e) {
        handleApiError(e, 'Ошибка при обработке регулярных транзакций');
      }
    },

    // ── Budgets ─────────────────────────────────────────────────────────────

    setBudget: async (categoryId, month, year, amount, alertThreshold = 80) => {
      try {
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
      } catch (e) {
        handleApiError(e, 'Ошибка при установке бюджета');
      }
    },

    deleteBudget: async (id) => {
      try {
        await budgetsApi.remove(id);
        set(s => { s.budgets = s.budgets.filter(b => b.id !== id); });
      } catch (e) {
        handleApiError(e, 'Ошибка при удалении бюджета');
      }
    },

    // ── Goals ───────────────────────────────────────────────────────────────

    addGoal: async (goal) => {
      try {
        const created = await goalsApi.create({ ...goal, isCompleted: false });
        set(s => { s.goals.push(normalizeGoal(created)); });
      } catch (e) {
        handleApiError(e, 'Ошибка при создании цели');
      }
    },

    updateGoal: async (id, updates) => {
      try {
        const updated = await goalsApi.update(id, updates);
        set(s => {
          const i = s.goals.findIndex(g => g.id === id);
          if (i !== -1) s.goals[i] = normalizeGoal(updated);
        });
      } catch (e) {
        handleApiError(e, 'Ошибка при обновлении цели');
      }
    },

    deleteGoal: async (id) => {
      try {
        await goalsApi.remove(id);
        set(s => { s.goals = s.goals.filter(g => g.id !== id); });
      } catch (e) {
        handleApiError(e, 'Ошибка при удалении цели');
      }
    },

    addToGoal: async (id, amount) => {
      try {
        const today = format(new Date(), 'yyyy-MM-dd');
        const updated = await goalsApi.addContribution(id, amount, today);
        set(s => {
          const i = s.goals.findIndex(g => g.id === id);
          if (i !== -1) s.goals[i] = normalizeGoal(updated);
        });
      } catch (e) {
        handleApiError(e, 'Ошибка при пополнении цели');
      }
    },

    // ── Category order ──────────────────────────────────────────────────────

    reorderCategories: async (ids) => {
      try {
        await categoriesApi.reorder(ids);
        set(s => {
          const ordered = ids
            .map(id => s.categories.find(c => c.id === id))
            .filter(Boolean) as Category[];
          const rest = s.categories.filter(c => !ids.includes(c.id));
          s.categories = [...ordered, ...rest];
        });
      } catch (e) {
        handleApiError(e, 'Ошибка при изменении порядка категорий');
      }
    },

    // ── Selectors ───────────────────────────────────────────────────────────

    getAccountBalance: (accountId) => {
      const { accounts, transactions } = get();
      const account = accounts.find(a => a.id === accountId);
      if (!account) return 0;
      // Use server-computed balance when available (always correct, not limited by pagination)
      if (account.balance !== undefined) return account.balance;
      // Fallback: compute from local transactions (used in tests or offline mode)
      let bal = account.initialBalance;
      transactions.forEach(tx => {
        if (tx.accountId !== accountId) return;
        if (tx.type === 'income') bal += tx.amount;
        else if (tx.type === 'expense') bal -= tx.amount;
        else if (tx.type === 'transfer') bal -= tx.amount;
      });
      transactions.forEach(tx => {
        if (tx.toAccountId === accountId) bal += tx.amount;
      });
      return bal;
    },

    getTotalBalance: () => {
      const { accounts } = get();
      return accounts
        .filter(a => !a.isArchived)
        .reduce((s, a) => s + (a.balance ?? a.initialBalance), 0);
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
