import type { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import type { MarcaAdmin, TipoComponenteAdmin } from "../utils/catalogo.types";
import { marcaSchema } from "../validations/adminProductos.validation";

// Datos auxiliares del formulario de productos del admin (marcas y tipos de componente).
// Todas estas rutas pasan por requireAuth + requireAdmin (ver routes/index.ts).

// GET /api/admin/marcas
// Todas las marcas, con las categorias donde tienen productos: el FE muestra
// primero las de la categoria elegida y despues el resto.
export async function listarMarcasAdmin(_req: Request, res: Response<MarcaAdmin[]>) {
  const marcas = await prisma.marca.findMany({
    include: { productos: { select: { idCategoria: true }, distinct: ["idCategoria"] } },
    orderBy: { nombre: "asc" },
  });
  res.json(
    marcas.map((m) => ({ id: m.idMarca, nombre: m.nombre, categorias: m.productos.map((p) => p.idCategoria) })),
  );
}

// POST /api/admin/marcas  { nombre }
// Si ya existe una marca con ese nombre (sin importar mayusculas), devuelve esa en vez de duplicarla.
export async function crearMarca(req: Request, res: Response<MarcaAdmin>) {
  const { nombre } = marcaSchema.parse(req.body);

  const existente = await prisma.marca.findFirst({
    where: { nombre: { equals: nombre, mode: "insensitive" } },
    include: { productos: { select: { idCategoria: true }, distinct: ["idCategoria"] } },
  });
  if (existente) {
    res.json({
      id: existente.idMarca,
      nombre: existente.nombre,
      categorias: existente.productos.map((p) => p.idCategoria),
    });
    return;
  }

  const marca = await prisma.marca.create({ data: { nombre } });
  res.status(201).json({ id: marca.idMarca, nombre: marca.nombre, categorias: [] });
}

// GET /api/admin/tipos-componente
// Tipos con sus atributos tecnicos. Las opciones de cada atributo son las definidas
// en el seed mas los valores que ya se cargaron en productos (sin repetir).
export async function listarTiposComponente(_req: Request, res: Response<TipoComponenteAdmin[]>) {
  const tipos = await prisma.tipoComponente.findMany({
    include: {
      atributos: {
        include: { valores: { select: { valor: true }, distinct: ["valor"] } },
        orderBy: { idAtributo: "asc" },
      },
      componentes: { select: { producto: { select: { idCategoria: true } } } },
    },
    orderBy: { nombre: "asc" },
  });

  res.json(
    tipos.map((t) => ({
      id: t.idTipoComponente,
      nombre: t.nombre,
      categorias: [...new Set(t.componentes.map((c) => c.producto.idCategoria))],
      atributos: t.atributos.map((a) => {
        const cargados = a.valores.map((v) => v.valor).filter((v) => !a.opciones.includes(v));
        return {
          id: a.idAtributo,
          nombre: a.nombre,
          unidad: a.unidad,
          numerico: a.numerico,
          opciones: a.numerico ? [] : [...a.opciones, ...cargados.sort((x, y) => x.localeCompare(y))],
        };
      }),
    })),
  );
}
