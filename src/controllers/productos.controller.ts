import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { includeResumen, mapearResumen } from '../utils/producto.mapper';
import type { Paginado, ProductoResumen } from '../utils/catalogo.types';
import { listarProductosQuerySchema } from '../validations/catalogo.validation';

// Express 5 pasa al errorHandler los errores de funciones async
// (ZodError -> 400, AppError -> su status).

// GET /api/productos
export async function listarProductos(req: Request, res: Response<Paginado<ProductoResumen>>) {
  const { page, limit } = listarProductosQuerySchema.parse(req.query);

  const [productos, total] = await prisma.$transaction([
    prisma.producto.findMany({
      include: includeResumen,
      orderBy: { idProducto: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.producto.count(),
  ]);

  const totalPages = Math.ceil(total / limit);
  res.json({
    data: productos.map(mapearResumen),
    paginacion: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
  });
}
