import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO, isBefore, isEqual, startOfDay, addDays, addWeeks, addMonths, addQuarters, addYears } from 'date-fns';
import type {
  Account, Category, Subcategory, Transaction, RecurringTransaction,
  Budget, Goal, Currency, AccountType, RecurringFrequency, TransactionType
} from '../types';
import {
  defaultAccounts, defaultCategories, defaultSubcategories,
  sampleTransactions, defaultGoals, defaultRecurring
} from './initialData';

interface FinanceStore {
  accounts: Account[];
  categories: Category[];
  subcategories: Subcategory[];
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
  budgets: Budget[];
  goals: Goal[];

  // Account actions
  addAccount: (acc: Omit<Account, 'id' | 'createdAt'>) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  deleteAccount: (id: string) => void;

  // Category actions
  addCategory: (cat: Omit<Category, 'id' | 'isDefault'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  // Subcategory actions
  addSubcategory: (sub: Omit<Subcategory, 'id'>) => void;
  deleteSubcategory: (id: string) => void;

  // Transaction actions
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;

  // Recurring actions
  addRecurring: (r: Omit<RecurringTransaction, 'id'>) => void;
  updateRecurring: (id: string, updates: Partial<RecurringTransaction>) => void;
  deleteRecurring: (id: string) => void;
  processRecurring: () => void;

  // Budget actions
  setBudget: (categoryId: string, month: number, year: number, amount: number, alertThreshold?: number) => void;
  deleteBudget: (id: string) => void;

  // Goal actions
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'isCompleted'>) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  addToGoal: (id: string, amount: number) => void;

  // Selectors
  getAccountBalance: (accountId: string) => number;
  getTotalBalance: () => number;
  getMonthlyStats: (month: number, year: number) => { income: number; expense: number; net: number };
  getCategorySpending: (month: number, year: number) => Record<string, number>;
  getBudgetUsage: (categoryId: string, month: number, year: number) => { budget: number; spent: number; percentage: number };
}

const nextDate = (date: string, freq: RecurringFrequency): string => {
  const d = parseISO(date);
  switch (freq) {
    case 'daily': return format(addDays(d, 1), 'yyyy-MM-dd');
    case 'weekly': return format(addWeeks(d, 1), 'yyyy-MM-dd');
    case 'monthly': return format(addMonths(d, 1), 'yyyy-MM-dd');
    case 'quarterly': return format(addQuarters(d, 1), 'yyyy-MM-dd');
    case 'yearly': return format(addYears(d, 1), 'yyyy-MM-dd');
  }
};

export const useFinanceStore = create<FinanceStore>()(
  persist(
    immer((set, get) => ({
      accounts: defaultAccounts,
      categories: defaultCategories,
      subcategories: defaultSubcategories,
      transactions: sampleTransactions,
      recurringTransactions: defaultRecurring,
      budgets: [],
      goals: defaultGoals,

      addAccount: (acc) => set((s) => {
        s.accounts.push({ ...acc, id: uuidv4(), createdAt: new Date().toISOString() });
      }),
      updateAccount: (id, updates) => set((s) => {
        const i = s.accounts.findIndex(a => a.id === id);
        if (i !== -1) Object.assign(s.accounts[i], updates);
      }),
      deleteAccount: (id) => set((s) => {
        s.accounts = s.accounts.filter(a => a.id !== id);
      }),

      addCategory: (cat) => set((s) => {
        s.categories.push({ ...cat, id: uuidv4(), isDefault: false });
      }),
      updateCategory: (id, updates) => set((s) => {
        const i = s.categories.findIndex(c => c.id === id);
        if (i !== -1) Object.assign(s.categories[i], updates);
      }),
      deleteCategory: (id) => set((s) => {
        s.categories = s.categories.filter(c => c.id !== id);
      }),

      addSubcategory: (sub) => set((s) => {
        s.subcategories.push({ ...sub, id: uuidv4() });
      }),
      deleteSubcategory: (id) => set((s) => {
        s.subcategories = s.subcategories.filter(s => s.id !== id);
      }),

      addTransaction: (tx) => set((s) => {
        s.transactions.push({ ...tx, id: uuidv4(), createdAt: new Date().toISOString() });
      }),
      updateTransaction: (id, updates) => set((s) => {
        const i = s.transactions.findIndex(t => t.id === id);
        if (i !== -1) Object.assign(s.transactions[i], updates);
      }),
      deleteTransaction: (id) => set((s) => {
        s.transactions = s.transactions.filter(t => t.id !== id);
      }),

      addRecurring: (r) => set((s) => {
        s.recurringTransactions.push({ ...r, id: uuidv4() });
      }),
      updateRecurring: (id, updates) => set((s) => {
        const i = s.recurringTransactions.findIndex(r => r.id === id);
        if (i !== -1) Object.assign(s.recurringTransactions[i], updates);
      }),
      deleteRecurring: (id) => set((s) => {
        s.recurringTransactions = s.recurringTransactions.filter(r => r.id !== id);
      }),
      processRecurring: () => set((s) => {
        const today = startOfDay(new Date());
        s.recurringTransactions.forEach((r) => {
          if (!r.isActive) return;
          let nd = parseISO(r.nextDate);
          while (isBefore(nd, today) || isEqual(nd, today)) {
            s.transactions.push({
              id: uuidv4(),
              type: r.type,
              amount: r.amount,
              categoryId: r.categoryId,
              subcategoryId: r.subcategoryId,
              accountId: r.accountId,
              toAccountId: r.toAccountId,
              date: format(nd, 'yyyy-MM-dd'),
              comment: r.name,
              recurringId: r.id,
              createdAt: new Date().toISOString(),
            });
            r.lastProcessedDate = format(nd, 'yyyy-MM-dd');
            nd = parseISO(nextDate(format(nd, 'yyyy-MM-dd'), r.frequency));
            r.nextDate = format(nd, 'yyyy-MM-dd');
            if (r.endDate && isBefore(parseISO(r.endDate), nd)) {
              r.isActive = false;
              break;
            }
          }
        });
      }),

      setBudget: (categoryId, month, year, amount, alertThreshold = 80) => set((s) => {
        const i = s.budgets.findIndex(b => b.categoryId === categoryId && b.month === month && b.year === year);
        if (i !== -1) {
          s.budgets[i].amount = amount;
          s.budgets[i].alertThreshold = alertThreshold;
        } else {
          s.budgets.push({ id: uuidv4(), categoryId, month, year, amount, alertThreshold });
        }
      }),
      deleteBudget: (id) => set((s) => {
        s.budgets = s.budgets.filter(b => b.id !== id);
      }),

      addGoal: (goal) => set((s) => {
        s.goals.push({ ...goal, id: uuidv4(), createdAt: new Date().toISOString(), isCompleted: false });
      }),
      updateGoal: (id, updates) => set((s) => {
        const i = s.goals.findIndex(g => g.id === id);
        if (i !== -1) Object.assign(s.goals[i], updates);
      }),
      deleteGoal: (id) => set((s) => {
        s.goals = s.goals.filter(g => g.id !== id);
      }),
      addToGoal: (id, amount) => set((s) => {
        const g = s.goals.find(g => g.id === id);
        if (g) {
          g.currentAmount = Math.min(g.currentAmount + amount, g.targetAmount);
          if (g.currentAmount >= g.targetAmount) g.isCompleted = true;
        }
      }),

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
    })),
    {
      name: 'fintrack-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
