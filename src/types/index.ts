export type TransactionType = 'income' | 'expense' | 'transfer';

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export type AccountType = 'cash' | 'card' | 'ewallet' | 'savings' | 'investment';

export type Currency = 'RUB' | 'USD' | 'EUR' | 'GBP' | 'CNY';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  initialBalance: number;
  color: string;
  icon: string;
  isArchived: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
  parentId?: string;
  isDefault: boolean;
  isArchived: boolean;
}

export interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  subcategoryId?: string;
  accountId: string;
  toAccountId?: string; // for transfers
  date: string;
  comment?: string;
  receiptPhoto?: string; // base64
  tags?: string[];
  recurringId?: string;
  createdAt: string;
}

export interface RecurringTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  subcategoryId?: string;
  accountId: string;
  toAccountId?: string;
  comment?: string;
  frequency: RecurringFrequency;
  startDate: string;
  endDate?: string;
  nextDate: string;
  lastProcessedDate?: string;
  isActive: boolean;
  name: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  month: number; // 1-12
  year: number;
  alertThreshold: number; // percentage 0-100
}

export interface Goal {
  id: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  icon: string;
  color: string;
  isCompleted: boolean;
  createdAt: string;
}

export interface FinanceState {
  accounts: Account[];
  categories: Category[];
  subcategories: Subcategory[];
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
  budgets: Budget[];
  goals: Goal[];
}

export interface MonthlyStats {
  income: number;
  expense: number;
  net: number;
  byCategory: Record<string, number>;
}

export interface DailyBalance {
  date: string;
  balance: number;
  income: number;
  expense: number;
}
