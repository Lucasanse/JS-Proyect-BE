import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import type { CategoriaResumen } from '../utils/catalogo.types';

// GET /api/categorias
export async function listarCategorias(_req: Request, res: Response<CategoriaResumen[]>) {
  const categorias = await prisma.categoria.findMany({ orderBy: { nombre: 'asc' } });
  res.json(categorias.map((c) => ({ id: c.idCategoria, nombre: c.nombre })));
}
