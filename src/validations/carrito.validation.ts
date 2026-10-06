import { z } from 'zod';

// POST /api/carrito/items
export const agregarItemSchema = z.object({
  idProducto: z.coerce.number().int().min(1),
  cantidad: z.coerce.number().int().min(1).default(1),
});

// PATCH /api/carrito/items/:idProducto
export const modificarCantidadSchema = z.object({
  cantidad: z.coerce.number().int().min(1),
});

// :idProducto en la URL
export const idProductoParamSchema = z.object({
  idProducto: z.coerce.number().int().min(1),
});
