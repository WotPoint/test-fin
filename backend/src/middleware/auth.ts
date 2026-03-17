import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const _jwtSecret = process.env.JWT_SECRET;
if (!_jwtSecret) throw new Error('JWT_SECRET environment variable is required');
export const JWT_SECRET = _jwtSecret;

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Требуется авторизация' });
    return;
  }
  const token = header.slice(7);
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Токен недействителен или истёк' });
  }
}
