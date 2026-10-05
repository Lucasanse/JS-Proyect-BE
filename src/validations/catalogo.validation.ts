import { z } from 'zod';

export const LIMIT_POR_DEFECTO = 12;
export const LIMIT_MAXIMO = 50;

// GET /api/productos
// Todos los filtros son opcionales y se combinan entre si y con la paginacion.
export const listarProductosQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(LIMIT_MAXIMO).default(LIMIT_POR_DEFECTO),
    q: z.string().trim().min(1).max(100).optional(),
    categoria: z.coerce.number().int().min(1).optional(),
    marca: z.string().trim().min(1).max(100).optional(),
    precioMin: z.coerce.number().min(0).optional(),
    precioMax: z.coerce.number().min(0).optional(),
  })
  .refine((f) => f.precioMin === undefined || f.precioMax === undefined || f.precioMin <= f.precioMax, {
    message: 'precioMin no puede ser mayor que precioMax',
    path: ['precioMin'],
  });

export type ListarProductosQuery = z.infer<typeof listarProductosQuerySchema>;

// GET /api/marcas
// Si viene la categoria, solo se devuelven las marcas que tienen productos en ella.
export const listarMarcasQuerySchema = z.object({
  categoria: z.coerce.number().int().min(1).optional(),
});
