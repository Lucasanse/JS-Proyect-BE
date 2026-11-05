import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { AppError } from "../utils/AppError";
import { CATEGORIA_SERVICIOS } from "../utils/armador.compatibilidad";
import { actualizarServicioSchema, idServicioParamSchema } from "../validations/adminServicios.validation";

// Todas estas rutas pasan por requireAuth + requireAdmin (ver routes/index.ts).
// Los servicios (armado de PC, instalacion de Windows...) son productos de la categoria
// "Servicios": se venden en el armador y se administran aca, no en el catalogo.

export interface ServicioAdmin {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number; // en pesos
  activo: boolean; // inactivo = no se ofrece en el armador
}

const selectServicio = {
  idProducto: true,
  nombre: true,
  descripcion: true,
  precio: true,
  activo: true,
} satisfies Prisma.ProductoSelect;

const mapearServicio = (p: Prisma.ProductoGetPayload<{ select: typeof selectServicio }>): ServicioAdmin => ({
  id: p.idProducto,
  nombre: p.nombre,
  descripcion: p.descripcion,
  precio: p.precio.toNumber(),
  activo: p.activo,
});

const esServicio = { categoria: { nombre: CATEGORIA_SERVICIOS } } satisfies Prisma.ProductoWhereInput;

// GET /api/admin/servicios  (activos e inactivos, en el orden en que se crearon)
export async function listarServiciosAdmin(_req: Request, res: Response<ServicioAdmin[]>) {
  const servicios = await prisma.producto.findMany({
    where: esServicio,
    select: selectServicio,
    orderBy: { idProducto: "asc" },
  });
  res.json(servicios.map(mapearServicio));
}

// PATCH /api/admin/servicios/:id  { precio?, activo? }
// El precio de un servicio siempre es en pesos (no sigue al dolar).
export async function actualizarServicio(req: Request, res: Response<ServicioAdmin>) {
  const { id } = idServicioParamSchema.parse(req.params);
  const { precio, activo } = actualizarServicioSchema.parse(req.body);

  const existente = await prisma.producto.findFirst({ where: { idProducto: id, ...esServicio }, select: { idProducto: true } });
  if (!existente) throw new AppError(404, "Servicio no encontrado");

  const servicio = await prisma.producto.update({
    where: { idProducto: id },
    data: {
      activo,
      ...(precio !== undefined && { precio, precioUsd: null, monedaBase: "ARS" }),
    },
    select: selectServicio,
  });
  res.json(mapearServicio(servicio));
}
