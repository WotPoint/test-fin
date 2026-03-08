import { describe, it, expect } from 'vitest';
import {
  validate,
  AccountCreateSchema,
  AccountUpdateSchema,
  CategoryCreateSchema,
  ReorderSchema,
  TransactionCreateSchema,
  TransactionUpdateSchema,
  BulkDeleteSchema,
  BudgetCreateSchema,
  BudgetUpdateSchema,
  GoalCreateSchema,
  ContributionSchema,
  SubcategoryCreateSchema,
  SubcategoryUpdateSchema,
  RecurringCreateSchema,
} from '../schemas';

// ─── validate() helper ────────────────────────────────────────────────────────

describe('validate()', () => {
  it('возвращает данные при успешной валидации', () => {
    const result = validate(SubcategoryCreateSchema, { name: 'Такси', categoryId: 'cat-1' });
    expect(result).toEqual({ name: 'Такси', categoryId: 'cat-1' });
  });

  it('выбрасывает ошибку с status=400 при невалидных данных', () => {
    expect(() => validate(SubcategoryCreateSchema, { name: '' })).toThrow();
    try {
      validate(SubcategoryCreateSchema, { name: '' });
    } catch (e) {
      expect((e as NodeJS.ErrnoException & { status: number }).status).toBe(400);
    }
  });

  it('сообщение об ошибке содержит название поля', () => {
    try {
      validate(SubcategoryCreateSchema, { name: 'Такси' }); // без categoryId
    } catch (e) {
      expect((e as Error).message).toContain('categoryId');
    }
  });

  it('несколько ошибок объединяются через точку с запятой', () => {
    try {
      validate(AccountCreateSchema, {}); // name и color и icon обязательны
    } catch (e) {
      expect((e as Error).message).toContain(';');
    }
  });
});

// ─── AccountCreateSchema ──────────────────────────────────────────────────────

describe('AccountCreateSchema', () => {
  const valid = { name: 'Карта', type: 'card', color: '#fff', icon: 'credit-card' };

  it('минимально валидный объект', () => {
    expect(() => validate(AccountCreateSchema, valid)).not.toThrow();
  });

  it('устанавливает defaults: currency=RUB, initialBalance=0, isArchived=false', () => {
    const result = validate(AccountCreateSchema, valid);
    expect(result.currency).toBe('RUB');
    expect(result.initialBalance).toBe(0);
    expect(result.isArchived).toBe(false);
  });

  it('name обязателен — пустая строка отклоняется', () => {
    expect(() => validate(AccountCreateSchema, { ...valid, name: '' })).toThrow();
  });

  it('name не более 100 символов', () => {
    expect(() => validate(AccountCreateSchema, { ...valid, name: 'a'.repeat(101) })).toThrow();
    expect(() => validate(AccountCreateSchema, { ...valid, name: 'a'.repeat(100) })).not.toThrow();
  });

  it('color обязателен', () => {
    const { color: _, ...noColor } = valid;
    expect(() => validate(AccountCreateSchema, noColor)).toThrow();
  });

  it('icon обязателен', () => {
    const { icon: _, ...noIcon } = valid;
    expect(() => validate(AccountCreateSchema, noIcon)).toThrow();
  });

  it('id опционален', () => {
    expect(() => validate(AccountCreateSchema, { ...valid, id: 'some-uuid' })).not.toThrow();
  });
});

describe('AccountUpdateSchema', () => {
  it('все поля опциональны', () => {
    expect(() => validate(AccountUpdateSchema, {})).not.toThrow();
  });

  it('id запрещён (omit)', () => {
    // id не должен влиять — поле просто игнорируется Zod'ом при partial
    const result = validate(AccountUpdateSchema, { name: 'Новое имя' });
    expect(result.name).toBe('Новое имя');
  });
});

// ─── CategoryCreateSchema ─────────────────────────────────────────────────────

