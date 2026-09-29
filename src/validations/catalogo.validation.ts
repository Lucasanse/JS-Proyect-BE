import { z } from 'zod';

export const LIMIT_POR_DEFECTO = 12;
export const LIMIT_MAXIMO = 50;

export const ORDENES_PRODUCTO = ['id', 'nombre_asc', 'nombre_desc', 'precio_asc', 'precio_desc'] as const;
export type OrdenProducto = (typeof ORDENES_PRODUCTO)[number];

const idPositivo = z.coerce
  .number({ error: 'Debe ser un numero' })
  .int('Debe ser un numero entero')
  .positive('Debe ser mayor a 0');
const precio = z.coerce.number({ error: 'Debe ser un numero' }).nonnegative('No puede ser negativo');

// GET /api/productos
export const listarProductosQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(LIMIT_MAXIMO).default(LIMIT_POR_DEFECTO),
    categoria: idPositivo.optional(),
    marca: z.string().trim().min(1).optional(),
    precioMin: precio.optional(),
    precioMax: precio.optional(),
    q: z.string().trim().min(1).max(100).optional(),
    soloConStock: z.stringbool().default(false),
    orden: z.enum(ORDENES_PRODUCTO).default('id'),
  })
  .refine((f) => f.precioMin === undefined || f.precioMax === undefined || f.precioMin <= f.precioMax, {
    message: 'precioMin no puede ser mayor que precioMax',
    path: ['precioMin'],
  });

// GET /api/productos/:id
export const productoParamsSchema = z.object({ id: idPositivo });

// GET /api/marcas
export const listarMarcasQuerySchema = z.object({ categoria: idPositivo.optional() });

export type ListarProductosQuery = z.infer<typeof listarProductosQuerySchema>;
export type FiltrosProducto = Omit<ListarProductosQuery, 'page' | 'limit' | 'orden'>;
export type ListarMarcasQuery = z.infer<typeof listarMarcasQuerySchema>;
