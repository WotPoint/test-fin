import { describe, it, expect } from 'vitest';
import { fmtDate, parseTags, normalizeTransaction, normalizeAccount, normalizeGoal, normalizeRecurring } from '../utils/normalize';

// ─── fmtDate ──────────────────────────────────────────────────────────────────

describe('fmtDate', () => {
  describe('нормальные сценарии', () => {
    it('ISO-строка → yyyy-MM-dd', () => {
      expect(fmtDate('2024-03-15T10:30:00.000Z')).toBe('2024-03-15');
    });

    it('дата без времени остаётся неизменной', () => {
      expect(fmtDate('2024-01-01')).toBe('2024-01-01');
    });

    it('объект Date → yyyy-MM-dd', () => {
      expect(fmtDate(new Date('2024-06-20'))).toBe('2024-06-20');
    });

    it('конец года', () => {
      expect(fmtDate('2024-12-31')).toBe('2024-12-31');
    });

    it('начало года', () => {
      expect(fmtDate('2024-01-01')).toBe('2024-01-01');
    });
  });

  describe('граничные случаи', () => {
    it('null → пустая строка', () => {
      expect(fmtDate(null)).toBe('');
    });

    it('undefined → пустая строка', () => {
      expect(fmtDate(undefined)).toBe('');
    });

    it('пустая строка → пустая строка', () => {
      expect(fmtDate('')).toBe('');
    });
  });
});

// ─── parseTags ────────────────────────────────────────────────────────────────

describe('parseTags', () => {
  describe('нормальные сценарии', () => {
    it('массив строк возвращается как есть', () => {
      expect(parseTags(['кафе', 'работа'])).toEqual(['кафе', 'работа']);
    });

    it('JSON-строка с тегами разбирается в массив', () => {
      expect(parseTags('["еда","транспорт"]')).toEqual(['еда', 'транспорт']);
    });

    it('пустой массив возвращается как есть', () => {
      expect(parseTags([])).toEqual([]);
    });

    it('JSON-строка с пустым массивом', () => {
      expect(parseTags('[]')).toEqual([]);
    });
  });

  describe('граничные случаи', () => {
    it('null → пустой массив', () => {
      expect(parseTags(null)).toEqual([]);
    });

    it('undefined → пустой массив', () => {
      expect(parseTags(undefined)).toEqual([]);
    });

    it('число → пустой массив', () => {
      expect(parseTags(42)).toEqual([]);
    });

    it('объект → пустой массив', () => {
      expect(parseTags({ tag: 'кафе' })).toEqual([]);
    });
  });

  describe('ошибочные сценарии', () => {
    it('невалидный JSON → пустой массив (не бросает исключение)', () => {
      expect(() => parseTags('{broken json')).not.toThrow();
      expect(parseTags('{broken json')).toEqual([]);
    });

    // parseTags возвращает любой результат JSON.parse без проверки типа:
    // это документирует фактическое поведение (не применяется в реальных данных,
    // так как бэкенд всегда хранит теги как JSON-массив)
    it('JSON-число (не массив) → возвращает число как есть', () => {
      expect(parseTags('42')).toBe(42);
    });

    it('JSON-объект (не массив) → возвращает объект как есть', () => {
      expect(parseTags('{"a":1}')).toEqual({ a: 1 });
    });

    it('JSON-строка (не массив) → возвращает строку как есть', () => {
      expect(parseTags('"hello"')).toBe('hello');
    });
  });
});

// ─── normalizeTransaction ─────────────────────────────────────────────────────

