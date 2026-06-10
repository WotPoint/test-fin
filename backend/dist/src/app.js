"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const prisma_1 = require("./lib/prisma");
const errorHandler_1 = require("./middleware/errorHandler");
const auth_1 = require("./middleware/auth");
const auth_2 = __importDefault(require("./routes/auth"));
const accounts_1 = __importDefault(require("./routes/accounts"));
const transactions_1 = __importDefault(require("./routes/transactions"));
const categories_1 = __importDefault(require("./routes/categories"));
const subcategories_1 = __importDefault(require("./routes/subcategories"));
const budgets_1 = __importDefault(require("./routes/budgets"));
const goals_1 = __importDefault(require("./routes/goals"));
const recurring_1 = __importDefault(require("./routes/recurring"));
const app = (0, express_1.default)();
app.set('trust proxy', 1);
// ─── Rate limiting ────────────────────────────────────────────────────────────
const generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Слишком много запросов. Попробуйте позже.' },
});
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Слишком много попыток входа. Подождите 15 минут.' },
});
// ─── Middleware ───────────────────────────────────────────────────────────────
const corsOrigin = process.env.CORS_ORIGIN;
if (corsOrigin) {
    app.use((0, cors_1.default)({ origin: corsOrigin }));
}
app.use(express_1.default.json({ limit: '1mb' }));
app.use(generalLimiter);
// ─── Public routes ────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
    try {
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        res.json({ status: 'ok' });
    }
    catch {
        res.status(503).json({ status: 'error', message: 'Database unavailable' });
    }
});
app.use('/api/auth', authLimiter, auth_2.default);
// ─── Protected routes ─────────────────────────────────────────────────────────
app.use('/api', auth_1.authMiddleware);
app.use('/api/accounts', accounts_1.default);
app.use('/api/transactions', transactions_1.default);
app.use('/api/categories', categories_1.default);
app.use('/api/subcategories', subcategories_1.default);
app.use('/api/budgets', budgets_1.default);
app.use('/api/goals', goals_1.default);
app.use('/api/recurring', recurring_1.default);
// 404 для неизвестных /api маршрутов
app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
});
// Корневой health check для Amvera (должен отвечать 200)
app.get('/', (_req, res) => {
    res.status(200).send('ok');
});
// Дополнительный health check
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});
// Раздача React SPA в продакшене
// __dirname при запуске compiled JS: /app/backend/dist/src
// Фронтенд собирается в /app/dist (корень проекта)
const distPath = path_1.default.join(__dirname, '../../../dist');
console.log(`[APP] __dirname: ${__dirname}`);
console.log(`[APP] Serving static files from: ${distPath}`);
app.use(express_1.default.static(distPath));
app.get('*', (_req, res) => {
    const indexPath = path_1.default.join(distPath, 'index.html');
    console.log(`[APP] Serving index.html from: ${indexPath}`);
    res.sendFile(indexPath);
});
app.use(errorHandler_1.errorHandler);
exports.default = app;
