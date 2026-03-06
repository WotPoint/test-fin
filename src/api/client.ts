import type { Account, Category, Transaction, Budget, Goal, RecurringTransaction } from '../types';

const BASE_URL = 'http://localhost:3001/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`API error ${res.status}: ${error}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T = void>(path: string, body?: unknown) =>
    request<T>(path, { method: 'DELETE', ...(body ? { body: JSON.stringify(body) } : {}) }),
};

export const accountsApi = {
  getAll: () => api.get<Account[]>('/accounts'),
  create: (data: Omit<Account, 'createdAt'>) =>
    api.post<Account>('/accounts', data),
  update: (id: string, data: Partial<Account>) =>
    api.put<Account>(`/accounts/${id}`, data),
  remove: (id: string) => api.delete(`/accounts/${id}`),
};

export const transactionsApi = {
  getAll: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get<Transaction[]>(`/transactions${qs}`);
  },
  create: (data: Omit<Transaction, 'createdAt'> & { tags?: string }) =>
    api.post<Transaction>('/transactions', data),
  update: (id: string, data: Partial<Transaction> & { tags?: string }) =>
    api.put<Transaction>(`/transactions/${id}`, data),
  remove: (id: string) => api.delete(`/transactions/${id}`),
  bulkRemove: (ids: string[]) => api.delete('/transactions', { ids }),
};

export const categoriesApi = {
  getAll: () => api.get<Category[]>('/categories'),
  create: (data: Omit<Category, 'id'> & { id?: string }) =>
    api.post<Category>('/categories', data),
  update: (id: string, data: Partial<Category>) =>
    api.put<Category>(`/categories/${id}`, data),
  reorder: (ids: string[]) => api.put('/categories/reorder', { ids }),
  remove: (id: string) => api.delete(`/categories/${id}`),
};

export const budgetsApi = {
  getAll: (month?: number, year?: number) => {
    const params = new URLSearchParams();
    if (month !== undefined) params.set('month', String(month));
    if (year !== undefined) params.set('year', String(year));
    return api.get<Budget[]>(`/budgets?${params}`);
  },
  create: (data: Omit<Budget, 'id'>) =>
    api.post<Budget>('/budgets', data),
  update: (id: string, data: Partial<Budget>) =>
    api.put<Budget>(`/budgets/${id}`, data),
  remove: (id: string) => api.delete(`/budgets/${id}`),
};

export const goalsApi = {
  getAll: () => api.get<Goal[]>('/goals'),
  create: (data: Omit<Goal, 'id' | 'createdAt' | 'contributions'>) =>
    api.post<Goal>('/goals', data),
  update: (id: string, data: Partial<Goal>) =>
    api.put<Goal>(`/goals/${id}`, data),
  remove: (id: string) => api.delete(`/goals/${id}`),
  addContribution: (id: string, amount: number, date: string) =>
    api.post<Goal>(`/goals/${id}/contributions`, { amount, date }),
  removeContribution: (goalId: string, contributionId: string) =>
    api.delete<Goal>(`/goals/${goalId}/contributions/${contributionId}`),
};

export const recurringApi = {
  getAll: () => api.get<RecurringTransaction[]>('/recurring'),
  create: (data: Omit<RecurringTransaction, 'id'>) =>
    api.post<RecurringTransaction>('/recurring', data),
  update: (id: string, data: Partial<RecurringTransaction>) =>
    api.put<RecurringTransaction>(`/recurring/${id}`, data),
  remove: (id: string) => api.delete(`/recurring/${id}`),
  process: () => api.post<{ processed: number; created: number }>('/recurring/process', {}),
};
