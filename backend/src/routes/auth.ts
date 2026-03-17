import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { JWT_SECRET } from '../middleware/auth';

const router = Router();

const USERNAME = process.env.APP_USERNAME;
if (!USERNAME) throw new Error('APP_USERNAME environment variable is required');
const PASSWORD = process.env.APP_PASSWORD;
if (!PASSWORD) throw new Error('APP_PASSWORD environment variable is required');

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  const result = LoginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Введите имя пользователя и пароль' });
    return;
  }
  const { username, password } = result.data;
  if (username !== USERNAME || password !== PASSWORD) {
    res.status(401).json({ error: 'Неверный логин или пароль' });
    return;
  }
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token });
});

export default router;
