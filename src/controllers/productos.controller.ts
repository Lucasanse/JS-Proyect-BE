import type { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AppError } from '../utils/AppError';
import { includeDetalle, includeResumen, mapearDetalle, mapearResumen } from '../utils/producto.mapper';
import type { Paginado, ProductoDetalle, ProductoResumen } from '../utils/catalogo.types';
import {
  listarProductosQuerySchema,
  productoParamsSchema,
  type FiltrosProducto,
  type OrdenProducto,
} from '../validations/catalogo.validation';

// Express 5 pasa al errorHandler los errores de funciones async
// (ZodError -> 400, AppError -> su status).

// Cada orden desempata por id para que la paginacion sea estable.
const ORDEN_PRISMA = {
  id: [{ idProducto: 'asc' }],
  nombre_asc: [{ nombre: 'asc' }, { idProducto: 'asc' }],
  nombre_desc: [{ nombre: 'desc' }, { idProducto: 'asc' }],
  precio_asc: [{ precio: 'asc' }, { idProducto: 'asc' }],
  precio_desc: [{ precio: 'desc' }, { idProducto: 'asc' }],
} as const satisfies Record<OrdenProducto, Prisma.ProductoOrderByWithRelationInput[]>;

function construirWhere(f: FiltrosProducto): Prisma.ProductoWhereInput {
  const where: Prisma.ProductoWhereInput = {};

  if (f.categoria !== undefined) where.idCategoria = f.categoria;
  if (f.marca !== undefined) where.marca = { equals: f.marca, mode: 'insensitive' };
  if (f.soloConStock) where.stock = { gt: 0 };

  if (f.precioMin !== undefined || f.precioMax !== undefined) {
    where.precio = { gte: f.precioMin, lte: f.precioMax };
  }

  if (f.q !== undefined) {
    const contiene = { contains: f.q, mode: 'insensitive' } as const;
    where.OR = [{ nombre: contiene }, { descripcion: contiene }, { marca: contiene }];
  }

  return where;
}

// GET /api/productos
export async function listarProductos(req: Request, res: Response<Paginado<ProductoResumen>>) {
  const { page, limit, orden, ...filtros } = listarProductosQuerySchema.parse(req.query);

  const where = construirWhere(filtros);
  const [productos, total] = await prisma.$transaction([
    prisma.producto.findMany({
      where,
      include: includeResumen,
      orderBy: ORDEN_PRISMA[orden],
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

// GET /api/productos/:id
export async function obtenerProducto(req: Request, res: Response<ProductoDetalle>) {
  const { id } = productoParamsSchema.parse(req.params);

  const producto = await prisma.producto.findUnique({
    where: { idProducto: id },
    include: includeDetalle,
  });
  if (!producto) throw new AppError(404, `Producto con id ${id} no encontrado`);

  res.json(mapearDetalle(producto));
}
