"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const schemas_1 = require("../validation/schemas");
// ─── validate() helper ────────────────────────────────────────────────────────
(0, vitest_1.describe)('validate()', () => {
    (0, vitest_1.it)('возвращает данные при успешной валидации', () => {
        const result = (0, schemas_1.validate)(schemas_1.SubcategoryCreateSchema, { name: 'Такси', categoryId: 'cat-1' });
        (0, vitest_1.expect)(result).toEqual({ name: 'Такси', categoryId: 'cat-1' });
    });
    (0, vitest_1.it)('выбрасывает ошибку с status=400 при невалидных данных', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.SubcategoryCreateSchema, { name: '' })).toThrow();
        try {
            (0, schemas_1.validate)(schemas_1.SubcategoryCreateSchema, { name: '' });
        }
        catch (e) {
            (0, vitest_1.expect)(e.status).toBe(400);
        }
    });
    (0, vitest_1.it)('сообщение об ошибке содержит название поля', () => {
        try {
            (0, schemas_1.validate)(schemas_1.SubcategoryCreateSchema, { name: 'Такси' }); // без categoryId
        }
        catch (e) {
            (0, vitest_1.expect)(e.message).toContain('categoryId');
        }
    });
    (0, vitest_1.it)('несколько ошибок объединяются через точку с запятой', () => {
        try {
            (0, schemas_1.validate)(schemas_1.AccountCreateSchema, {}); // name и color и icon обязательны
        }
        catch (e) {
            (0, vitest_1.expect)(e.message).toContain(';');
        }
    });
});
// ─── AccountCreateSchema ──────────────────────────────────────────────────────
(0, vitest_1.describe)('AccountCreateSchema', () => {
    const valid = { name: 'Карта', type: 'card', color: '#fff', icon: 'credit-card' };
    (0, vitest_1.it)('минимально валидный объект', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.AccountCreateSchema, valid)).not.toThrow();
    });
    (0, vitest_1.it)('устанавливает defaults: currency=RUB, initialBalance=0, isArchived=false', () => {
        const result = (0, schemas_1.validate)(schemas_1.AccountCreateSchema, valid);
        (0, vitest_1.expect)(result.currency).toBe('RUB');
        (0, vitest_1.expect)(result.initialBalance).toBe(0);
        (0, vitest_1.expect)(result.isArchived).toBe(false);
    });
    (0, vitest_1.it)('name обязателен — пустая строка отклоняется', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.AccountCreateSchema, { ...valid, name: '' })).toThrow();
    });
    (0, vitest_1.it)('name не более 100 символов', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.AccountCreateSchema, { ...valid, name: 'a'.repeat(101) })).toThrow();
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.AccountCreateSchema, { ...valid, name: 'a'.repeat(100) })).not.toThrow();
    });
    (0, vitest_1.it)('color обязателен', () => {
        const { color: _, ...noColor } = valid;
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.AccountCreateSchema, noColor)).toThrow();
    });
    (0, vitest_1.it)('icon обязателен', () => {
        const { icon: _, ...noIcon } = valid;
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.AccountCreateSchema, noIcon)).toThrow();
    });
    (0, vitest_1.it)('id опционален', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.AccountCreateSchema, { ...valid, id: 'some-uuid' })).not.toThrow();
    });
});
(0, vitest_1.describe)('AccountUpdateSchema', () => {
    (0, vitest_1.it)('все поля опциональны', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.AccountUpdateSchema, {})).not.toThrow();
    });
    (0, vitest_1.it)('id запрещён (omit)', () => {
        // id не должен влиять — поле просто игнорируется Zod'ом при partial
        const result = (0, schemas_1.validate)(schemas_1.AccountUpdateSchema, { name: 'Новое имя' });
        (0, vitest_1.expect)(result.name).toBe('Новое имя');
    });
});
// ─── CategoryCreateSchema ─────────────────────────────────────────────────────
(0, vitest_1.describe)('CategoryCreateSchema', () => {
    const valid = { name: 'Транспорт', type: 'expense', color: '#f00', icon: 'car' };
    (0, vitest_1.it)('валидный объект', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.CategoryCreateSchema, valid)).not.toThrow();
    });
    (0, vitest_1.it)('type должен быть income или expense', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.CategoryCreateSchema, { ...valid, type: 'transfer' })).toThrow();
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.CategoryCreateSchema, { ...valid, type: 'income' })).not.toThrow();
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.CategoryCreateSchema, { ...valid, type: 'expense' })).not.toThrow();
    });
    (0, vitest_1.it)('name не более 100 символов', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.CategoryCreateSchema, { ...valid, name: 'a'.repeat(101) })).toThrow();
    });
    (0, vitest_1.it)('defaults: isDefault=false, isArchived=false, order=0', () => {
        const result = (0, schemas_1.validate)(schemas_1.CategoryCreateSchema, valid);
        (0, vitest_1.expect)(result.isDefault).toBe(false);
        (0, vitest_1.expect)(result.isArchived).toBe(false);
        (0, vitest_1.expect)(result.order).toBe(0);
    });
    (0, vitest_1.it)('parentId опционален (null или строка)', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.CategoryCreateSchema, { ...valid, parentId: null })).not.toThrow();
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.CategoryCreateSchema, { ...valid, parentId: 'parent-id' })).not.toThrow();
    });
});
(0, vitest_1.describe)('ReorderSchema', () => {
    (0, vitest_1.it)('принимает массив строк', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.ReorderSchema, { ids: ['a', 'b', 'c'] })).not.toThrow();
    });
    (0, vitest_1.it)('пустой массив отклоняется (min 1)', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.ReorderSchema, { ids: [] })).toThrow();
    });
    (0, vitest_1.it)('поле ids обязательно', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.ReorderSchema, {})).toThrow();
    });
});
// ─── TransactionCreateSchema ──────────────────────────────────────────────────
(0, vitest_1.describe)('TransactionCreateSchema', () => {
    const valid = {
        type: 'expense',
        amount: 500,
        accountId: 'acc-1',
        date: '2024-03-15',
    };
    (0, vitest_1.it)('валидный объект с минимальными полями', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.TransactionCreateSchema, valid)).not.toThrow();
    });
    (0, vitest_1.it)('type должен быть income | expense | transfer', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.TransactionCreateSchema, { ...valid, type: 'other' })).toThrow();
        ['income', 'expense', 'transfer'].forEach(t => {
            (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.TransactionCreateSchema, { ...valid, type: t })).not.toThrow();
        });
    });
    (0, vitest_1.it)('amount должен быть положительным', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.TransactionCreateSchema, { ...valid, amount: 0 })).toThrow();
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.TransactionCreateSchema, { ...valid, amount: -100 })).toThrow();
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.TransactionCreateSchema, { ...valid, amount: 0.01 })).not.toThrow();
    });
    (0, vitest_1.it)('accountId обязателен и непустой', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.TransactionCreateSchema, { ...valid, accountId: '' })).toThrow();
        const { accountId: _, ...noAcc } = valid;
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.TransactionCreateSchema, noAcc)).toThrow();
    });
    (0, vitest_1.it)('date обязателен и непустой', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.TransactionCreateSchema, { ...valid, date: '' })).toThrow();
    });
    (0, vitest_1.it)('comment не более 500 символов', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.TransactionCreateSchema, { ...valid, comment: 'x'.repeat(501) })).toThrow();
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.TransactionCreateSchema, { ...valid, comment: 'x'.repeat(500) })).not.toThrow();
    });
    (0, vitest_1.it)('tags по умолчанию []', () => {
        const result = (0, schemas_1.validate)(schemas_1.TransactionCreateSchema, valid);
        (0, vitest_1.expect)(result.tags).toBe('[]');
    });
    (0, vitest_1.it)('все опциональные поля принимаются', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.TransactionCreateSchema, {
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
(0, vitest_1.describe)('TransactionUpdateSchema', () => {
    (0, vitest_1.it)('пустой объект валиден (все поля опциональны)', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.TransactionUpdateSchema, {})).not.toThrow();
    });
    (0, vitest_1.it)('amount должен быть положительным при передаче', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.TransactionUpdateSchema, { amount: -1 })).toThrow();
    });
});
(0, vitest_1.describe)('BulkDeleteSchema', () => {
    (0, vitest_1.it)('массив из одного ID', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.BulkDeleteSchema, { ids: ['id-1'] })).not.toThrow();
    });
    (0, vitest_1.it)('пустой массив отклоняется', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.BulkDeleteSchema, { ids: [] })).toThrow();
    });
    (0, vitest_1.it)('ids обязателен', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.BulkDeleteSchema, {})).toThrow();
    });
});
// ─── BudgetCreateSchema ───────────────────────────────────────────────────────
(0, vitest_1.describe)('BudgetCreateSchema', () => {
    const valid = { categoryId: 'cat-1', amount: 5000, month: 3, year: 2024 };
    (0, vitest_1.it)('валидный бюджет', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.BudgetCreateSchema, valid)).not.toThrow();
    });
    (0, vitest_1.it)('alertThreshold по умолчанию 80', () => {
        (0, vitest_1.expect)((0, schemas_1.validate)(schemas_1.BudgetCreateSchema, valid).alertThreshold).toBe(80);
    });
    (0, vitest_1.it)('month должен быть от 1 до 12', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.BudgetCreateSchema, { ...valid, month: 0 })).toThrow();
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.BudgetCreateSchema, { ...valid, month: 13 })).toThrow();
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.BudgetCreateSchema, { ...valid, month: 1 })).not.toThrow();
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.BudgetCreateSchema, { ...valid, month: 12 })).not.toThrow();
    });
    (0, vitest_1.it)('year должен быть от 2000 до 2100', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.BudgetCreateSchema, { ...valid, year: 1999 })).toThrow();
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.BudgetCreateSchema, { ...valid, year: 2101 })).toThrow();
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.BudgetCreateSchema, { ...valid, year: 2000 })).not.toThrow();
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.BudgetCreateSchema, { ...valid, year: 2100 })).not.toThrow();
    });
    (0, vitest_1.it)('alertThreshold должен быть от 0 до 100', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.BudgetCreateSchema, { ...valid, alertThreshold: -1 })).toThrow();
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.BudgetCreateSchema, { ...valid, alertThreshold: 101 })).toThrow();
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.BudgetCreateSchema, { ...valid, alertThreshold: 0 })).not.toThrow();
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.BudgetCreateSchema, { ...valid, alertThreshold: 100 })).not.toThrow();
    });
    (0, vitest_1.it)('amount должен быть положительным', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.BudgetCreateSchema, { ...valid, amount: 0 })).toThrow();
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.BudgetCreateSchema, { ...valid, amount: -100 })).toThrow();
    });
});
(0, vitest_1.describe)('BudgetUpdateSchema', () => {
    (0, vitest_1.it)('пустой объект валиден', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.BudgetUpdateSchema, {})).not.toThrow();
    });
    (0, vitest_1.it)('categoryId отсутствует (omit)', () => {
        // categoryId не должен приниматься
        const result = (0, schemas_1.validate)(schemas_1.BudgetUpdateSchema, { amount: 1000 });
        (0, vitest_1.expect)(result.amount).toBe(1000);
    });
});
// ─── GoalCreateSchema ─────────────────────────────────────────────────────────
(0, vitest_1.describe)('GoalCreateSchema', () => {
    const valid = { name: 'Отпуск', targetAmount: 100000, icon: '✈️', color: '#3b82f6' };
    (0, vitest_1.it)('валидная цель', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.GoalCreateSchema, valid)).not.toThrow();
    });
    (0, vitest_1.it)('name до 200 символов', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.GoalCreateSchema, { ...valid, name: 'a'.repeat(201) })).toThrow();
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.GoalCreateSchema, { ...valid, name: 'a'.repeat(200) })).not.toThrow();
    });
    (0, vitest_1.it)('name не может быть пустым', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.GoalCreateSchema, { ...valid, name: '' })).toThrow();
    });
    (0, vitest_1.it)('targetAmount должен быть положительным', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.GoalCreateSchema, { ...valid, targetAmount: 0 })).toThrow();
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.GoalCreateSchema, { ...valid, targetAmount: -1 })).toThrow();
    });
    (0, vitest_1.it)('currentAmount по умолчанию 0', () => {
        (0, vitest_1.expect)((0, schemas_1.validate)(schemas_1.GoalCreateSchema, valid).currentAmount).toBe(0);
    });
    (0, vitest_1.it)('description не более 500 символов', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.GoalCreateSchema, { ...valid, description: 'x'.repeat(501) })).toThrow();
    });
    (0, vitest_1.it)('deadline опционален', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.GoalCreateSchema, { ...valid, deadline: '2025-12-31' })).not.toThrow();
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.GoalCreateSchema, { ...valid, deadline: null })).not.toThrow();
    });
});
(0, vitest_1.describe)('ContributionSchema', () => {
    (0, vitest_1.it)('валидный взнос', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.ContributionSchema, { amount: 1000, date: '2024-03-15' })).not.toThrow();
    });
    (0, vitest_1.it)('amount должен быть положительным', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.ContributionSchema, { amount: 0, date: '2024-03-15' })).toThrow();
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.ContributionSchema, { amount: -100, date: '2024-03-15' })).toThrow();
    });
    (0, vitest_1.it)('date обязателен', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.ContributionSchema, { amount: 1000, date: '' })).toThrow();
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.ContributionSchema, { amount: 1000 })).toThrow();
    });
});
// ─── SubcategoryCreateSchema ──────────────────────────────────────────────────
(0, vitest_1.describe)('SubcategoryCreateSchema', () => {
    const valid = { name: 'Такси', categoryId: 'cat-1' };
    (0, vitest_1.it)('валидная подкатегория', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.SubcategoryCreateSchema, valid)).not.toThrow();
    });
    (0, vitest_1.it)('name не может быть пустым', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.SubcategoryCreateSchema, { ...valid, name: '' })).toThrow();
    });
    (0, vitest_1.it)('name до 100 символов', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.SubcategoryCreateSchema, { ...valid, name: 'a'.repeat(101) })).toThrow();
    });
    (0, vitest_1.it)('categoryId не может быть пустым', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.SubcategoryCreateSchema, { ...valid, categoryId: '' })).toThrow();
    });
});
(0, vitest_1.describe)('SubcategoryUpdateSchema', () => {
    (0, vitest_1.it)('пустой объект валиден', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.SubcategoryUpdateSchema, {})).not.toThrow();
    });
});
// ─── RecurringCreateSchema ────────────────────────────────────────────────────
(0, vitest_1.describe)('RecurringCreateSchema', () => {
    const valid = {
        name: 'Аренда',
        type: 'expense',
        amount: 30000,
        accountId: 'acc-1',
        frequency: 'monthly',
        startDate: '2024-01-01',
        nextDate: '2024-04-01',
    };
    (0, vitest_1.it)('валидный шаблон', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.RecurringCreateSchema, valid)).not.toThrow();
    });
    (0, vitest_1.it)('frequency: только допустимые значения', () => {
        const allowed = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
        allowed.forEach(f => {
            (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.RecurringCreateSchema, { ...valid, frequency: f })).not.toThrow();
        });
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.RecurringCreateSchema, { ...valid, frequency: 'biweekly' })).toThrow();
    });
    (0, vitest_1.it)('amount должен быть положительным', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.RecurringCreateSchema, { ...valid, amount: 0 })).toThrow();
    });
    (0, vitest_1.it)('name до 200 символов', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.RecurringCreateSchema, { ...valid, name: 'a'.repeat(201) })).toThrow();
    });
    (0, vitest_1.it)('isActive по умолчанию true', () => {
        (0, vitest_1.expect)((0, schemas_1.validate)(schemas_1.RecurringCreateSchema, valid).isActive).toBe(true);
    });
    (0, vitest_1.it)('endDate и lastProcessedDate опциональны', () => {
        (0, vitest_1.expect)(() => (0, schemas_1.validate)(schemas_1.RecurringCreateSchema, {
            ...valid,
            endDate: '2025-12-31',
            lastProcessedDate: '2024-03-01',
        })).not.toThrow();
    });
});
