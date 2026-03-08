import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { format, addDays } from 'date-fns';
import { useFinanceStore } from '../store/useFinanceStore';
import type { Account, Transaction, Budget, Goal, RecurringTransaction, Category } from '../types';

// ─── Фабрики тестовых данных ──────────────────────────────────────────────────

const makeAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 'acc-1',
  name: 'Карта',
  type: 'card',
  currency: 'RUB',
  initialBalance: 10000,
  color: '#3b82f6',
  icon: 'credit-card',
  isArchived: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

const makeTx = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 'tx-1',
  type: 'expense',
  amount: 500,
  categoryId: 'cat-1',
  accountId: 'acc-1',
  date: '2024-03-15',
  createdAt: '2024-03-15T00:00:00.000Z',
  ...overrides,
});

const makeBudget = (overrides: Partial<Budget> = {}): Budget => ({
  id: 'bud-1',
  categoryId: 'cat-1',
  amount: 5000,
  month: 3,
  year: 2024,
  alertThreshold: 80,
  ...overrides,
});

const makeGoal = (overrides: Partial<Goal> = {}): Goal => ({
  id: 'goal-1',
  name: 'Отпуск',
  targetAmount: 100000,
  currentAmount: 30000,
  icon: '✈️',
  color: '#3b82f6',
  isCompleted: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

const makeRecurring = (overrides: Partial<RecurringTransaction> = {}): RecurringTransaction => ({
  id: 'rec-1',
  name: 'Подписка',
  type: 'expense',
  amount: 299,
  categoryId: 'cat-1',
  accountId: 'acc-1',
  frequency: 'monthly',
  startDate: '2024-01-01',
  nextDate: '2024-04-01',
  isActive: true,
  ...overrides,
});

const makeCategory = (overrides: Partial<Category> = {}): Category => ({
  id: 'cat-1',
  name: 'Транспорт',
  type: 'expense',
  color: '#f97316',
  icon: 'car',
  isDefault: false,
  isArchived: false,
  ...overrides,
});

const EMPTY_STATE = {
  accounts: [],
  categories: [],
  subcategories: [],
  transactions: [],
  transactionsTotal: 0,
  recurringTransactions: [],
  budgets: [],
  goals: [],
  isLoading: false,
};

beforeEach(() => {
  useFinanceStore.setState(EMPTY_STATE);
});

// ─── getAccountBalance ────────────────────────────────────────────────────────

describe('getAccountBalance', () => {
  it('несуществующий счёт → 0', () => {
    const { getAccountBalance } = useFinanceStore.getState();
    expect(getAccountBalance('no-such-id')).toBe(0);
  });

  it('без транзакций → initialBalance', () => {
    useFinanceStore.setState({ accounts: [makeAccount({ initialBalance: 10000 })] });
    expect(useFinanceStore.getState().getAccountBalance('acc-1')).toBe(10000);
  });

  it('initialBalance = 0', () => {
    useFinanceStore.setState({ accounts: [makeAccount({ initialBalance: 0 })] });
    expect(useFinanceStore.getState().getAccountBalance('acc-1')).toBe(0);
  });

  it('доход прибавляется к балансу', () => {
    useFinanceStore.setState({
      accounts: [makeAccount({ initialBalance: 1000 })],
      transactions: [makeTx({ type: 'income', amount: 500 })],
    });
    expect(useFinanceStore.getState().getAccountBalance('acc-1')).toBe(1500);
  });

  it('расход вычитается из баланса', () => {
    useFinanceStore.setState({
      accounts: [makeAccount({ initialBalance: 1000 })],
      transactions: [makeTx({ type: 'expense', amount: 300 })],
    });
    expect(useFinanceStore.getState().getAccountBalance('acc-1')).toBe(700);
  });

  it('перевод исходящий уменьшает баланс', () => {
    useFinanceStore.setState({
      accounts: [makeAccount({ initialBalance: 2000 })],
      transactions: [makeTx({ type: 'transfer', amount: 500, toAccountId: 'acc-2' })],
    });
    expect(useFinanceStore.getState().getAccountBalance('acc-1')).toBe(1500);
  });

  it('перевод входящий увеличивает баланс', () => {
    useFinanceStore.setState({
      accounts: [makeAccount({ id: 'acc-2', initialBalance: 0 })],
      transactions: [makeTx({ type: 'transfer', amount: 500, accountId: 'acc-1', toAccountId: 'acc-2' })],
    });
    expect(useFinanceStore.getState().getAccountBalance('acc-2')).toBe(500);
  });

  it('несколько транзакций суммируются', () => {
    useFinanceStore.setState({
      accounts: [makeAccount({ initialBalance: 5000 })],
      transactions: [
        makeTx({ id: 'tx-1', type: 'income', amount: 3000 }),
        makeTx({ id: 'tx-2', type: 'expense', amount: 1000 }),
        makeTx({ id: 'tx-3', type: 'expense', amount: 500 }),
      ],
    });
    expect(useFinanceStore.getState().getAccountBalance('acc-1')).toBe(6500);
  });

  it('транзакции других счётов не влияют на баланс', () => {
    useFinanceStore.setState({
      accounts: [makeAccount({ initialBalance: 1000 })],
      transactions: [makeTx({ accountId: 'acc-other', amount: 9999 })],
    });
    expect(useFinanceStore.getState().getAccountBalance('acc-1')).toBe(1000);
  });

  it('баланс может быть отрицательным', () => {
    useFinanceStore.setState({
      accounts: [makeAccount({ initialBalance: 100 })],
      transactions: [makeTx({ type: 'expense', amount: 500 })],
    });
    expect(useFinanceStore.getState().getAccountBalance('acc-1')).toBe(-400);
  });
});

// ─── getTotalBalance ──────────────────────────────────────────────────────────

describe('getTotalBalance', () => {
  it('нет счётов → 0', () => {
    expect(useFinanceStore.getState().getTotalBalance()).toBe(0);
  });

  it('один счёт без транзакций', () => {
    useFinanceStore.setState({ accounts: [makeAccount({ initialBalance: 5000 })] });
    expect(useFinanceStore.getState().getTotalBalance()).toBe(5000);
  });

  it('суммирует несколько активных счётов', () => {
    useFinanceStore.setState({
      accounts: [
        makeAccount({ id: 'acc-1', initialBalance: 3000 }),
        makeAccount({ id: 'acc-2', initialBalance: 7000 }),
      ],
    });
    expect(useFinanceStore.getState().getTotalBalance()).toBe(10000);
  });

  it('архивный счёт не включается в сумму', () => {
    useFinanceStore.setState({
      accounts: [
        makeAccount({ id: 'acc-1', initialBalance: 5000, isArchived: false }),
        makeAccount({ id: 'acc-2', initialBalance: 9999, isArchived: true }),
      ],
    });
    expect(useFinanceStore.getState().getTotalBalance()).toBe(5000);
  });

  it('все счета архивированы → 0', () => {
    useFinanceStore.setState({
      accounts: [makeAccount({ initialBalance: 99999, isArchived: true })],
    });
    expect(useFinanceStore.getState().getTotalBalance()).toBe(0);
  });
});

// ─── getMonthlyStats ──────────────────────────────────────────────────────────

describe('getMonthlyStats', () => {
  it('нет транзакций → нули', () => {
    const stats = useFinanceStore.getState().getMonthlyStats(3, 2024);
    expect(stats).toEqual({ income: 0, expense: 0, net: 0 });
  });

  it('транзакции другого месяца не учитываются', () => {
    useFinanceStore.setState({
      transactions: [makeTx({ date: '2024-02-15', type: 'expense', amount: 1000 })],
    });
    const stats = useFinanceStore.getState().getMonthlyStats(3, 2024);
    expect(stats).toEqual({ income: 0, expense: 0, net: 0 });
  });

  it('транзакции другого года не учитываются', () => {
    useFinanceStore.setState({
      transactions: [makeTx({ date: '2023-03-15', type: 'expense', amount: 1000 })],
    });
    const stats = useFinanceStore.getState().getMonthlyStats(3, 2024);
    expect(stats).toEqual({ income: 0, expense: 0, net: 0 });
  });

  it('доход суммируется', () => {
    useFinanceStore.setState({
      transactions: [
        makeTx({ id: 'tx-1', date: '2024-03-01', type: 'income', amount: 50000 }),
        makeTx({ id: 'tx-2', date: '2024-03-15', type: 'income', amount: 10000 }),
      ],
    });
    expect(useFinanceStore.getState().getMonthlyStats(3, 2024).income).toBe(60000);
  });

  it('расход суммируется', () => {
    useFinanceStore.setState({
      transactions: [
        makeTx({ id: 'tx-1', date: '2024-03-10', type: 'expense', amount: 2000 }),
        makeTx({ id: 'tx-2', date: '2024-03-20', type: 'expense', amount: 3000 }),
      ],
    });
    expect(useFinanceStore.getState().getMonthlyStats(3, 2024).expense).toBe(5000);
  });

  it('net = income - expense', () => {
    useFinanceStore.setState({
      transactions: [
        makeTx({ id: 'tx-1', date: '2024-03-01', type: 'income', amount: 10000 }),
        makeTx({ id: 'tx-2', date: '2024-03-10', type: 'expense', amount: 3000 }),
      ],
    });
    const stats = useFinanceStore.getState().getMonthlyStats(3, 2024);
    expect(stats.net).toBe(7000);
  });

  it('переводы не учитываются в статистике', () => {
    useFinanceStore.setState({
      transactions: [makeTx({ date: '2024-03-15', type: 'transfer', amount: 5000, toAccountId: 'acc-2' })],
    });
    const stats = useFinanceStore.getState().getMonthlyStats(3, 2024);
    expect(stats.income).toBe(0);
    expect(stats.expense).toBe(0);
  });

  it('net может быть отрицательным', () => {
    useFinanceStore.setState({
      transactions: [
        makeTx({ id: 'tx-1', date: '2024-03-01', type: 'income', amount: 1000 }),
        makeTx({ id: 'tx-2', date: '2024-03-10', type: 'expense', amount: 5000 }),
      ],
    });
    expect(useFinanceStore.getState().getMonthlyStats(3, 2024).net).toBe(-4000);
  });
});

// ─── getCategorySpending ──────────────────────────────────────────────────────

describe('getCategorySpending', () => {
  it('нет транзакций → пустой объект', () => {
    expect(useFinanceStore.getState().getCategorySpending(3, 2024)).toEqual({});
  });

  it('суммирует расходы по категории', () => {
    useFinanceStore.setState({
      transactions: [
        makeTx({ id: 'tx-1', date: '2024-03-10', type: 'expense', amount: 1000, categoryId: 'cat-1' }),
        makeTx({ id: 'tx-2', date: '2024-03-20', type: 'expense', amount: 500, categoryId: 'cat-1' }),
      ],
    });
    expect(useFinanceStore.getState().getCategorySpending(3, 2024)['cat-1']).toBe(1500);
  });

  it('несколько категорий разделяются', () => {
    useFinanceStore.setState({
      transactions: [
        makeTx({ id: 'tx-1', date: '2024-03-10', type: 'expense', amount: 1000, categoryId: 'cat-1' }),
        makeTx({ id: 'tx-2', date: '2024-03-10', type: 'expense', amount: 2000, categoryId: 'cat-2' }),
      ],
    });
    const spending = useFinanceStore.getState().getCategorySpending(3, 2024);
    expect(spending['cat-1']).toBe(1000);
    expect(spending['cat-2']).toBe(2000);
  });

  it('доходы не включаются', () => {
    useFinanceStore.setState({
      transactions: [makeTx({ date: '2024-03-10', type: 'income', amount: 50000, categoryId: 'cat-1' })],
    });
    expect(useFinanceStore.getState().getCategorySpending(3, 2024)).toEqual({});
  });

  it('переводы не включаются', () => {
    useFinanceStore.setState({
      transactions: [makeTx({ date: '2024-03-10', type: 'transfer', amount: 5000, categoryId: 'cat-1', toAccountId: 'acc-2' })],
    });
    expect(useFinanceStore.getState().getCategorySpending(3, 2024)).toEqual({});
  });

  it('другой месяц не учитывается', () => {
    useFinanceStore.setState({
      transactions: [makeTx({ date: '2024-02-10', type: 'expense', amount: 999, categoryId: 'cat-1' })],
    });
    expect(useFinanceStore.getState().getCategorySpending(3, 2024)).toEqual({});
  });
});

// ─── getBudgetUsage ───────────────────────────────────────────────────────────

describe('getBudgetUsage', () => {
  it('бюджет не задан → нули и 0%', () => {
    expect(useFinanceStore.getState().getBudgetUsage('cat-1', 3, 2024)).toEqual({
      budget: 0,
      spent: 0,
      percentage: 0,
    });
  });

  it('бюджет задан, расходов нет → 0%', () => {
    useFinanceStore.setState({ budgets: [makeBudget({ amount: 5000 })] });
    const usage = useFinanceStore.getState().getBudgetUsage('cat-1', 3, 2024);
    expect(usage.budget).toBe(5000);
    expect(usage.spent).toBe(0);
    expect(usage.percentage).toBe(0);
  });

  it('50% использования', () => {
    useFinanceStore.setState({
      budgets: [makeBudget({ amount: 10000 })],
      transactions: [makeTx({ date: '2024-03-15', type: 'expense', amount: 5000, categoryId: 'cat-1' })],
    });
    const usage = useFinanceStore.getState().getBudgetUsage('cat-1', 3, 2024);
    expect(usage.percentage).toBe(50);
    expect(usage.spent).toBe(5000);
  });

  it('100% использования', () => {
    useFinanceStore.setState({
      budgets: [makeBudget({ amount: 3000 })],
      transactions: [makeTx({ date: '2024-03-15', type: 'expense', amount: 3000, categoryId: 'cat-1' })],
    });
    expect(useFinanceStore.getState().getBudgetUsage('cat-1', 3, 2024).percentage).toBe(100);
  });

  it('превышение бюджета → больше 100%', () => {
    useFinanceStore.setState({
      budgets: [makeBudget({ amount: 2000 })],
      transactions: [makeTx({ date: '2024-03-15', type: 'expense', amount: 3000, categoryId: 'cat-1' })],
    });
    expect(useFinanceStore.getState().getBudgetUsage('cat-1', 3, 2024).percentage).toBe(150);
  });

  it('percentage округляется до целых', () => {
    useFinanceStore.setState({
      budgets: [makeBudget({ amount: 3000 })],
      transactions: [makeTx({ date: '2024-03-15', type: 'expense', amount: 1000, categoryId: 'cat-1' })],
    });
    const { percentage } = useFinanceStore.getState().getBudgetUsage('cat-1', 3, 2024);
    expect(Number.isInteger(percentage)).toBe(true);
  });

  it('другой месяц не влияет на процент', () => {
    useFinanceStore.setState({
      budgets: [makeBudget({ amount: 5000, month: 3 })],
      transactions: [makeTx({ date: '2024-02-15', type: 'expense', amount: 5000, categoryId: 'cat-1' })],
    });
    expect(useFinanceStore.getState().getBudgetUsage('cat-1', 3, 2024).spent).toBe(0);
  });
});

// ─── getTagStats ──────────────────────────────────────────────────────────────

describe('getTagStats', () => {
  it('нет транзакций → пустой массив', () => {
    expect(useFinanceStore.getState().getTagStats('2024-01-01', '2024-12-31')).toEqual([]);
  });

  it('доходы не включаются в статистику', () => {
    useFinanceStore.setState({
      transactions: [makeTx({ type: 'income', amount: 5000, tags: ['зарплата'], date: '2024-03-15' })],
    });
    expect(useFinanceStore.getState().getTagStats('2024-01-01', '2024-12-31')).toEqual([]);
  });

  it('расходы без тегов не включаются', () => {
    useFinanceStore.setState({
      transactions: [makeTx({ type: 'expense', amount: 500, tags: [], date: '2024-03-15' })],
    });
    expect(useFinanceStore.getState().getTagStats('2024-01-01', '2024-12-31')).toEqual([]);
  });

  it('суммирует сумму и считает количество по тегу', () => {
    useFinanceStore.setState({
      transactions: [
        makeTx({ id: 'tx-1', type: 'expense', amount: 200, tags: ['кафе'], date: '2024-03-10' }),
        makeTx({ id: 'tx-2', type: 'expense', amount: 300, tags: ['кафе'], date: '2024-03-15' }),
      ],
    });
    const stats = useFinanceStore.getState().getTagStats('2024-01-01', '2024-12-31');
    expect(stats).toHaveLength(1);
    expect(stats[0]).toEqual({ tag: 'кафе', amount: 500, count: 2 });
  });

  it('несколько тегов в одной транзакции обрабатываются отдельно', () => {
    useFinanceStore.setState({
      transactions: [makeTx({ type: 'expense', amount: 1000, tags: ['кафе', 'работа'], date: '2024-03-15' })],
    });
    const stats = useFinanceStore.getState().getTagStats('2024-01-01', '2024-12-31');
    expect(stats).toHaveLength(2);
    const tagNames = stats.map(s => s.tag);
    expect(tagNames).toContain('кафе');
    expect(tagNames).toContain('работа');
  });

  it('результат отсортирован по сумме убыванию', () => {
    useFinanceStore.setState({
      transactions: [
        makeTx({ id: 'tx-1', type: 'expense', amount: 100, tags: ['мелкий'], date: '2024-03-01' }),
        makeTx({ id: 'tx-2', type: 'expense', amount: 5000, tags: ['крупный'], date: '2024-03-01' }),
        makeTx({ id: 'tx-3', type: 'expense', amount: 1000, tags: ['средний'], date: '2024-03-01' }),
      ],
    });
    const stats = useFinanceStore.getState().getTagStats('2024-01-01', '2024-12-31');
    expect(stats[0].tag).toBe('крупный');
    expect(stats[1].tag).toBe('средний');
    expect(stats[2].tag).toBe('мелкий');
  });

  it('транзакции за пределами диапазона не включаются', () => {
    useFinanceStore.setState({
      transactions: [
        makeTx({ id: 'tx-1', type: 'expense', amount: 500, tags: ['кафе'], date: '2023-12-31' }),
        makeTx({ id: 'tx-2', type: 'expense', amount: 500, tags: ['кафе'], date: '2025-01-01' }),
      ],
    });
    expect(useFinanceStore.getState().getTagStats('2024-01-01', '2024-12-31')).toEqual([]);
  });

  it('транзакции на границах диапазона включаются', () => {
    useFinanceStore.setState({
      transactions: [
        makeTx({ id: 'tx-1', type: 'expense', amount: 200, tags: ['тег'], date: '2024-01-01' }),
        makeTx({ id: 'tx-2', type: 'expense', amount: 300, tags: ['тег'], date: '2024-12-31' }),
      ],
    });
    const stats = useFinanceStore.getState().getTagStats('2024-01-01', '2024-12-31');
    expect(stats[0].amount).toBe(500);
  });

  it('возвращает максимум 10 тегов', () => {
    const transactions = Array.from({ length: 15 }, (_, i) =>
      makeTx({ id: `tx-${i}`, type: 'expense', amount: i + 1, tags: [`тег-${i}`], date: '2024-03-01' })
    );
    useFinanceStore.setState({ transactions });
    const stats = useFinanceStore.getState().getTagStats('2024-01-01', '2024-12-31');
    expect(stats.length).toBeLessThanOrEqual(10);
  });
});

// ─── getAppNotifications ──────────────────────────────────────────────────────

describe('getAppNotifications', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const FIXED_NOW = new Date('2026-03-08T12:00:00.000Z');

  it('пустое состояние → нет уведомлений', () => {
    vi.setSystemTime(FIXED_NOW);
    expect(useFinanceStore.getState().getAppNotifications()).toEqual([]);
  });

  it('бюджет превышен (100%) → уведомление budget_over', () => {
    vi.setSystemTime(FIXED_NOW);
    useFinanceStore.setState({
      budgets: [makeBudget({ month: 3, year: 2026, amount: 2000 })],
      transactions: [makeTx({ date: '2026-03-05', type: 'expense', amount: 2500, categoryId: 'cat-1' })],
      categories: [makeCategory()],
    });
    const notes = useFinanceStore.getState().getAppNotifications();
    const over = notes.find(n => n.type === 'budget_over');
    expect(over).toBeDefined();
    expect(over?.severity).toBe('red');
  });

  it('бюджет на пороге — уведомление budget_alert', () => {
    vi.setSystemTime(FIXED_NOW);
    useFinanceStore.setState({
      budgets: [makeBudget({ month: 3, year: 2026, amount: 5000, alertThreshold: 80 })],
      transactions: [makeTx({ date: '2026-03-05', type: 'expense', amount: 4200, categoryId: 'cat-1' })],
      categories: [makeCategory()],
    });
    const notes = useFinanceStore.getState().getAppNotifications();
    const alert = notes.find(n => n.type === 'budget_alert');
    expect(alert).toBeDefined();
    expect(alert?.severity).toBe('yellow');
  });

  it('бюджет до порога — уведомлений нет', () => {
    vi.setSystemTime(FIXED_NOW);
    useFinanceStore.setState({
      budgets: [makeBudget({ month: 3, year: 2026, amount: 5000, alertThreshold: 80 })],
      transactions: [makeTx({ date: '2026-03-05', type: 'expense', amount: 1000, categoryId: 'cat-1' })],
    });
    const notes = useFinanceStore.getState().getAppNotifications();
    expect(notes.filter(n => n.type === 'budget_over' || n.type === 'budget_alert')).toHaveLength(0);
  });

  it('дедлайн цели просрочен → уведомление goal_overdue', () => {
    vi.setSystemTime(FIXED_NOW);
    useFinanceStore.setState({
      goals: [makeGoal({ deadline: '2026-02-01', isCompleted: false })],
    });
    const notes = useFinanceStore.getState().getAppNotifications();
    const overdue = notes.find(n => n.type === 'goal_overdue');
    expect(overdue).toBeDefined();
    expect(overdue?.severity).toBe('red');
  });

  it('дедлайн цели через 3 дня → уведомление goal_deadline', () => {
    vi.setSystemTime(FIXED_NOW);
    const deadline = format(addDays(FIXED_NOW, 3), 'yyyy-MM-dd');
    useFinanceStore.setState({
      goals: [makeGoal({ deadline, isCompleted: false })],
    });
    const notes = useFinanceStore.getState().getAppNotifications();
    const near = notes.find(n => n.type === 'goal_deadline');
    expect(near).toBeDefined();
    expect(near?.severity).toBe('yellow');
  });

  it('завершённая цель не генерирует уведомление', () => {
    vi.setSystemTime(FIXED_NOW);
    useFinanceStore.setState({
      goals: [makeGoal({ deadline: '2026-02-01', isCompleted: true })],
    });
    const notes = useFinanceStore.getState().getAppNotifications();
    expect(notes.filter(n => n.type === 'goal_overdue')).toHaveLength(0);
  });

  it('цель без дедлайна не генерирует уведомление', () => {
    vi.setSystemTime(FIXED_NOW);
    useFinanceStore.setState({
      goals: [makeGoal({ deadline: undefined, isCompleted: false })],
    });
    expect(useFinanceStore.getState().getAppNotifications()).toHaveLength(0);
  });

  it('платёж повторяющейся транзакции сегодня → уведомление recurring_today', () => {
    vi.setSystemTime(FIXED_NOW);
    const today = format(FIXED_NOW, 'yyyy-MM-dd');
    useFinanceStore.setState({
      recurringTransactions: [makeRecurring({ nextDate: today, isActive: true })],
    });
    const notes = useFinanceStore.getState().getAppNotifications();
    const note = notes.find(n => n.type === 'recurring_today');
    expect(note).toBeDefined();
    expect(note?.severity).toBe('blue');
    expect(note?.title).toContain('сегодня');
  });

  it('платёж повторяющейся транзакции завтра → уведомление с "завтра"', () => {
    vi.setSystemTime(FIXED_NOW);
    const tomorrow = format(addDays(FIXED_NOW, 1), 'yyyy-MM-dd');
    useFinanceStore.setState({
      recurringTransactions: [makeRecurring({ nextDate: tomorrow, isActive: true })],
    });
    const notes = useFinanceStore.getState().getAppNotifications();
    const note = notes.find(n => n.type === 'recurring_today');
    expect(note?.title).toContain('завтра');
  });

  it('неактивная повторяющаяся транзакция не генерирует уведомление', () => {
    vi.setSystemTime(FIXED_NOW);
    const today = format(FIXED_NOW, 'yyyy-MM-dd');
    useFinanceStore.setState({
      recurringTransactions: [makeRecurring({ nextDate: today, isActive: false })],
    });
    expect(useFinanceStore.getState().getAppNotifications().filter(n => n.type === 'recurring_today')).toHaveLength(0);
  });
});
