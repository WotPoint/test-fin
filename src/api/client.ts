import type { Account, Category, Subcategory, Transaction, Budget, Goal, RecurringTransaction } from '../types';

const BASE_URL = '/api';

function getToken(): string | null {
  return localStorage.getItem('fintrack_token');
}

function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...(options?.headers as Record<string, string> | undefined),
    },
    ...options,
  });

  if (res.status === 401) {
    localStorage.removeItem('fintrack_token');
    window.dispatchEvent(new Event('fintrack:auth-expired'));
    throw new Error('Сессия истекла. Войдите снова.');
  }

  if (!res.ok) {
    const text = await res.text();
    let message = `API error ${res.status}`;
    try {
      const json = JSON.parse(text);
      if (json.error) message = json.error;
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
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
    return api.get<{ data: Transaction[]; total: number }>(`/transactions${qs}`);
  },
  create: (data: Omit<Transaction, 'createdAt'> & { tags?: string }) =>
    api.post<Transaction>('/transactions', data),
  update: (id: string, data: Partial<Transaction> & { tags?: string }) =>
    api.put<Transaction>(`/transactions/${id}`, data),
  remove: (id: string) => api.delete(`/transactions/${id}`),
  bulkRemove: (ids: string[]) => api.delete('/transactions', { ids }),
  importFile: async (file: File): Promise<{ created: number; skipped: number }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/transactions/import', {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
      },
      body: formData,
    });
    if (res.status === 401) {
      localStorage.removeItem('fintrack_token');
      window.dispatchEvent(new Event('fintrack:auth-expired'));
      throw new Error('Сессия истекла. Войдите снова.');
    }
    if (!res.ok) {
      const text = await res.text();
      let message = `API error ${res.status}`;
      try {
        const json = JSON.parse(text);
        if (json.error) message = json.error;
      } catch {
        if (text) message = text;
      }
      throw new Error(message);
    }
    return res.json();
  },
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

export const subcategoriesApi = {
  getAll: () => api.get<Subcategory[]>('/subcategories'),
  create: (data: Omit<Subcategory, 'id'> & { id?: string }) =>
    api.post<Subcategory>('/subcategories', data),
  update: (id: string, data: Partial<Subcategory>) =>
    api.put<Subcategory>(`/subcategories/${id}`, data),
  remove: (id: string) => api.delete(`/subcategories/${id}`),
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
