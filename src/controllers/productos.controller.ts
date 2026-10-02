import type { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { includeResumen, mapearResumen } from '../utils/producto.mapper';
import type { Paginado, ProductoResumen } from '../utils/catalogo.types';
import { listarProductosQuerySchema } from '../validations/catalogo.validation';

// Express 5 pasa al errorHandler los errores de funciones async
// (ZodError -> 400, AppError -> su status).

// GET /api/productos?q=&categoria=&marca=&precioMin=&precioMax=&page=&limit=
export async function listarProductos(req: Request, res: Response<Paginado<ProductoResumen>>) {
  const { page, limit, q, categoria, marca, precioMin, precioMax } = listarProductosQuerySchema.parse(req.query);

  // Los filtros que no vienen quedan undefined y Prisma los ignora.
  const where: Prisma.ProductoWhereInput = {
    nombre: q ? { contains: q, mode: 'insensitive' } : undefined,
    idCategoria: categoria,
    marca: marca ? { equals: marca, mode: 'insensitive' } : undefined,
    precio: { gte: precioMin, lte: precioMax },
  };

  const [productos, total] = await prisma.$transaction([
    prisma.producto.findMany({
      where,
      include: includeResumen,
      orderBy: { idProducto: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.producto.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);
  res.json({
    data: productos.map(mapearResumen),
    paginacion: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
  });
}

// GET /api/marcas
export async function listarMarcas(_req: Request, res: Response<string[]>) {
  const marcas = await prisma.producto.findMany({
    distinct: ['marca'],
    select: { marca: true },
    orderBy: { marca: 'asc' },
  });
  res.json(marcas.map((m) => m.marca));
}
