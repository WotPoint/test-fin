import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export function errorHandler(
  err: Error & { status?: number },
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  // Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Запись не найдена' });
      return;
    }
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Запись уже существует' });
      return;
    }
    console.error('[Prisma]', err.code, err.message);
    res.status(500).json({ error: 'Ошибка базы данных' });
    return;
  }

  // Prisma validation / connection errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({ error: 'Некорректные данные для базы данных' });
    return;
  }

  const status = err.status ?? 500;
  if (status < 500) {
    res.status(status).json({ error: err.message });
  } else {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