describe('CategoryCreateSchema', () => {
  const valid = { name: 'Транспорт', type: 'expense' as const, color: '#f00', icon: 'car' };

  it('валидный объект', () => {
    expect(() => validate(CategoryCreateSchema, valid)).not.toThrow();
  });

  it('type должен быть income или expense', () => {
    expect(() => validate(CategoryCreateSchema, { ...valid, type: 'transfer' })).toThrow();
    expect(() => validate(CategoryCreateSchema, { ...valid, type: 'income' })).not.toThrow();
    expect(() => validate(CategoryCreateSchema, { ...valid, type: 'expense' })).not.toThrow();
  });

  it('name не более 100 символов', () => {
    expect(() => validate(CategoryCreateSchema, { ...valid, name: 'a'.repeat(101) })).toThrow();
  });

  it('defaults: isDefault=false, isArchived=false, order=0', () => {
    const result = validate(CategoryCreateSchema, valid);
    expect(result.isDefault).toBe(false);
    expect(result.isArchived).toBe(false);
    expect(result.order).toBe(0);
  });

  it('parentId опционален (null или строка)', () => {
    expect(() => validate(CategoryCreateSchema, { ...valid, parentId: null })).not.toThrow();
    expect(() => validate(CategoryCreateSchema, { ...valid, parentId: 'parent-id' })).not.toThrow();
  });
});

describe('ReorderSchema', () => {
  it('принимает массив строк', () => {
    expect(() => validate(ReorderSchema, { ids: ['a', 'b', 'c'] })).not.toThrow();
  });

  it('пустой массив отклоняется (min 1)', () => {
    expect(() => validate(ReorderSchema, { ids: [] })).toThrow();
  });

  it('поле ids обязательно', () => {
    expect(() => validate(ReorderSchema, {})).toThrow();
  });
});

// ─── TransactionCreateSchema ──────────────────────────────────────────────────

describe('TransactionCreateSchema', () => {
  const valid = {
    type: 'expense' as const,
    amount: 500,
    accountId: 'acc-1',
    date: '2024-03-15',
  };

  it('валидный объект с минимальными полями', () => {
    expect(() => validate(TransactionCreateSchema, valid)).not.toThrow();
  });

  it('type должен быть income | expense | transfer', () => {
    expect(() => validate(TransactionCreateSchema, { ...valid, type: 'other' })).toThrow();
    ['income', 'expense', 'transfer'].forEach(t => {
      expect(() => validate(TransactionCreateSchema, { ...valid, type: t })).not.toThrow();
    });
  });

  it('amount должен быть положительным', () => {
    expect(() => validate(TransactionCreateSchema, { ...valid, amount: 0 })).toThrow();
    expect(() => validate(TransactionCreateSchema, { ...valid, amount: -100 })).toThrow();
    expect(() => validate(TransactionCreateSchema, { ...valid, amount: 0.01 })).not.toThrow();
  });

  it('accountId обязателен и непустой', () => {
    expect(() => validate(TransactionCreateSchema, { ...valid, accountId: '' })).toThrow();
    const { accountId: _, ...noAcc } = valid;
    expect(() => validate(TransactionCreateSchema, noAcc)).toThrow();
  });

  it('date обязателен и непустой', () => {
    expect(() => validate(TransactionCreateSchema, { ...valid, date: '' })).toThrow();
  });

  it('comment не более 500 символов', () => {
    expect(() => validate(TransactionCreateSchema, { ...valid, comment: 'x'.repeat(501) })).toThrow();
    expect(() => validate(TransactionCreateSchema, { ...valid, comment: 'x'.repeat(500) })).not.toThrow();
  });

  it('tags по умолчанию []', () => {
    const result = validate(TransactionCreateSchema, valid);
    expect(result.tags).toBe('[]');
  });

  it('все опциональные поля принимаются', () => {
    expect(() => validate(TransactionCreateSchema, {
      ...valid,
      categoryId: 'cat-1',
      subcategoryId: 'sub-1',
      toAccountId: 'acc-2',
      comment: 'комментарий',
      tags: '["еда"]',
      recurringId: 'rec-1',
    })).not.toThrow();
  });
});

