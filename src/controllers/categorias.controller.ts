import type { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import type { CategoriaResumen } from "../utils/catalogo.types";

// GET /api/categorias
export async function listarCategorias(
  req: Request<{ id: string }, unknown, unknown, { lang?: string }>,
  res: Response<CategoriaResumen[]>,
) {
  const codigoIdioma = (req.query.lang || "es").toLowerCase();
  const categorias = await prisma.categoria.findMany({
    orderBy: { nombre: "asc" },
  });
  res.json(
    categorias.map((c) => ({
      id: c.idCategoria,
      nombre: codigoIdioma === "en" && c.nombreEN ? c.nombreEN : c.nombre,
    })),
  );
}
