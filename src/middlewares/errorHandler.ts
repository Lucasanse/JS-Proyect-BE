import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { MulterError } from 'multer';
import { AppError } from '../utils/AppError';
import { MAX_MB_IMAGEN } from './subirImagen';

// Middleware global de errores: cualquier error lanzado en una ruta termina aca.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Datos invalidos', detalles: err.issues });
  }

  // Body que no es JSON valido (lo lanza express.json)
  if (err instanceof SyntaxError && 'type' in err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
  }

  // Errores de la subida de imagenes (archivo muy grande, mas de un archivo, etc.)
  if (err instanceof MulterError) {
    const mensaje =
      err.code === 'LIMIT_FILE_SIZE' ? `La imagen no puede superar los ${MAX_MB_IMAGEN} MB` : 'No se pudo subir la imagen';
    return res.status(400).json({ error: mensaje });
  }

  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
}
