import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import { JWT_SECRET } from '../middleware/auth';
import { prisma, clearDb } from './setup';

// Валидный токен для всех запросов
const token = jwt.sign({ username: 'Herasova' }, JWT_SECRET, { expiresIn: '1h' });
const auth = { Authorization: `Bearer ${token}` };

// Базовые данные для тестов
const ACCOUNT = { name: 'Карта', type: 'card', color: '#3b82f6', icon: 'credit-card', currency: 'RUB', initialBalance: 10000 };
const CATEGORY = { name: 'Транспорт', type: 'expense', color: '#f97316', icon: 'car' };

beforeEach(async () => {
  await clearDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ─── /api/accounts ────────────────────────────────────────────────────────────

describe('GET /api/accounts', () => {
  it('пустая база → пустой массив', async () => {
    const res = await request(app).get('/api/accounts').set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('возвращает созданные счета', async () => {
    await request(app).post('/api/accounts').set(auth).send(ACCOUNT);
    const res = await request(app).get('/api/accounts').set(auth);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Карта');
  });
});

describe('POST /api/accounts', () => {
  it('создаёт счёт и возвращает 201', async () => {
    const res = await request(app).post('/api/accounts').set(auth).send(ACCOUNT);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Карта', type: 'card', currency: 'RUB' });
    expect(res.body.id).toBeTruthy();
  });

  it('невалидные данные (нет name) → 400', async () => {
    const res = await request(app).post('/api/accounts').set(auth)
      .send({ type: 'card', color: '#fff', icon: 'x' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('невалидные данные (нет color) → 400', async () => {
    const res = await request(app).post('/api/accounts').set(auth)
      .send({ name: 'Нал', type: 'cash', icon: 'x' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/accounts/:id', () => {
  it('обновляет имя счёта', async () => {
    const created = await request(app).post('/api/accounts').set(auth).send(ACCOUNT);
    const id = created.body.id;

    const res = await request(app).put(`/api/accounts/${id}`).set(auth)
      .send({ name: 'Новое имя' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Новое имя');
  });

  it('обновляет isArchived', async () => {
    const created = await request(app).post('/api/accounts').set(auth).send(ACCOUNT);
    const id = created.body.id;

    const res = await request(app).put(`/api/accounts/${id}`).set(auth)
      .send({ isArchived: true });
    expect(res.body.isArchived).toBe(true);
  });
});

describe('DELETE /api/accounts/:id', () => {
  it('удаляет счёт → 204', async () => {
    const created = await request(app).post('/api/accounts').set(auth).send(ACCOUNT);
    const id = created.body.id;

    const res = await request(app).delete(`/api/accounts/${id}`).set(auth);
    expect(res.status).toBe(204);

    const list = await request(app).get('/api/accounts').set(auth);
    expect(list.body).toHaveLength(0);
  });
});

// ─── /api/categories ──────────────────────────────────────────────────────────

describe('GET /api/categories', () => {
  it('пустая база → пустой массив', async () => {
    const res = await request(app).get('/api/categories').set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('POST /api/categories', () => {
  it('создаёт категорию', async () => {
    const res = await request(app).post('/api/categories').set(auth).send(CATEGORY);
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Транспорт');
    expect(res.body.type).toBe('expense');
  });

  it('type не income/expense → 400', async () => {
    const res = await request(app).post('/api/categories').set(auth)
      .send({ ...CATEGORY, type: 'transfer' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/categories/:id — guard от транзакций', () => {
  it('категория без транзакций удаляется → 204', async () => {
    const cat = await request(app).post('/api/categories').set(auth).send(CATEGORY);
    const res = await request(app).delete(`/api/categories/${cat.body.id}`).set(auth);
    expect(res.status).toBe(204);
  });

  it('категория с транзакциями не удаляется → 409', async () => {
    const acc = await request(app).post('/api/accounts').set(auth).send(ACCOUNT);
    const cat = await request(app).post('/api/categories').set(auth).send(CATEGORY);

    // создаём транзакцию привязанную к категории
    await request(app).post('/api/transactions').set(auth).send({
      type: 'expense', amount: 100, accountId: acc.body.id,
      categoryId: cat.body.id, date: '2024-03-15',
    });

    const res = await request(app).delete(`/api/categories/${cat.body.id}`).set(auth);
    expect(res.status).toBe(409);
    expect(res.body.error).toContain('1');
  });
});

describe('PUT /api/categories/reorder', () => {
  it('меняет порядок категорий', async () => {
    const c1 = await request(app).post('/api/categories').set(auth)
      .send({ ...CATEGORY, name: 'А', order: 0 });
    const c2 = await request(app).post('/api/categories').set(auth)
      .send({ ...CATEGORY, name: 'Б', order: 1 });

    const res = await request(app).put('/api/categories/reorder').set(auth)
      .send({ ids: [c2.body.id, c1.body.id] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('пустой массив → 400', async () => {
    const res = await request(app).put('/api/categories/reorder').set(auth)
      .send({ ids: [] });
    expect(res.status).toBe(400);
  });
});

// ─── /api/subcategories ───────────────────────────────────────────────────────

describe('POST /api/subcategories', () => {
  it('создаёт подкатегорию', async () => {
    const cat = await request(app).post('/api/categories').set(auth).send(CATEGORY);
    const res = await request(app).post('/api/subcategories').set(auth)
      .send({ name: 'Такси', categoryId: cat.body.id });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Такси');
  });
});

describe('DELETE /api/subcategories/:id', () => {
  it('удаляет подкатегорию → 204', async () => {
    const cat = await request(app).post('/api/categories').set(auth).send(CATEGORY);
    const sub = await request(app).post('/api/subcategories').set(auth)
      .send({ name: 'Такси', categoryId: cat.body.id });

    const res = await request(app).delete(`/api/subcategories/${sub.body.id}`).set(auth);
    expect(res.status).toBe(204);
  });

  it('каскадное удаление: при удалении категории удаляются подкатегории', async () => {
    const cat = await request(app).post('/api/categories').set(auth).send(CATEGORY);
    await request(app).post('/api/subcategories').set(auth)
      .send({ name: 'Такси', categoryId: cat.body.id });

    await request(app).delete(`/api/categories/${cat.body.id}`).set(auth);

    const subs = await request(app).get('/api/subcategories').set(auth);
    expect(subs.body).toHaveLength(0);
  });
});

// ─── /api/transactions ────────────────────────────────────────────────────────

describe('GET /api/transactions', () => {
  it('возвращает { data, total }', async () => {
    const res = await request(app).get('/api/transactions').set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(typeof res.body.total).toBe('number');
  });

  it('пустая база → data=[], total=0', async () => {
    const res = await request(app).get('/api/transactions').set(auth);
    expect(res.body.data).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it('пагинация: limit и offset работают', async () => {
    const acc = await request(app).post('/api/accounts').set(auth).send(ACCOUNT);
    const base = { type: 'expense', amount: 100, accountId: acc.body.id, date: '2024-03-15' };

    // Создаём 5 транзакций
    for (let i = 1; i <= 5; i++) {
      await request(app).post('/api/transactions').set(auth)
        .send({ ...base, amount: i * 100 });
    }

    const page1 = await request(app).get('/api/transactions?limit=2&offset=0').set(auth);
    expect(page1.body.data).toHaveLength(2);
    expect(page1.body.total).toBe(5);

    const page2 = await request(app).get('/api/transactions?limit=2&offset=2').set(auth);
    expect(page2.body.data).toHaveLength(2);
    expect(page2.body.total).toBe(5);

    const page3 = await request(app).get('/api/transactions?limit=2&offset=4').set(auth);
    expect(page3.body.data).toHaveLength(1);
  });

  it('limit ограничен максимум 500', async () => {
    const res = await request(app).get('/api/transactions?limit=9999').set(auth);
    expect(res.status).toBe(200); // не падает, просто ограничивает
  });

  it('фильтр по type', async () => {
    const acc = await request(app).post('/api/accounts').set(auth).send(ACCOUNT);
    await request(app).post('/api/transactions').set(auth)
      .send({ type: 'income', amount: 5000, accountId: acc.body.id, date: '2024-03-01' });
    await request(app).post('/api/transactions').set(auth)
      .send({ type: 'expense', amount: 100, accountId: acc.body.id, date: '2024-03-01' });

    const res = await request(app).get('/api/transactions?type=income').set(auth);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].type).toBe('income');
  });
});

describe('POST /api/transactions', () => {
  it('создаёт транзакцию → 201', async () => {
    const acc = await request(app).post('/api/accounts').set(auth).send(ACCOUNT);
    const res = await request(app).post('/api/transactions').set(auth).send({
      type: 'expense', amount: 500, accountId: acc.body.id, date: '2024-03-15',
    });
    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(500);
    expect(res.body.type).toBe('expense');
  });

  it('отрицательная сумма → 400', async () => {
    const acc = await request(app).post('/api/accounts').set(auth).send(ACCOUNT);
    const res = await request(app).post('/api/transactions').set(auth).send({
      type: 'expense', amount: -100, accountId: acc.body.id, date: '2024-03-15',
    });
    expect(res.status).toBe(400);
  });

  it('сумма = 0 → 400', async () => {
    const acc = await request(app).post('/api/accounts').set(auth).send(ACCOUNT);
    const res = await request(app).post('/api/transactions').set(auth).send({
      type: 'expense', amount: 0, accountId: acc.body.id, date: '2024-03-15',
    });
    expect(res.status).toBe(400);
  });

  it('нет accountId → 400', async () => {
    const res = await request(app).post('/api/transactions').set(auth).send({
      type: 'expense', amount: 100, date: '2024-03-15',
    });
    expect(res.status).toBe(400);
  });

  it('теги сохраняются', async () => {
    const acc = await request(app).post('/api/accounts').set(auth).send(ACCOUNT);
    const res = await request(app).post('/api/transactions').set(auth).send({
      type: 'expense', amount: 200, accountId: acc.body.id,
      date: '2024-03-15', tags: '["кафе","еда"]',
    });
    expect(res.body.tags).toBe('["кафе","еда"]');
  });
});

describe('PUT /api/transactions/:id', () => {
  it('обновляет сумму', async () => {
    const acc = await request(app).post('/api/accounts').set(auth).send(ACCOUNT);
    const created = await request(app).post('/api/transactions').set(auth).send({
      type: 'expense', amount: 500, accountId: acc.body.id, date: '2024-03-15',
    });

    const res = await request(app).put(`/api/transactions/${created.body.id}`)
      .set(auth).send({ amount: 999 });
    expect(res.status).toBe(200);
    expect(res.body.amount).toBe(999);
  });
});

describe('DELETE /api/transactions/:id', () => {
  it('удаляет транзакцию → 204', async () => {
    const acc = await request(app).post('/api/accounts').set(auth).send(ACCOUNT);
    const tx = await request(app).post('/api/transactions').set(auth).send({
      type: 'expense', amount: 100, accountId: acc.body.id, date: '2024-03-15',
    });

    const res = await request(app).delete(`/api/transactions/${tx.body.id}`).set(auth);
    expect(res.status).toBe(204);
  });
});

describe('DELETE /api/transactions (bulk)', () => {
  it('удаляет несколько транзакций → 204', async () => {
    const acc = await request(app).post('/api/accounts').set(auth).send(ACCOUNT);
    const base = { type: 'expense', amount: 100, accountId: acc.body.id, date: '2024-03-15' };
    const tx1 = await request(app).post('/api/transactions').set(auth).send(base);
    const tx2 = await request(app).post('/api/transactions').set(auth).send(base);

    const res = await request(app).delete('/api/transactions').set(auth)
      .send({ ids: [tx1.body.id, tx2.body.id] });
    expect(res.status).toBe(204);

    const list = await request(app).get('/api/transactions').set(auth);
    expect(list.body.total).toBe(0);
  });

  it('пустой массив ids → 400', async () => {
    const res = await request(app).delete('/api/transactions').set(auth)
      .send({ ids: [] });
    expect(res.status).toBe(400);
  });
});

// ─── /api/budgets ─────────────────────────────────────────────────────────────

describe('/api/budgets', () => {
  it('GET возвращает массив', async () => {
    const res = await request(app).get('/api/budgets').set(auth);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST создаёт бюджет', async () => {
    const cat = await request(app).post('/api/categories').set(auth).send(CATEGORY);
    const res = await request(app).post('/api/budgets').set(auth).send({
      categoryId: cat.body.id, amount: 5000, month: 3, year: 2024,
    });
    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(5000);
    expect(res.body.alertThreshold).toBe(80);
  });

  it('POST: month < 1 → 400', async () => {
    const cat = await request(app).post('/api/categories').set(auth).send(CATEGORY);
    const res = await request(app).post('/api/budgets').set(auth).send({
      categoryId: cat.body.id, amount: 5000, month: 0, year: 2024,
    });
    expect(res.status).toBe(400);
  });

  it('POST: month > 12 → 400', async () => {
    const cat = await request(app).post('/api/categories').set(auth).send(CATEGORY);
    const res = await request(app).post('/api/budgets').set(auth).send({
      categoryId: cat.body.id, amount: 5000, month: 13, year: 2024,
    });
    expect(res.status).toBe(400);
  });

  it('DELETE удаляет бюджет', async () => {
    const cat = await request(app).post('/api/categories').set(auth).send(CATEGORY);
    const bud = await request(app).post('/api/budgets').set(auth).send({
      categoryId: cat.body.id, amount: 5000, month: 3, year: 2024,
    });
    const res = await request(app).delete(`/api/budgets/${bud.body.id}`).set(auth);
    expect(res.status).toBe(204);
  });
});

// ─── /api/goals ───────────────────────────────────────────────────────────────

describe('/api/goals', () => {
  const GOAL = { name: 'Отпуск', targetAmount: 100000, icon: '✈️', color: '#3b82f6' };

  it('GET возвращает массив', async () => {
    const res = await request(app).get('/api/goals').set(auth);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST создаёт цель', async () => {
    const res = await request(app).post('/api/goals').set(auth).send(GOAL);
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Отпуск');
    expect(res.body.currentAmount).toBe(0);
    expect(res.body.isCompleted).toBe(false);
  });

  it('POST: отрицательная targetAmount → 400', async () => {
    const res = await request(app).post('/api/goals').set(auth)
      .send({ ...GOAL, targetAmount: -1 });
    expect(res.status).toBe(400);
  });

  it('POST: пустое name → 400', async () => {
    const res = await request(app).post('/api/goals').set(auth)
      .send({ ...GOAL, name: '' });
    expect(res.status).toBe(400);
  });

  it('POST взноса добавляет сумму к цели', async () => {
    const goal = await request(app).post('/api/goals').set(auth).send(GOAL);
    const res = await request(app)
      .post(`/api/goals/${goal.body.id}/contributions`).set(auth)
      .send({ amount: 25000, date: '2024-03-15' });
    expect(res.status).toBe(201);
    expect(res.body.currentAmount).toBe(25000);
  });

  it('DELETE удаляет цель', async () => {
    const goal = await request(app).post('/api/goals').set(auth).send(GOAL);
    const res = await request(app).delete(`/api/goals/${goal.body.id}`).set(auth);
    expect(res.status).toBe(204);
  });
});
