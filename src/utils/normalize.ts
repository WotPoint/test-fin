import { format } from 'date-fns';
import type { Transaction, Account, Goal, GoalContribution, RecurringTransaction } from '../types';

export function fmtDate(val: string | Date | null | undefined): string {
  if (!val) return '';
  return format(new Date(val as string), 'yyyy-MM-dd');
}

export function parseTags(val: unknown): string[] {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return []; }
  }
  return [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeTransaction(tx: any): Transaction {
  return {
    ...tx,
    date: fmtDate(tx.date),
    tags: parseTags(tx.tags),
    categoryId: tx.categoryId ?? '',
    createdAt: tx.createdAt ? new Date(tx.createdAt).toISOString() : new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeAccount(a: any): Account {
  return { ...a, createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : new Date().toISOString() };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeGoal(g: any): Goal {
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
export function normalizeRecurring(r: any): RecurringTransaction {
  return {
    ...r,
    startDate: fmtDate(r.startDate),
    nextDate: fmtDate(r.nextDate),
    endDate: r.endDate ? fmtDate(r.endDate) : undefined,
    lastProcessedDate: r.lastProcessedDate ? fmtDate(r.lastProcessedDate) : undefined,
  };
}
