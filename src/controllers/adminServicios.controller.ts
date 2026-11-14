import type { Request, Response } from "express";
import type { Servicio } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { AppError } from "../utils/AppError";
import type { GrupoServicio } from "../utils/servicios";
import {
  actualizarServicioSchema,
  crearProgramaSchema,
  idServicioParamSchema,
} from "../validations/adminServicios.validation";

// Todas estas rutas pasan por requireAuth + requireAdmin (ver routes/index.ts).
// Servicios del local (tabla Servicio): los del armador (van al carrito) y los de servicio tecnico
// (se abonan en el local). Solo se cambia el precio y si se ofrecen; lo unico que se puede agregar
// son programas para instalar (grupo SOFTWARE).

export interface ServicioAdmin {
  id: number;
  codigo: string;
  grupo: GrupoServicio;
  nombre: string;
  descripcion: string;
  precio: number | null; // en pesos; null = a presupuestar (no se puede cambiar)
  activo: boolean; // inactivo = no se ofrece
}

const mapearServicio = (s: Servicio): ServicioAdmin => ({
  id: s.idServicio,
  codigo: s.codigo,
  grupo: s.grupo as GrupoServicio,
  nombre: s.nombre,
  descripcion: s.descripcion,
  precio: s.precio?.toNumber() ?? null,
  activo: s.activo,
});

// GET /api/admin/servicios  (todos, activos e inactivos, agrupados y en su orden)
export async function listarServiciosAdmin(_req: Request, res: Response<ServicioAdmin[]>) {
  const servicios = await prisma.servicio.findMany({ orderBy: [{ grupo: "asc" }, { orden: "asc" }, { idServicio: "asc" }] });
  res.json(servicios.map(mapearServicio));
}

// "Adobe Reader" -> "SOFTWARE_ADOBE_READER" (sin tildes ni simbolos)
const codigoPrograma = (nombre: string) =>
  "SOFTWARE_" +
  nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

// POST /api/admin/servicios/programas  { nombre, precio }
// Agrega un programa para instalar en servicio tecnico. Es el unico servicio que se puede crear.
export async function crearPrograma(req: Request, res: Response<ServicioAdmin>) {
  const { nombre, precio } = crearProgramaSchema.parse(req.body);
  const codigo = codigoPrograma(nombre);
  if (codigo === "SOFTWARE_") throw new AppError(400, "El nombre tiene que tener letras o números");

  const existente = await prisma.servicio.findUnique({ where: { codigo } });
  if (existente) throw new AppError(409, `Ya existe el programa "${existente.nombre}"`);

  const ultimo = await prisma.servicio.aggregate({ where: { grupo: "SOFTWARE" }, _max: { orden: true } });
  const servicio = await prisma.servicio.create({
    data: { codigo, grupo: "SOFTWARE", nombre, precio, orden: (ultimo._max.orden ?? 0) + 1 },
  });
  res.status(201).json(mapearServicio(servicio));
}

// PATCH /api/admin/servicios/:id  { precio?, activo? }
export async function actualizarServicio(req: Request, res: Response<ServicioAdmin>) {
  const { id } = idServicioParamSchema.parse(req.params);
  const { precio, activo } = actualizarServicioSchema.parse(req.body);

  const existente = await prisma.servicio.findUnique({ where: { idServicio: id } });
  if (!existente) throw new AppError(404, "Servicio no encontrado");
  if (precio !== undefined) {
    // Reparacion y Otro no tienen precio fijo: se presupuestan al ver el equipo
    if (existente.precio === null) throw new AppError(400, `"${existente.nombre}" se presupuesta en el local y no tiene precio fijo`);
    // Lo que va al carrito tiene que costar algo (Mercado Pago no acepta items en 0)
    if (existente.grupo === "ARMADOR" && precio <= 0) throw new AppError(400, "El precio debe ser mayor a 0");
  }

  const servicio = await prisma.servicio.update({
    where: { idServicio: id },
    data: { activo, precio },
  });
  res.json(mapearServicio(servicio));
}
