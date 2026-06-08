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

// ─── Middleware ───────────────────────────────────────────────────────────────

const corsOrigin = process.env.CORS_ORIGIN;
if (corsOrigin) {
  app.use(cors({ origin: corsOrigin }));
}
app.use(express.json({ limit: '1mb' }));
app.use(generalLimiter);

// ─── Public routes ────────────────────────────────────────────────────────────

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'error', message: 'Database unavailable' });
  }
});
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
const distPath = path.join(__dirname, '../../dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.use(errorHandler);

export default app;
