import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { crearIncludeResumen, mapearResumen } from "../utils/producto.mapper";
import type { Paginado, ProductoResumen } from "../utils/catalogo.types";
import {
  listarMarcasQuerySchema,
  listarProductosQuerySchema,
} from "../validations/catalogo.validation";

// GET /api/productos?q=&categoria=&marca=&precioMin=&precioMax=&conStock=&page=&limit=&lang=
export async function listarProductos(
  req: Request,
  res: Response<Paginado<ProductoResumen>>,
) {
  const {
    page,
    limit,
    q,
    categoria,
    marca,
    precioMin,
    precioMax,
    conStock,
    lang,
  } = listarProductosQuerySchema.parse(req.query);

  // Si buscan con ?q=, busca tanto en el nombre original como en la traducción del idioma activo
  // El catalogo publico solo muestra productos activos
  const where: Prisma.ProductoWhereInput = {
    activo: true,
    OR: q
      ? [
          { nombre: { contains: q, mode: "insensitive" } },
          {
            traducciones: {
              some: {
                idioma: { codigo: lang, activo: true },
                nombreTraducido: { contains: q, mode: "insensitive" },
              },
            },
          },
        ]
      : undefined,
    idCategoria: categoria,
    marca: marca ? { nombre: { equals: marca, mode: "insensitive" } } : undefined,
    precio: { gte: precioMin, lte: precioMax },
    stock: conStock ? { gt: 0 } : undefined,
  };

  const [productos, total] = await prisma.$transaction([
    prisma.producto.findMany({
      where,
      include: crearIncludeResumen(lang),
      orderBy: { idProducto: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.producto.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);
  res.json({
    data: productos.map(mapearResumen),
    paginacion: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
}
// GET /api/marcas?categoria=
export async function listarMarcas(req: Request, res: Response<string[]>) {
  const { categoria } = listarMarcasQuerySchema.parse(req.query);

  // Solo marcas con algun producto activo (de la categoria, si viene)
  const marcas = await prisma.marca.findMany({
    where: { productos: { some: { idCategoria: categoria, activo: true } } },
    select: { nombre: true },
    orderBy: { nombre: "asc" },
  });
  res.json(marcas.map((m) => m.nombre));
}
