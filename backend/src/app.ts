import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
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

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.use(generalLimiter);

// ─── Public routes ────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
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

app.use(errorHandler);

export default app;
