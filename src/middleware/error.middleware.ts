import { Request, Response, NextFunction } from 'express';

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.status(404).json({
    status: 'error',
    code: 'NOT_FOUND',
    message: 'Ruta no encontrada',
    path: req.path
  });
};

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err?.statusCode || 500;
  const isDevelopment = process.env.NODE_ENV !== 'production';

  const code = err?.code || err?.name || 'INTERNAL_ERROR';

  try {
    const userInfo = (req as any).user ? ` user=${JSON.stringify((req as any).user)}` : '';
    console.error(`[Error] ${req.method} ${req.path} status=${statusCode} code=${code}${userInfo}`, err);
  } catch (logErr) {
    console.error('Error al loggear el error original', logErr);
  }

  const payload: any = {
    status: 'error',
    code,
    message: isDevelopment ? (err?.message || 'Error interno del servidor') : (err?.publicMessage || 'Error interno del servidor')
  };

  // Si es un error de autenticación, devolver la URL de login como mensaje
  if (statusCode === 401 || code === 'NO_TOKEN' || code === 'UNAUTHORIZED' || code === 'INVALID_TOKEN' || code === 'TOKEN_EXPIRED') {
    payload.message = 'http://localhost:5173/login';
  }

  if (isDevelopment && err?.stack) {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
};