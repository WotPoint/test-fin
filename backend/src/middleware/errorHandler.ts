import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error & { status?: number },
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const status = err.status ?? 500;
  if (status < 500) {
    res.status(status).json({ error: err.message });
  } else {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
