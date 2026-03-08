import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import app from '../app';
import { authMiddleware, JWT_SECRET } from '../middleware/auth';

// ─── authMiddleware (unit) ────────────────────────────────────────────────────

function makeRes() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function makeReq(authHeader?: string): Request {
  return { headers: { authorization: authHeader } } as unknown as Request;
}

describe('authMiddleware', () => {
  it('нет заголовка Authorization → 401', () => {
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Требуется авторизация' });
    expect(next).not.toHaveBeenCalled();
  });

  it('заголовок без "Bearer " → 401', () => {
    const req = makeReq('Token abc123');
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('невалидный токен → 401', () => {
    const req = makeReq('Bearer invalid.token.here');
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Токен недействителен или истёк' });
    expect(next).not.toHaveBeenCalled();
  });

  it('просроченный токен → 401', () => {
    const expired = jwt.sign({ username: 'test' }, JWT_SECRET, { expiresIn: '0s' });
    // небольшая задержка чтобы токен успел истечь
    const req = makeReq(`Bearer ${expired}`);
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    // Ждём 10мс — токен с expiresIn:'0s' считается просроченным немедленно
    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('валидный токен → вызывает next()', () => {
    const token = jwt.sign({ username: 'Herasova' }, JWT_SECRET, { expiresIn: '1h' });
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('токен с другим секретом → 401', () => {
    const token = jwt.sign({ username: 'Herasova' }, 'wrong-secret');
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

// ─── errorHandler (unit) ─────────────────────────────────────────────────────

import { errorHandler } from '../middleware/errorHandler';

describe('errorHandler', () => {
  it('ошибка с status < 500 → возвращает сообщение клиенту', () => {
    const err = Object.assign(new Error('Неверный ввод'), { status: 400 });
    const req = {} as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Неверный ввод' });
  });

  it('ошибка без status → 500 с generic-сообщением', () => {
    const err = new Error('что-то пошло не так');
    const req = {} as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
  });

  it('ошибка с status=500 → generic-сообщение (скрывает детали)', () => {
    const err = Object.assign(new Error('детали БД: ...'), { status: 500 });
    const req = {} as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    errorHandler(err, req, res, next);

    expect(res.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
  });

  it('ошибка с status=409 → возвращает сообщение', () => {
    const err = Object.assign(new Error('Конфликт'), { status: 409 });
    const req = {} as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Конфликт' });
  });
});

// ─── POST /api/auth/login (integration) ──────────────────────────────────────

describe('POST /api/auth/login', () => {
  it('верные учётные данные → 200 и token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'Herasova', password: '1Q2w3e4r' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
  });

  it('токен валиден и декодируется с правильным секретом', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'Herasova', password: '1Q2w3e4r' });

    const decoded = jwt.verify(res.body.token, JWT_SECRET) as jwt.JwtPayload;
    expect(decoded.username).toBe('Herasova');
  });

  it('неверный пароль → 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'Herasova', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('неверный логин → 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'Admin', password: '1Q2w3e4r' });

    expect(res.status).toBe(401);
  });

  it('пустое тело → 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});

    expect(res.status).toBe(400);
  });

  it('только username без password → 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'Herasova' });

    expect(res.status).toBe(400);
  });

  it('регистрозависимый логин — "herasova" → 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'herasova', password: '1Q2w3e4r' });

    expect(res.status).toBe(401);
  });
});

// ─── GET /api/health (public) ─────────────────────────────────────────────────

describe('GET /api/health', () => {
  it('возвращает { status: "ok" } без токена', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

// ─── Защищённые маршруты — проверка auth guard ────────────────────────────────

describe('защищённые маршруты без токена', () => {
  const routes = [
    { method: 'get', path: '/api/accounts' },
    { method: 'get', path: '/api/transactions' },
    { method: 'get', path: '/api/categories' },
    { method: 'get', path: '/api/budgets' },
    { method: 'get', path: '/api/goals' },
  ] as const;

  routes.forEach(({ method, path }) => {
    it(`${method.toUpperCase()} ${path} без токена → 401`, async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await (request(app) as any)[method](path);
      expect(res.status).toBe(401);
    });
  });
});
