import type { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { ProductoDetalle } from "../utils/catalogo.types";

export const obtenerProductoPorId = async (
  req: Request<{ id: string }>,
  res: Response<ProductoDetalle | { error: string }>,
): Promise<void> => {
  const idProducto = Number(req.params.id);

  //Por si le pinta andar de gracioso al id

  if (isNaN(idProducto) || idProducto <= 0) {
    res.status(400).json({ error: "Id no valida" });
    return;
  }

  const producto = await prisma.producto.findUnique({
    where: { idProducto },
    include: {
      categoria: true,
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

  const base = {
    id: producto.idProducto,
    nombre: producto.nombre,
    descripcion: producto.descripcion ?? "",
    marca: producto.marca,
    precio: Number(producto.precio),
    stock: producto.stock,
    imagenUrl: producto.imagenUrl,
    disponible: producto.stock,
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
