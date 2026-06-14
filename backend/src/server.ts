import 'dotenv/config';

import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import app from './app';
import { startBot } from './bot';
import { prisma } from './lib/prisma';

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

console.log('[BOOT] Сервер стартует...');
console.log(`[BOOT] __dirname: ${__dirname}`);
console.log(`[BOOT] cwd: ${process.cwd()}`);

// Проверка обязательных переменных окружения
const requiredEnv = ['JWT_SECRET', 'APP_USERNAME', 'APP_PASSWORD'];
const missing = requiredEnv.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error(`[FATAL] Отсутствуют обязательные переменные окружения: ${missing.join(', ')}`);
  console.error('[FATAL] Приложение не может быть запущено. Проверьте файл .env или настройки хостинга.');
  process.exit(1);
}

console.log(`[STARTUP] PORT=${PORT}, HOST=${HOST}`);
console.log(`[STARTUP] NODE_ENV=${process.env.NODE_ENV || 'not set'}`);
console.log(`[STARTUP] ENV PORT from amvera: ${process.env.PORT || 'not set'}`);
console.log(`[STARTUP] DATABASE_URL: ${process.env.DATABASE_URL ? 'задан' : 'не задан'}`);

const server = app.listen(Number(PORT), HOST, () => {
  console.log(`[STARTUP] FinTrack backend running on http://${HOST}:${PORT}`);
  console.log('[STARTUP] Сервер успешно привязан к порту, ожидаю запросы');
  // Telegram bot temporarily disabled for debugging
  // if (process.env.TELEGRAM_BOT_TOKEN) {
  //   try {
  //     startBot();
  //   } catch (e) {
  //     console.error('[WARN] Не удалось запустить Telegram-бота:', e);
  //   }
  // }
});

server.on('error', (err) => {
  console.error('[SERVER ERROR]', err);
});

server.on('connection', (socket) => {
  console.log(`[TCP] Новое соединение от ${socket.remoteAddress}:${socket.remotePort}`);
});

// Heartbeat: пишем каждые 10 секунд, чтобы видеть, жив ли процесс
setInterval(() => {
  console.log(`[HEARTBEAT] Сервер жив, uptime: ${process.uptime()}s, memory: ${JSON.stringify(process.memoryUsage())}`);
}, 10000);

// Graceful shutdown
function shutdown(signal: string) {
  console.log(`[${signal}] Получен сигнал завершения, закрываю соединения...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('[SHUTDOWN] Сервер и БД корректно остановлены');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Rejection:', reason);
});