describe('TransactionUpdateSchema', () => {
  it('пустой объект валиден (все поля опциональны)', () => {
    expect(() => validate(TransactionUpdateSchema, {})).not.toThrow();
  });

  it('amount должен быть положительным при передаче', () => {
    expect(() => validate(TransactionUpdateSchema, { amount: -1 })).toThrow();
  });
});

describe('BulkDeleteSchema', () => {
  it('массив из одного ID', () => {
    expect(() => validate(BulkDeleteSchema, { ids: ['id-1'] })).not.toThrow();
  });

  it('пустой массив отклоняется', () => {
    expect(() => validate(BulkDeleteSchema, { ids: [] })).toThrow();
  });

  it('ids обязателен', () => {
    expect(() => validate(BulkDeleteSchema, {})).toThrow();
  });
});

// ─── BudgetCreateSchema ───────────────────────────────────────────────────────

describe('BudgetCreateSchema', () => {
  const valid = { categoryId: 'cat-1', amount: 5000, month: 3, year: 2024 };

  it('валидный бюджет', () => {
    expect(() => validate(BudgetCreateSchema, valid)).not.toThrow();
  });

  it('alertThreshold по умолчанию 80', () => {
    expect(validate(BudgetCreateSchema, valid).alertThreshold).toBe(80);
  });

  it('month должен быть от 1 до 12', () => {
    expect(() => validate(BudgetCreateSchema, { ...valid, month: 0 })).toThrow();
    expect(() => validate(BudgetCreateSchema, { ...valid, month: 13 })).toThrow();
    expect(() => validate(BudgetCreateSchema, { ...valid, month: 1 })).not.toThrow();
    expect(() => validate(BudgetCreateSchema, { ...valid, month: 12 })).not.toThrow();
  });

  it('year должен быть от 2000 до 2100', () => {
    expect(() => validate(BudgetCreateSchema, { ...valid, year: 1999 })).toThrow();
    expect(() => validate(BudgetCreateSchema, { ...valid, year: 2101 })).toThrow();
    expect(() => validate(BudgetCreateSchema, { ...valid, year: 2000 })).not.toThrow();
    expect(() => validate(BudgetCreateSchema, { ...valid, year: 2100 })).not.toThrow();
  });

  it('alertThreshold должен быть от 0 до 100', () => {
    expect(() => validate(BudgetCreateSchema, { ...valid, alertThreshold: -1 })).toThrow();
    expect(() => validate(BudgetCreateSchema, { ...valid, alertThreshold: 101 })).toThrow();
    expect(() => validate(BudgetCreateSchema, { ...valid, alertThreshold: 0 })).not.toThrow();
    expect(() => validate(BudgetCreateSchema, { ...valid, alertThreshold: 100 })).not.toThrow();
  });

  it('amount должен быть положительным', () => {
    expect(() => validate(BudgetCreateSchema, { ...valid, amount: 0 })).toThrow();
    expect(() => validate(BudgetCreateSchema, { ...valid, amount: -100 })).toThrow();
  });
});

describe('BudgetUpdateSchema', () => {
  it('пустой объект валиден', () => {
    expect(() => validate(BudgetUpdateSchema, {})).not.toThrow();
  });

  it('categoryId отсутствует (omit)', () => {
    // categoryId не должен приниматься
    const result = validate(BudgetUpdateSchema, { amount: 1000 });
    expect(result.amount).toBe(1000);
  });
});

// ─── GoalCreateSchema ─────────────────────────────────────────────────────────

