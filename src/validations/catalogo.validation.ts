import { z } from 'zod';

export const LIMIT_POR_DEFECTO = 12;
export const LIMIT_MAXIMO = 50;

// GET /api/productos
export const listarProductosQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(LIMIT_MAXIMO).default(LIMIT_POR_DEFECTO),
});

export type ListarProductosQuery = z.infer<typeof listarProductosQuerySchema>;
