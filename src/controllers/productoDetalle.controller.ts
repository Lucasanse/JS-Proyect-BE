import type { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { ProductoDetalle } from "../utils/catalogo.types";

export const obtenerProductoPorId = async (
  req: Request<{ id: string }, unknown, unknown, { lang?: string }>,
  res: Response<ProductoDetalle | { error: string }>,
): Promise<void> => {
  const idProducto = Number(req.params.id);

  const codigoIdioma = (req.query.lang || "es").toLowerCase();

  //Por si le pinta andar de gracioso al id

  if (isNaN(idProducto) || idProducto <= 0) {
    res.status(400).json({ error: "Id no valida" });
    return;
  }

  const producto = await prisma.producto.findUnique({
    where: { idProducto },
    include: {
      categoria: true,
      traducciones: {
        where: {
          idioma: {
            codigo: codigoIdioma,
            activo: true,
          },
        },
      },
      componentePC: {
        include: {
          tipoComponente: true,
          valoresAtributo: {
            include: {
              atributo: true,
            },
          },
        },
      },
    },
  });

  if (!producto) {
    res.status(404).json({ error: "Producto no encontrado" });
    return;
  }

  const traduccion = producto.traducciones[0];

  const base = {
    id: producto.idProducto,
    nombre: traduccion ? traduccion.nombreTraducido : producto.nombre,
    descripcion: traduccion
      ? traduccion.descripcionTraducida
      : (producto.descripcion ?? ""),
    marca: producto.marca,
    precio: Number(producto.precio),
    stock: producto.stock,
    imagenUrl: producto.imagenUrl,
    disponible: producto.stock > 0,
    categoria: {
      id: producto.categoria.idCategoria,
      nombre: producto.categoria.nombre,
    },
  };

  if (producto.componentePC) {
    res.json({
      ...base,
      esComponentePC: true,
      tipoComponente: producto.componentePC.tipoComponente.nombre,
      wattsRequeridos: producto.componentePC.wattsRequeridos,
      atributos: producto.componentePC.valoresAtributo.map((va) => ({
        nombre: va.atributo.nombre,
        valor: va.valor,
        unidad: va.atributo.unidad,
      })),
    });
    return;
  }
  res.json({
    ...base,
    esComponentePC: false,
    tipoComponente: null,
    wattsRequeridos: null,
    atributos: [],
  });
};