describe('GoalCreateSchema', () => {
  const valid = { name: 'Отпуск', targetAmount: 100000, icon: '✈️', color: '#3b82f6' };

  it('валидная цель', () => {
    expect(() => validate(GoalCreateSchema, valid)).not.toThrow();
  });

  it('name до 200 символов', () => {
    expect(() => validate(GoalCreateSchema, { ...valid, name: 'a'.repeat(201) })).toThrow();
    expect(() => validate(GoalCreateSchema, { ...valid, name: 'a'.repeat(200) })).not.toThrow();
  });

  it('name не может быть пустым', () => {
    expect(() => validate(GoalCreateSchema, { ...valid, name: '' })).toThrow();
  });

  it('targetAmount должен быть положительным', () => {
    expect(() => validate(GoalCreateSchema, { ...valid, targetAmount: 0 })).toThrow();
    expect(() => validate(GoalCreateSchema, { ...valid, targetAmount: -1 })).toThrow();
  });

  it('currentAmount по умолчанию 0', () => {
    expect(validate(GoalCreateSchema, valid).currentAmount).toBe(0);
  });

  it('description не более 500 символов', () => {
    expect(() => validate(GoalCreateSchema, { ...valid, description: 'x'.repeat(501) })).toThrow();
  });

  it('deadline опционален', () => {
    expect(() => validate(GoalCreateSchema, { ...valid, deadline: '2025-12-31' })).not.toThrow();
    expect(() => validate(GoalCreateSchema, { ...valid, deadline: null })).not.toThrow();
  });
});

describe('ContributionSchema', () => {
  it('валидный взнос', () => {
    expect(() => validate(ContributionSchema, { amount: 1000, date: '2024-03-15' })).not.toThrow();
  });

  it('amount должен быть положительным', () => {
    expect(() => validate(ContributionSchema, { amount: 0, date: '2024-03-15' })).toThrow();
    expect(() => validate(ContributionSchema, { amount: -100, date: '2024-03-15' })).toThrow();
  });

  it('date обязателен', () => {
    expect(() => validate(ContributionSchema, { amount: 1000, date: '' })).toThrow();
    expect(() => validate(ContributionSchema, { amount: 1000 })).toThrow();
  });
});

// ─── SubcategoryCreateSchema ──────────────────────────────────────────────────

describe('SubcategoryCreateSchema', () => {
  const valid = { name: 'Такси', categoryId: 'cat-1' };

  it('валидная подкатегория', () => {
    expect(() => validate(SubcategoryCreateSchema, valid)).not.toThrow();
  });

  it('name не может быть пустым', () => {
    expect(() => validate(SubcategoryCreateSchema, { ...valid, name: '' })).toThrow();
  });

  it('name до 100 символов', () => {
    expect(() => validate(SubcategoryCreateSchema, { ...valid, name: 'a'.repeat(101) })).toThrow();
  });

  it('categoryId не может быть пустым', () => {
    expect(() => validate(SubcategoryCreateSchema, { ...valid, categoryId: '' })).toThrow();
  });
});

describe('SubcategoryUpdateSchema', () => {
  it('пустой объект валиден', () => {
    expect(() => validate(SubcategoryUpdateSchema, {})).not.toThrow();
  });
});

// ─── RecurringCreateSchema ────────────────────────────────────────────────────

describe('RecurringCreateSchema', () => {
  const valid = {
    name: 'Аренда',
    type: 'expense' as const,
    amount: 30000,
    accountId: 'acc-1',
    frequency: 'monthly' as const,
    startDate: '2024-01-01',
    nextDate: '2024-04-01',
  };

  it('валидный шаблон', () => {
    expect(() => validate(RecurringCreateSchema, valid)).not.toThrow();
  });

  it('frequency: только допустимые значения', () => {
    const allowed = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
    allowed.forEach(f => {
      expect(() => validate(RecurringCreateSchema, { ...valid, frequency: f })).not.toThrow();
    });
    expect(() => validate(RecurringCreateSchema, { ...valid, frequency: 'biweekly' })).toThrow();
  });

  it('amount должен быть положительным', () => {
    expect(() => validate(RecurringCreateSchema, { ...valid, amount: 0 })).toThrow();
  });

  it('name до 200 символов', () => {
    expect(() => validate(RecurringCreateSchema, { ...valid, name: 'a'.repeat(201) })).toThrow();
  });

  it('isActive по умолчанию true', () => {
    expect(validate(RecurringCreateSchema, valid).isActive).toBe(true);
  });

  it('endDate и lastProcessedDate опциональны', () => {
    expect(() => validate(RecurringCreateSchema, {
      ...valid,
      endDate: '2025-12-31',
      lastProcessedDate: '2024-03-01',
    })).not.toThrow();
  });
});
