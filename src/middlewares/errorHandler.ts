import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';

// Middleware global de errores: cualquier error lanzado en una ruta termina aca.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Datos invalidos', detalles: err.issues });
  }

  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
}
