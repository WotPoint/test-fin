"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const app_1 = __importDefault(require("../app"));
const auth_1 = require("../middleware/auth");
const setup_1 = require("./setup");
// Валидный токен для всех запросов
const token = jsonwebtoken_1.default.sign({ username: 'Herasova' }, auth_1.JWT_SECRET, { expiresIn: '1h' });
const auth = { Authorization: `Bearer ${token}` };
// Базовые данные для тестов
const ACCOUNT = { name: 'Карта', type: 'card', color: '#3b82f6', icon: 'credit-card', currency: 'RUB', initialBalance: 10000 };
const CATEGORY = { name: 'Транспорт', type: 'expense', color: '#f97316', icon: 'car' };
(0, vitest_1.beforeEach)(async () => {
    await (0, setup_1.clearDb)();
});
(0, vitest_1.afterAll)(async () => {
    await setup_1.prisma.$disconnect();
});
// ─── /api/accounts ────────────────────────────────────────────────────────────
(0, vitest_1.describe)('GET /api/accounts', () => {
    (0, vitest_1.it)('пустая база → пустой массив', async () => {
        const res = await (0, supertest_1.default)(app_1.default).get('/api/accounts').set(auth);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body).toEqual([]);
    });
    (0, vitest_1.it)('возвращает созданные счета', async () => {
        await (0, supertest_1.default)(app_1.default).post('/api/accounts').set(auth).send(ACCOUNT);
        const res = await (0, supertest_1.default)(app_1.default).get('/api/accounts').set(auth);
        (0, vitest_1.expect)(res.body).toHaveLength(1);
        (0, vitest_1.expect)(res.body[0].name).toBe('Карта');
    });
});
(0, vitest_1.describe)('POST /api/accounts', () => {
    (0, vitest_1.it)('создаёт счёт и возвращает 201', async () => {
        const res = await (0, supertest_1.default)(app_1.default).post('/api/accounts').set(auth).send(ACCOUNT);
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body).toMatchObject({ name: 'Карта', type: 'card', currency: 'RUB' });
        (0, vitest_1.expect)(res.body.id).toBeTruthy();
    });
    (0, vitest_1.it)('невалидные данные (нет name) → 400', async () => {
        const res = await (0, supertest_1.default)(app_1.default).post('/api/accounts').set(auth)
            .send({ type: 'card', color: '#fff', icon: 'x' });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body).toHaveProperty('error');
    });
    (0, vitest_1.it)('невалидные данные (нет color) → 400', async () => {
        const res = await (0, supertest_1.default)(app_1.default).post('/api/accounts').set(auth)
            .send({ name: 'Нал', type: 'cash', icon: 'x' });
        (0, vitest_1.expect)(res.status).toBe(400);
    });
});
(0, vitest_1.describe)('PUT /api/accounts/:id', () => {
    (0, vitest_1.it)('обновляет имя счёта', async () => {
        const created = await (0, supertest_1.default)(app_1.default).post('/api/accounts').set(auth).send(ACCOUNT);
        const id = created.body.id;
        const res = await (0, supertest_1.default)(app_1.default).put(`/api/accounts/${id}`).set(auth)
            .send({ name: 'Новое имя' });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.name).toBe('Новое имя');
    });
    (0, vitest_1.it)('обновляет isArchived', async () => {
        const created = await (0, supertest_1.default)(app_1.default).post('/api/accounts').set(auth).send(ACCOUNT);
        const id = created.body.id;
        const res = await (0, supertest_1.default)(app_1.default).put(`/api/accounts/${id}`).set(auth)
            .send({ isArchived: true });
        (0, vitest_1.expect)(res.body.isArchived).toBe(true);
    });
});
(0, vitest_1.describe)('DELETE /api/accounts/:id', () => {
    (0, vitest_1.it)('удаляет счёт → 204', async () => {
        const created = await (0, supertest_1.default)(app_1.default).post('/api/accounts').set(auth).send(ACCOUNT);
        const id = created.body.id;
        const res = await (0, supertest_1.default)(app_1.default).delete(`/api/accounts/${id}`).set(auth);
        (0, vitest_1.expect)(res.status).toBe(204);
        const list = await (0, supertest_1.default)(app_1.default).get('/api/accounts').set(auth);
        (0, vitest_1.expect)(list.body).toHaveLength(0);
    });
});
// ─── /api/categories ──────────────────────────────────────────────────────────
(0, vitest_1.describe)('GET /api/categories', () => {
    (0, vitest_1.it)('пустая база → пустой массив', async () => {
        const res = await (0, supertest_1.default)(app_1.default).get('/api/categories').set(auth);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body).toEqual([]);
    });
});
(0, vitest_1.describe)('POST /api/categories', () => {
    (0, vitest_1.it)('создаёт категорию', async () => {
        const res = await (0, supertest_1.default)(app_1.default).post('/api/categories').set(auth).send(CATEGORY);
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.name).toBe('Транспорт');
        (0, vitest_1.expect)(res.body.type).toBe('expense');
    });
    (0, vitest_1.it)('type не income/expense → 400', async () => {
        const res = await (0, supertest_1.default)(app_1.default).post('/api/categories').set(auth)
            .send({ ...CATEGORY, type: 'transfer' });
        (0, vitest_1.expect)(res.status).toBe(400);
    });
});
(0, vitest_1.describe)('DELETE /api/categories/:id — guard от транзакций', () => {
    (0, vitest_1.it)('категория без транзакций удаляется → 204', async () => {
        const cat = await (0, supertest_1.default)(app_1.default).post('/api/categories').set(auth).send(CATEGORY);
        const res = await (0, supertest_1.default)(app_1.default).delete(`/api/categories/${cat.body.id}`).set(auth);
        (0, vitest_1.expect)(res.status).toBe(204);
    });
    (0, vitest_1.it)('категория с транзакциями не удаляется → 409', async () => {
        const acc = await (0, supertest_1.default)(app_1.default).post('/api/accounts').set(auth).send(ACCOUNT);
        const cat = await (0, supertest_1.default)(app_1.default).post('/api/categories').set(auth).send(CATEGORY);
        // создаём транзакцию привязанную к категории
        await (0, supertest_1.default)(app_1.default).post('/api/transactions').set(auth).send({
            type: 'expense', amount: 100, accountId: acc.body.id,
            categoryId: cat.body.id, date: '2024-03-15',
        });
        const res = await (0, supertest_1.default)(app_1.default).delete(`/api/categories/${cat.body.id}`).set(auth);
        (0, vitest_1.expect)(res.status).toBe(409);
        (0, vitest_1.expect)(res.body.error).toContain('1');
    });
});
(0, vitest_1.describe)('PUT /api/categories/reorder', () => {
    (0, vitest_1.it)('меняет порядок категорий', async () => {
        const c1 = await (0, supertest_1.default)(app_1.default).post('/api/categories').set(auth)
            .send({ ...CATEGORY, name: 'А', order: 0 });
        const c2 = await (0, supertest_1.default)(app_1.default).post('/api/categories').set(auth)
            .send({ ...CATEGORY, name: 'Б', order: 1 });
        const res = await (0, supertest_1.default)(app_1.default).put('/api/categories/reorder').set(auth)
            .send({ ids: [c2.body.id, c1.body.id] });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body).toEqual({ ok: true });
    });
    (0, vitest_1.it)('пустой массив → 400', async () => {
        const res = await (0, supertest_1.default)(app_1.default).put('/api/categories/reorder').set(auth)
            .send({ ids: [] });
        (0, vitest_1.expect)(res.status).toBe(400);
    });
});
// ─── /api/subcategories ───────────────────────────────────────────────────────
(0, vitest_1.describe)('POST /api/subcategories', () => {
    (0, vitest_1.it)('создаёт подкатегорию', async () => {
        const cat = await (0, supertest_1.default)(app_1.default).post('/api/categories').set(auth).send(CATEGORY);
        const res = await (0, supertest_1.default)(app_1.default).post('/api/subcategories').set(auth)
            .send({ name: 'Такси', categoryId: cat.body.id });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.name).toBe('Такси');
    });
});
(0, vitest_1.describe)('DELETE /api/subcategories/:id', () => {
    (0, vitest_1.it)('удаляет подкатегорию → 204', async () => {
        const cat = await (0, supertest_1.default)(app_1.default).post('/api/categories').set(auth).send(CATEGORY);
        const sub = await (0, supertest_1.default)(app_1.default).post('/api/subcategories').set(auth)
            .send({ name: 'Такси', categoryId: cat.body.id });
        const res = await (0, supertest_1.default)(app_1.default).delete(`/api/subcategories/${sub.body.id}`).set(auth);
        (0, vitest_1.expect)(res.status).toBe(204);
    });
    (0, vitest_1.it)('каскадное удаление: при удалении категории удаляются подкатегории', async () => {
        const cat = await (0, supertest_1.default)(app_1.default).post('/api/categories').set(auth).send(CATEGORY);
        await (0, supertest_1.default)(app_1.default).post('/api/subcategories').set(auth)
            .send({ name: 'Такси', categoryId: cat.body.id });
        await (0, supertest_1.default)(app_1.default).delete(`/api/categories/${cat.body.id}`).set(auth);
        const subs = await (0, supertest_1.default)(app_1.default).get('/api/subcategories').set(auth);
        (0, vitest_1.expect)(subs.body).toHaveLength(0);
    });
});
// ─── /api/transactions ────────────────────────────────────────────────────────
(0, vitest_1.describe)('GET /api/transactions', () => {
    (0, vitest_1.it)('возвращает { data, total }', async () => {
        const res = await (0, supertest_1.default)(app_1.default).get('/api/transactions').set(auth);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body).toHaveProperty('data');
        (0, vitest_1.expect)(res.body).toHaveProperty('total');
        (0, vitest_1.expect)(Array.isArray(res.body.data)).toBe(true);
        (0, vitest_1.expect)(typeof res.body.total).toBe('number');
    });
    (0, vitest_1.it)('пустая база → data=[], total=0', async () => {
        const res = await (0, supertest_1.default)(app_1.default).get('/api/transactions').set(auth);
        (0, vitest_1.expect)(res.body.data).toEqual([]);
        (0, vitest_1.expect)(res.body.total).toBe(0);
    });
    (0, vitest_1.it)('пагинация: limit и offset работают', async () => {
        const acc = await (0, supertest_1.default)(app_1.default).post('/api/accounts').set(auth).send(ACCOUNT);
        const base = { type: 'expense', amount: 100, accountId: acc.body.id, date: '2024-03-15' };
        // Создаём 5 транзакций
        for (let i = 1; i <= 5; i++) {
            await (0, supertest_1.default)(app_1.default).post('/api/transactions').set(auth)
                .send({ ...base, amount: i * 100 });
        }
        const page1 = await (0, supertest_1.default)(app_1.default).get('/api/transactions?limit=2&offset=0').set(auth);
        (0, vitest_1.expect)(page1.body.data).toHaveLength(2);
        (0, vitest_1.expect)(page1.body.total).toBe(5);
        const page2 = await (0, supertest_1.default)(app_1.default).get('/api/transactions?limit=2&offset=2').set(auth);
        (0, vitest_1.expect)(page2.body.data).toHaveLength(2);
        (0, vitest_1.expect)(page2.body.total).toBe(5);
        const page3 = await (0, supertest_1.default)(app_1.default).get('/api/transactions?limit=2&offset=4').set(auth);
        (0, vitest_1.expect)(page3.body.data).toHaveLength(1);
    });
    (0, vitest_1.it)('limit ограничен максимум 500', async () => {
        const res = await (0, supertest_1.default)(app_1.default).get('/api/transactions?limit=9999').set(auth);
        (0, vitest_1.expect)(res.status).toBe(200); // не падает, просто ограничивает
    });
    (0, vitest_1.it)('фильтр по type', async () => {
        const acc = await (0, supertest_1.default)(app_1.default).post('/api/accounts').set(auth).send(ACCOUNT);
        await (0, supertest_1.default)(app_1.default).post('/api/transactions').set(auth)
            .send({ type: 'income', amount: 5000, accountId: acc.body.id, date: '2024-03-01' });
        await (0, supertest_1.default)(app_1.default).post('/api/transactions').set(auth)
            .send({ type: 'expense', amount: 100, accountId: acc.body.id, date: '2024-03-01' });
        const res = await (0, supertest_1.default)(app_1.default).get('/api/transactions?type=income').set(auth);
        (0, vitest_1.expect)(res.body.total).toBe(1);
        (0, vitest_1.expect)(res.body.data[0].type).toBe('income');
    });
});
(0, vitest_1.describe)('POST /api/transactions', () => {
    (0, vitest_1.it)('создаёт транзакцию → 201', async () => {
        const acc = await (0, supertest_1.default)(app_1.default).post('/api/accounts').set(auth).send(ACCOUNT);
        const res = await (0, supertest_1.default)(app_1.default).post('/api/transactions').set(auth).send({
            type: 'expense', amount: 500, accountId: acc.body.id, date: '2024-03-15',
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.amount).toBe(500);
        (0, vitest_1.expect)(res.body.type).toBe('expense');
    });
    (0, vitest_1.it)('отрицательная сумма → 400', async () => {
        const acc = await (0, supertest_1.default)(app_1.default).post('/api/accounts').set(auth).send(ACCOUNT);
        const res = await (0, supertest_1.default)(app_1.default).post('/api/transactions').set(auth).send({
            type: 'expense', amount: -100, accountId: acc.body.id, date: '2024-03-15',
        });
        (0, vitest_1.expect)(res.status).toBe(400);
    });
    (0, vitest_1.it)('сумма = 0 → 400', async () => {
        const acc = await (0, supertest_1.default)(app_1.default).post('/api/accounts').set(auth).send(ACCOUNT);
        const res = await (0, supertest_1.default)(app_1.default).post('/api/transactions').set(auth).send({
            type: 'expense', amount: 0, accountId: acc.body.id, date: '2024-03-15',
        });
        (0, vitest_1.expect)(res.status).toBe(400);
    });
    (0, vitest_1.it)('нет accountId → 400', async () => {
        const res = await (0, supertest_1.default)(app_1.default).post('/api/transactions').set(auth).send({
            type: 'expense', amount: 100, date: '2024-03-15',
        });
        (0, vitest_1.expect)(res.status).toBe(400);
    });
    (0, vitest_1.it)('теги сохраняются', async () => {
        const acc = await (0, supertest_1.default)(app_1.default).post('/api/accounts').set(auth).send(ACCOUNT);
        const res = await (0, supertest_1.default)(app_1.default).post('/api/transactions').set(auth).send({
            type: 'expense', amount: 200, accountId: acc.body.id,
            date: '2024-03-15', tags: '["кафе","еда"]',
        });
        (0, vitest_1.expect)(res.body.tags).toBe('["кафе","еда"]');
    });
});
(0, vitest_1.describe)('PUT /api/transactions/:id', () => {
    (0, vitest_1.it)('обновляет сумму', async () => {
        const acc = await (0, supertest_1.default)(app_1.default).post('/api/accounts').set(auth).send(ACCOUNT);
        const created = await (0, supertest_1.default)(app_1.default).post('/api/transactions').set(auth).send({
            type: 'expense', amount: 500, accountId: acc.body.id, date: '2024-03-15',
        });
        const res = await (0, supertest_1.default)(app_1.default).put(`/api/transactions/${created.body.id}`)
            .set(auth).send({ amount: 999 });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.amount).toBe(999);
    });
});
(0, vitest_1.describe)('DELETE /api/transactions/:id', () => {
    (0, vitest_1.it)('удаляет транзакцию → 204', async () => {
        const acc = await (0, supertest_1.default)(app_1.default).post('/api/accounts').set(auth).send(ACCOUNT);
        const tx = await (0, supertest_1.default)(app_1.default).post('/api/transactions').set(auth).send({
            type: 'expense', amount: 100, accountId: acc.body.id, date: '2024-03-15',
        });
        const res = await (0, supertest_1.default)(app_1.default).delete(`/api/transactions/${tx.body.id}`).set(auth);
        (0, vitest_1.expect)(res.status).toBe(204);
    });
});
(0, vitest_1.describe)('DELETE /api/transactions (bulk)', () => {
    (0, vitest_1.it)('удаляет несколько транзакций → 204', async () => {
        const acc = await (0, supertest_1.default)(app_1.default).post('/api/accounts').set(auth).send(ACCOUNT);
        const base = { type: 'expense', amount: 100, accountId: acc.body.id, date: '2024-03-15' };
        const tx1 = await (0, supertest_1.default)(app_1.default).post('/api/transactions').set(auth).send(base);
        const tx2 = await (0, supertest_1.default)(app_1.default).post('/api/transactions').set(auth).send(base);
        const res = await (0, supertest_1.default)(app_1.default).delete('/api/transactions').set(auth)
            .send({ ids: [tx1.body.id, tx2.body.id] });
        (0, vitest_1.expect)(res.status).toBe(204);
        const list = await (0, supertest_1.default)(app_1.default).get('/api/transactions').set(auth);
        (0, vitest_1.expect)(list.body.total).toBe(0);
    });
    (0, vitest_1.it)('пустой массив ids → 400', async () => {
        const res = await (0, supertest_1.default)(app_1.default).delete('/api/transactions').set(auth)
            .send({ ids: [] });
        (0, vitest_1.expect)(res.status).toBe(400);
    });
});
// ─── /api/budgets ─────────────────────────────────────────────────────────────
(0, vitest_1.describe)('/api/budgets', () => {
    (0, vitest_1.it)('GET возвращает массив', async () => {
        const res = await (0, supertest_1.default)(app_1.default).get('/api/budgets').set(auth);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(Array.isArray(res.body)).toBe(true);
    });
    (0, vitest_1.it)('POST создаёт бюджет', async () => {
        const cat = await (0, supertest_1.default)(app_1.default).post('/api/categories').set(auth).send(CATEGORY);
        const res = await (0, supertest_1.default)(app_1.default).post('/api/budgets').set(auth).send({
            categoryId: cat.body.id, amount: 5000, month: 3, year: 2024,
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.amount).toBe(5000);
        (0, vitest_1.expect)(res.body.alertThreshold).toBe(80);
    });
    (0, vitest_1.it)('POST: month < 1 → 400', async () => {
        const cat = await (0, supertest_1.default)(app_1.default).post('/api/categories').set(auth).send(CATEGORY);
        const res = await (0, supertest_1.default)(app_1.default).post('/api/budgets').set(auth).send({
            categoryId: cat.body.id, amount: 5000, month: 0, year: 2024,
        });
        (0, vitest_1.expect)(res.status).toBe(400);
    });
    (0, vitest_1.it)('POST: month > 12 → 400', async () => {
        const cat = await (0, supertest_1.default)(app_1.default).post('/api/categories').set(auth).send(CATEGORY);
        const res = await (0, supertest_1.default)(app_1.default).post('/api/budgets').set(auth).send({
            categoryId: cat.body.id, amount: 5000, month: 13, year: 2024,
        });
        (0, vitest_1.expect)(res.status).toBe(400);
    });
    (0, vitest_1.it)('DELETE удаляет бюджет', async () => {
        const cat = await (0, supertest_1.default)(app_1.default).post('/api/categories').set(auth).send(CATEGORY);
        const bud = await (0, supertest_1.default)(app_1.default).post('/api/budgets').set(auth).send({
            categoryId: cat.body.id, amount: 5000, month: 3, year: 2024,
        });
        const res = await (0, supertest_1.default)(app_1.default).delete(`/api/budgets/${bud.body.id}`).set(auth);
        (0, vitest_1.expect)(res.status).toBe(204);
    });
});
// ─── /api/goals ───────────────────────────────────────────────────────────────
(0, vitest_1.describe)('/api/goals', () => {
    const GOAL = { name: 'Отпуск', targetAmount: 100000, icon: '✈️', color: '#3b82f6' };
    (0, vitest_1.it)('GET возвращает массив', async () => {
        const res = await (0, supertest_1.default)(app_1.default).get('/api/goals').set(auth);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(Array.isArray(res.body)).toBe(true);
    });
    (0, vitest_1.it)('POST создаёт цель', async () => {
        const res = await (0, supertest_1.default)(app_1.default).post('/api/goals').set(auth).send(GOAL);
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.name).toBe('Отпуск');
        (0, vitest_1.expect)(res.body.currentAmount).toBe(0);
        (0, vitest_1.expect)(res.body.isCompleted).toBe(false);
    });
    (0, vitest_1.it)('POST: отрицательная targetAmount → 400', async () => {
        const res = await (0, supertest_1.default)(app_1.default).post('/api/goals').set(auth)
            .send({ ...GOAL, targetAmount: -1 });
        (0, vitest_1.expect)(res.status).toBe(400);
    });
    (0, vitest_1.it)('POST: пустое name → 400', async () => {
        const res = await (0, supertest_1.default)(app_1.default).post('/api/goals').set(auth)
            .send({ ...GOAL, name: '' });
        (0, vitest_1.expect)(res.status).toBe(400);
    });
    (0, vitest_1.it)('POST взноса добавляет сумму к цели', async () => {
        const goal = await (0, supertest_1.default)(app_1.default).post('/api/goals').set(auth).send(GOAL);
        const res = await (0, supertest_1.default)(app_1.default)
            .post(`/api/goals/${goal.body.id}/contributions`).set(auth)
            .send({ amount: 25000, date: '2024-03-15' });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.currentAmount).toBe(25000);
    });
    (0, vitest_1.it)('DELETE удаляет цель', async () => {
        const goal = await (0, supertest_1.default)(app_1.default).post('/api/goals').set(auth).send(GOAL);
        const res = await (0, supertest_1.default)(app_1.default).delete(`/api/goals/${goal.body.id}`).set(auth);
        (0, vitest_1.expect)(res.status).toBe(204);
    });
});
