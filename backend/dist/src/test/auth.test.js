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
// ─── authMiddleware (unit) ────────────────────────────────────────────────────
function makeRes() {
    const res = {};
    res.status = vitest_1.vi.fn().mockReturnValue(res);
    res.json = vitest_1.vi.fn().mockReturnValue(res);
    return res;
}
function makeReq(authHeader) {
    return { headers: { authorization: authHeader } };
}
(0, vitest_1.describe)('authMiddleware', () => {
    (0, vitest_1.it)('нет заголовка Authorization → 401', () => {
        const req = makeReq();
        const res = makeRes();
        const next = vitest_1.vi.fn();
        (0, auth_1.authMiddleware)(req, res, next);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(401);
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({ error: 'Требуется авторизация' });
        (0, vitest_1.expect)(next).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('заголовок без "Bearer " → 401', () => {
        const req = makeReq('Token abc123');
        const res = makeRes();
        const next = vitest_1.vi.fn();
        (0, auth_1.authMiddleware)(req, res, next);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(401);
        (0, vitest_1.expect)(next).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('невалидный токен → 401', () => {
        const req = makeReq('Bearer invalid.token.here');
        const res = makeRes();
        const next = vitest_1.vi.fn();
        (0, auth_1.authMiddleware)(req, res, next);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(401);
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({ error: 'Токен недействителен или истёк' });
        (0, vitest_1.expect)(next).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('просроченный токен → 401', () => {
        const expired = jsonwebtoken_1.default.sign({ username: 'test' }, auth_1.JWT_SECRET, { expiresIn: '0s' });
        // небольшая задержка чтобы токен успел истечь
        const req = makeReq(`Bearer ${expired}`);
        const res = makeRes();
        const next = vitest_1.vi.fn();
        // Ждём 10мс — токен с expiresIn:'0s' считается просроченным немедленно
        (0, auth_1.authMiddleware)(req, res, next);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(401);
        (0, vitest_1.expect)(next).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('валидный токен → вызывает next()', () => {
        const token = jsonwebtoken_1.default.sign({ username: 'Herasova' }, auth_1.JWT_SECRET, { expiresIn: '1h' });
        const req = makeReq(`Bearer ${token}`);
        const res = makeRes();
        const next = vitest_1.vi.fn();
        (0, auth_1.authMiddleware)(req, res, next);
        (0, vitest_1.expect)(next).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(res.status).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('токен с другим секретом → 401', () => {
        const token = jsonwebtoken_1.default.sign({ username: 'Herasova' }, 'wrong-secret');
        const req = makeReq(`Bearer ${token}`);
        const res = makeRes();
        const next = vitest_1.vi.fn();
        (0, auth_1.authMiddleware)(req, res, next);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(401);
        (0, vitest_1.expect)(next).not.toHaveBeenCalled();
    });
});
// ─── errorHandler (unit) ─────────────────────────────────────────────────────
const errorHandler_1 = require("../middleware/errorHandler");
(0, vitest_1.describe)('errorHandler', () => {
    (0, vitest_1.it)('ошибка с status < 500 → возвращает сообщение клиенту', () => {
        const err = Object.assign(new Error('Неверный ввод'), { status: 400 });
        const req = {};
        const res = makeRes();
        const next = vitest_1.vi.fn();
        (0, errorHandler_1.errorHandler)(err, req, res, next);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({ error: 'Неверный ввод' });
    });
    (0, vitest_1.it)('ошибка без status → 500 с generic-сообщением', () => {
        const err = new Error('что-то пошло не так');
        const req = {};
        const res = makeRes();
        const next = vitest_1.vi.fn();
        (0, errorHandler_1.errorHandler)(err, req, res, next);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(500);
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
    });
    (0, vitest_1.it)('ошибка с status=500 → generic-сообщение (скрывает детали)', () => {
        const err = Object.assign(new Error('детали БД: ...'), { status: 500 });
        const req = {};
        const res = makeRes();
        const next = vitest_1.vi.fn();
        (0, errorHandler_1.errorHandler)(err, req, res, next);
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
    });
    (0, vitest_1.it)('ошибка с status=409 → возвращает сообщение', () => {
        const err = Object.assign(new Error('Конфликт'), { status: 409 });
        const req = {};
        const res = makeRes();
        const next = vitest_1.vi.fn();
        (0, errorHandler_1.errorHandler)(err, req, res, next);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(409);
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({ error: 'Конфликт' });
    });
});
// ─── POST /api/auth/login (integration) ──────────────────────────────────────
(0, vitest_1.describe)('POST /api/auth/login', () => {
    (0, vitest_1.it)('верные учётные данные → 200 и token', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/auth/login')
            .send({ username: 'Herasova', password: '1Q2w3e4r' });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body).toHaveProperty('token');
        (0, vitest_1.expect)(typeof res.body.token).toBe('string');
    });
    (0, vitest_1.it)('токен валиден и декодируется с правильным секретом', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/auth/login')
            .send({ username: 'Herasova', password: '1Q2w3e4r' });
        const decoded = jsonwebtoken_1.default.verify(res.body.token, auth_1.JWT_SECRET);
        (0, vitest_1.expect)(decoded.username).toBe('Herasova');
    });
    (0, vitest_1.it)('неверный пароль → 401', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/auth/login')
            .send({ username: 'Herasova', password: 'wrong' });
        (0, vitest_1.expect)(res.status).toBe(401);
        (0, vitest_1.expect)(res.body).toHaveProperty('error');
    });
    (0, vitest_1.it)('неверный логин → 401', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/auth/login')
            .send({ username: 'Admin', password: '1Q2w3e4r' });
        (0, vitest_1.expect)(res.status).toBe(401);
    });
    (0, vitest_1.it)('пустое тело → 400', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/auth/login')
            .send({});
        (0, vitest_1.expect)(res.status).toBe(400);
    });
    (0, vitest_1.it)('только username без password → 400', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/auth/login')
            .send({ username: 'Herasova' });
        (0, vitest_1.expect)(res.status).toBe(400);
    });
    (0, vitest_1.it)('регистрозависимый логин — "herasova" → 401', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/auth/login')
            .send({ username: 'herasova', password: '1Q2w3e4r' });
        (0, vitest_1.expect)(res.status).toBe(401);
    });
});
// ─── GET /api/health (public) ─────────────────────────────────────────────────
(0, vitest_1.describe)('GET /api/health', () => {
    (0, vitest_1.it)('возвращает { status: "ok" } без токена', async () => {
        const res = await (0, supertest_1.default)(app_1.default).get('/api/health');
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body).toEqual({ status: 'ok' });
    });
});
// ─── Защищённые маршруты — проверка auth guard ────────────────────────────────
(0, vitest_1.describe)('защищённые маршруты без токена', () => {
    const routes = [
        { method: 'get', path: '/api/accounts' },
        { method: 'get', path: '/api/transactions' },
        { method: 'get', path: '/api/categories' },
        { method: 'get', path: '/api/budgets' },
        { method: 'get', path: '/api/goals' },
    ];
    routes.forEach(({ method, path }) => {
        (0, vitest_1.it)(`${method.toUpperCase()} ${path} без токена → 401`, async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const res = await (0, supertest_1.default)(app_1.default)[method](path);
            (0, vitest_1.expect)(res.status).toBe(401);
        });
    });
});
