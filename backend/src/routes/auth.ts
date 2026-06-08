import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { JWT_SECRET } from '../middleware/auth';

const router = Router();

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  const username = process.env.APP_USERNAME;
  const password = process.env.APP_PASSWORD;

  if (!username || !password) {
    res.status(500).json({ error: 'APP_USERNAME или APP_PASSWORD не заданы в переменных окружения' });
    return;
  }

  if (!JWT_SECRET) {
    res.status(500).json({ error: 'JWT_SECRET не задан в переменных окружения' });
    return;
  }

  const result = LoginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Введите имя пользователя и пароль' });
    return;
  }
  const { username: reqUsername, password: reqPassword } = result.data;
  if (reqUsername !== username || reqPassword !== password) {
    res.status(401).json({ error: 'Неверный логин или пароль' });
    return;
  }
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token });
});

export default router;
