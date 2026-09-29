import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { listarMarcasQuerySchema } from '../validations/catalogo.validation';
import type { CategoriaFiltro, MarcaFiltro } from '../utils/catalogo.types';

// GET /api/categorias
export async function listarCategorias(_req: Request, res: Response<CategoriaFiltro[]>) {
  const categorias = await prisma.categoria.findMany({
    orderBy: { nombre: 'asc' },
    include: { _count: { select: { productos: true } } },
  });

  res.json(
    categorias.map((c) => ({
      id: c.idCategoria,
      nombre: c.nombre,
      cantidadProductos: c._count.productos,
    })),
  );
}

// GET /api/marcas
// Marcas distintas; con ?categoria= devuelve solo las de esa categoria
// (para que el filtro de marca dependa de la categoria elegida).
export async function listarMarcas(req: Request, res: Response<MarcaFiltro[]>) {
  const { categoria } = listarMarcasQuerySchema.parse(req.query);

  const marcas = await prisma.producto.groupBy({
    by: ['marca'],
    where: categoria === undefined ? {} : { idCategoria: categoria },
    _count: { _all: true },
    orderBy: { marca: 'asc' },
  });

  res.json(marcas.map((m) => ({ nombre: m.marca, cantidadProductos: m._count._all })));
}
