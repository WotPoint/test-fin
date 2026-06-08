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

export function normalizeTransaction(tx: unknown): Transaction {
  const data = tx as Record<string, unknown>;
  return {
    ...(data as unknown as Transaction),
    date: fmtDate(data.date as string | Date | null | undefined),
    tags: parseTags(data.tags),
    categoryId: (data.categoryId as string | undefined) ?? '',
    createdAt: data.createdAt
      ? new Date(data.createdAt as string | Date).toISOString()
      : new Date().toISOString(),
  };
}

export function normalizeAccount(a: unknown): Account {
  const data = a as Record<string, unknown>;
  return {
    ...(data as unknown as Account),
    createdAt: data.createdAt
      ? new Date(data.createdAt as string | Date).toISOString()
      : new Date().toISOString(),
  };
}

export function normalizeGoal(g: unknown): Goal {
  const data = g as Record<string, unknown>;
  const contributions = (data.contributions ?? []) as Array<GoalContribution & { date: string }>;
  return {
    ...(data as unknown as Goal),
    deadline: data.deadline ? fmtDate(data.deadline as string | Date | null | undefined) : undefined,
    createdAt: data.createdAt
      ? new Date(data.createdAt as string | Date).toISOString()
      : new Date().toISOString(),
    contributions: contributions.map(c => ({
      ...c,
      date: fmtDate(c.date as string | Date | null | undefined),
    })),
  };
}

export function normalizeRecurring(r: unknown): RecurringTransaction {
  const data = r as Record<string, unknown>;
  return {
    ...(data as unknown as RecurringTransaction),
    startDate: fmtDate(data.startDate as string | Date | null | undefined),
    nextDate: fmtDate(data.nextDate as string | Date | null | undefined),
    endDate: data.endDate ? fmtDate(data.endDate as string | Date | null | undefined) : undefined,
    lastProcessedDate: data.lastProcessedDate
      ? fmtDate(data.lastProcessedDate as string | Date | null | undefined)
      : undefined,
  };
}
