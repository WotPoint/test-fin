import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import app from './app';
import { startBot } from './bot';
import { prisma } from './lib/prisma';

const PORT = process.env.PORT || 3001;

// Проверка обязательных переменных окружения
const requiredEnv = ['JWT_SECRET', 'APP_USERNAME', 'APP_PASSWORD'];
const missing = requiredEnv.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error(`[FATAL] Отсутствуют обязательные переменные окружения: ${missing.join(', ')}`);
  console.error('[FATAL] Приложение не может быть запущено. Проверьте файл .env или настройки хостинга.');
  process.exit(1);
}

const server = app.listen(PORT, () => {
  console.log(`FinTrack backend running on http://localhost:${PORT}`);
  if (process.env.TELEGRAM_BOT_TOKEN) {
    try {
      startBot();
    } catch (e) {
      console.error('[WARN] Не удалось запустить Telegram-бота:', e);
    }
  }
});

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
