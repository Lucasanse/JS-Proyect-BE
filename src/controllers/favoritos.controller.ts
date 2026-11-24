import type { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import type { FavoritoItem, FavoritoQuery, FavoritoAccionResponse } from "../utils/favoritos.types";

export const obtenerFavoritosPorId = async (
  req: Request<{ idUsuario: string }, unknown, unknown, { lang?: string }>,
  res: Response<FavoritoItem[] | { error: string }>,
): Promise<void> => {
  const idUsuario = Number(req.params.idUsuario);
  const lang = (req.query.lang || "es").toLowerCase();

  if (isNaN(idUsuario) || idUsuario <= 0) {
    res.status(400).json({ error: "ID de usuario inválido" });
    return;
  }

  try {
    const favoritos = await prisma.favorito.findMany({
      where: { idUsuario },
      orderBy: { fechaAgregado: "desc" },
      include: {
        producto: {
          activo: true,
          include: {
            marca: true,
            categoria: true,
            traducciones: {
              where: {
                idioma: {
                  codigo: lang,
                  activo: true,
                },
              },
            },
          },
        },
      },
    });
    const favoritosFormateados: FavoritoItem[] = favoritos.map((fav) => {
      const prod = fav.producto;
      const traduccion = prod.traducciones[0];

      return {
        idFavorito: fav.idFavorito,
        idProducto: fav.idProducto,
        fechaAgregado: fav.fechaAgregado,
        producto: {
          id: prod.idProducto,
          nombre: traduccion ? traduccion.nombreTraducido : prod.nombre,
          marca: prod.marca.nombre,
          precio: Number(prod.precio),
          stock: prod.stock,
          imagenUrl: prod.imagenUrl,
          disponible: prod.stock > 0,
          categoria: {
            id: prod.categoria.idCategoria,
            nombre:
              lang === "en" && prod.categoria.nombreEN
                ? prod.categoria.nombreEN
                : prod.categoria.nombre,
            nombreEN: prod.categoria.nombreEN ?? null,
          },
        },
      };
    });

    res.json(favoritosFormateados);
  } catch {
    res.status(404).json({ error: "Favoritos no encontrados" });
  }
};

export const agregarFavorito = async (
  req: Request<
    { idUsuario: string; idProducto: string },
    unknown,
    unknown,
    FavoritoQuery
  >,
  res: Response<FavoritoAccionResponse | { error: string }>,
): Promise<void> => {
  const idUsuario = Number(req.params.idUsuario);
  const idProducto = Number(req.params.idProducto);
  const lang = (req.query.lang || "es").toLowerCase();

  if (!idUsuario || !idProducto){
    res.status(400).json({ error: "Sin datos para buscar" });
    return
  }

  try {

    await prisma.favorito.upsert({
    where: {
idUsuario_idProducto: {
          idUsuario,
          idProducto,
        },
    }  
    })
  }
};
