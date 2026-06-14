import express from 'express';
import cors from 'cors';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { prisma } from './lib/prisma';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import authRouter from './routes/auth';
import accountsRouter from './routes/accounts';
import transactionsRouter from './routes/transactions';
import categoriesRouter from './routes/categories';
import subcategoriesRouter from './routes/subcategories';
import budgetsRouter from './routes/budgets';
import goalsRouter from './routes/goals';
import recurringRouter from './routes/recurring';

const app = express();

app.set('trust proxy', 1);

// ─── Request logging ───────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  const clientIp = req.ip || req.socket.remoteAddress;
  console.log(`[REQUEST] ${req.method} ${req.url} from ${clientIp}`);

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[RESPONSE] ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
  });

  next();
});

// ─── Rate limiting ────────────────────────────────────────────────────────────

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много запросов. Попробуйте позже.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много попыток входа. Подождите 15 минут.' },
});

// ─── Health checks (без rate limiting, чтобы Amvera всегда видела сервис) ─────

// Корневой health check для Amvera (должен отвечать 200)
app.get('/', (_req, res) => {
  res.status(200).send('ok');
});

// Дополнительный health check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'error', message: 'Database unavailable' });
  }
});

// ─── Middleware ───────────────────────────────────────────────────────────────

const corsOrigin = process.env.CORS_ORIGIN;
if (corsOrigin) {
  app.use(cors({ origin: corsOrigin }));
}
app.use(express.json({ limit: '1mb' }));
app.use(generalLimiter);

// ─── Public routes ────────────────────────────────────────────────────────────

app.use('/api/auth', authLimiter, authRouter);

// ─── Protected routes ─────────────────────────────────────────────────────────

app.use('/api', authMiddleware);

app.use('/api/accounts',       accountsRouter);
app.use('/api/transactions',   transactionsRouter);
app.use('/api/categories',     categoriesRouter);
app.use('/api/subcategories',  subcategoriesRouter);
app.use('/api/budgets',        budgetsRouter);
app.use('/api/goals',          goalsRouter);
app.use('/api/recurring',      recurringRouter);

// 404 для неизвестных /api маршрутов
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Раздача React SPA в продакшене
// __dirname при запуске compiled JS: /app/backend/dist/src
// Фронтенд собирается в /app/dist (корень проекта)
const distPath = path.join(__dirname, '../../../dist');
console.log(`[APP] __dirname: ${__dirname}`);
console.log(`[APP] Serving static files from: ${distPath}`);
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  console.log(`[APP] Serving index.html from: ${indexPath}`);
  res.sendFile(indexPath);
});

app.use(errorHandler);

export default app;