describe('normalizeTransaction', () => {
  const base = {
    id: 'tx-1',
    type: 'expense',
    amount: 500,
    categoryId: 'cat-1',
    accountId: 'acc-1',
    date: '2024-03-15T00:00:00.000Z',
    createdAt: '2024-03-15T10:00:00.000Z',
  };

  it('дата нормализуется в yyyy-MM-dd', () => {
    expect(normalizeTransaction(base).date).toBe('2024-03-15');
  });

  it('теги из JSON-строки разбираются', () => {
    const tx = { ...base, tags: '["кафе","еда"]' };
    expect(normalizeTransaction(tx).tags).toEqual(['кафе', 'еда']);
  });

  it('теги-массив остаются массивом', () => {
    const tx = { ...base, tags: ['кафе'] };
    expect(normalizeTransaction(tx).tags).toEqual(['кафе']);
  });

  it('отсутствующие теги → пустой массив', () => {
    expect(normalizeTransaction(base).tags).toEqual([]);
  });

  it('categoryId null/undefined → пустая строка', () => {
    expect(normalizeTransaction({ ...base, categoryId: undefined }).categoryId).toBe('');
    expect(normalizeTransaction({ ...base, categoryId: null }).categoryId).toBe('');
  });

  it('categoryId сохраняется если задан', () => {
    expect(normalizeTransaction(base).categoryId).toBe('cat-1');
  });

  it('createdAt преобразуется в ISO-строку', () => {
    const result = normalizeTransaction(base);
    expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('отсутствующий createdAt заменяется текущим временем', () => {
    const { createdAt: _, ...noCreatedAt } = base;
    const result = normalizeTransaction(noCreatedAt);
    expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('остальные поля сохраняются без изменений', () => {
    const result = normalizeTransaction(base);
    expect(result.id).toBe('tx-1');
    expect(result.type).toBe('expense');
    expect(result.amount).toBe(500);
    expect(result.accountId).toBe('acc-1');
  });
});

// ─── normalizeAccount ─────────────────────────────────────────────────────────

describe('normalizeAccount', () => {
  const base = {
    id: 'acc-1',
    name: 'Карта',
    type: 'card',
    currency: 'RUB',
    initialBalance: 10000,
    color: '#3b82f6',
    icon: 'credit-card',
    isArchived: false,
    createdAt: '2024-01-01T00:00:00.000Z',
  };

  it('createdAt преобразуется в ISO-строку', () => {
    expect(normalizeAccount(base).createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('отсутствующий createdAt заменяется текущим временем', () => {
    const { createdAt: _, ...noCreatedAt } = base;
    expect(normalizeAccount(noCreatedAt).createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('остальные поля не изменяются', () => {
    const result = normalizeAccount(base);
    expect(result.id).toBe('acc-1');
    expect(result.initialBalance).toBe(10000);
    expect(result.isArchived).toBe(false);
  });
});

// ─── normalizeGoal ────────────────────────────────────────────────────────────

describe('normalizeGoal', () => {
  const base = {
    id: 'goal-1',
    name: 'Отпуск',
    targetAmount: 100000,
    currentAmount: 30000,
    icon: '✈️',
    color: '#3b82f6',
    isCompleted: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    contributions: [],
  };

  it('deadline нормализуется в yyyy-MM-dd', () => {
    const result = normalizeGoal({ ...base, deadline: '2024-12-31T00:00:00.000Z' });
    expect(result.deadline).toBe('2024-12-31');
  });

  it('отсутствующий deadline остаётся undefined', () => {
    expect(normalizeGoal(base).deadline).toBeUndefined();
  });

  it('даты взносов нормализуются', () => {
    const goal = {
      ...base,
      contributions: [
        { id: 'c-1', amount: 5000, date: '2024-06-01T00:00:00.000Z' },
      ],
    };
    expect(normalizeGoal(goal).contributions![0].date).toBe('2024-06-01');
  });

  it('пустой список взносов → пустой массив', () => {
    expect(normalizeGoal(base).contributions).toEqual([]);
  });

  it('отсутствующий contributions → пустой массив', () => {
    const { contributions: _, ...noContrib } = base;
    expect(normalizeGoal(noContrib).contributions).toEqual([]);
  });
});

// ─── normalizeRecurring ───────────────────────────────────────────────────────

describe('normalizeRecurring', () => {
  const base = {
    id: 'rec-1',
    name: 'Подписка',
    type: 'expense',
    amount: 299,
    categoryId: 'cat-1',
    accountId: 'acc-1',
    frequency: 'monthly',
    startDate: '2024-01-01T00:00:00.000Z',
    nextDate: '2024-04-01T00:00:00.000Z',
    isActive: true,
  };

  it('startDate нормализуется', () => {
    expect(normalizeRecurring(base).startDate).toBe('2024-01-01');
  });

  it('nextDate нормализуется', () => {
    expect(normalizeRecurring(base).nextDate).toBe('2024-04-01');
  });

  it('endDate нормализуется если задан', () => {
    const result = normalizeRecurring({ ...base, endDate: '2025-01-01T00:00:00.000Z' });
    expect(result.endDate).toBe('2025-01-01');
  });

  it('отсутствующий endDate остаётся undefined', () => {
    expect(normalizeRecurring(base).endDate).toBeUndefined();
  });

  it('lastProcessedDate нормализуется если задан', () => {
    const result = normalizeRecurring({ ...base, lastProcessedDate: '2024-03-01T00:00:00.000Z' });
    expect(result.lastProcessedDate).toBe('2024-03-01');
  });

  it('отсутствующий lastProcessedDate остаётся undefined', () => {
    expect(normalizeRecurring(base).lastProcessedDate).toBeUndefined();
  });
});
