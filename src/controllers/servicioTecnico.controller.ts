import type { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { AppError } from "../utils/AppError";
import { ESTADO_INICIAL } from "../utils/servicioTecnico.estados";
import {
  includeDetalleSolicitud,
  includeResumenSolicitud,
  mapearDetalleSolicitud,
  mapearResumenSolicitud,
} from "../utils/servicioTecnico.mapper";
import type { SolicitudDetalle, SolicitudResumen } from "../utils/servicioTecnico.types";
import { crearSolicitudSchema, idSolicitudParamSchema } from "../validations/servicioTecnico.validation";

// Rutas del cliente: todas pasan por requireAuth y cada usuario solo ve sus solicitudes.
// Better Auth devuelve el id como string; en la base es Int.
const idUsuarioDe = (req: Request) => Number(req.usuario!.id);

// POST /api/servicio-tecnico  { servicios, tipoEquipo?, software?, conBackup?, conPastaTermica?, descripcion? }
// (que campos van segun los servicios elegidos: ver crearSolicitudSchema)
// Queda en PENDIENTE y se registra como primer evento del historial.
export async function crearSolicitud(req: Request, res: Response<SolicitudDetalle>) {
  const datos = crearSolicitudSchema.parse(req.body);
  const idUsuario = idUsuarioDe(req);

  const solicitud = await prisma.solicitudServicio.create({
    data: {
      ...datos,
      idUsuario,
      estado: ESTADO_INICIAL,
      historial: { create: { idUsuario, estadoAnterior: null, estadoNuevo: ESTADO_INICIAL } },
    },
    include: includeDetalleSolicitud,
  });

  res.status(201).json(mapearDetalleSolicitud(solicitud, false));
}

// GET /api/servicio-tecnico
// Las del usuario logueado, primero las que tuvieron novedades mas recientes.
export async function listarMisSolicitudes(req: Request, res: Response<SolicitudResumen[]>) {
  const solicitudes = await prisma.solicitudServicio.findMany({
    where: { idUsuario: idUsuarioDe(req) },
    include: includeResumenSolicitud,
    orderBy: [{ actualizadoEn: "desc" }, { idSolicitud: "desc" }],
  });
  res.json(solicitudes.map(mapearResumenSolicitud));
}

// GET /api/servicio-tecnico/:id  (estado actual, respuestas e historial)
// Si la solicitud es de otro usuario se responde 404, igual que si no existiera.
export async function obtenerMiSolicitud(req: Request, res: Response<SolicitudDetalle>) {
  const { id } = idSolicitudParamSchema.parse(req.params);
  const solicitud = await prisma.solicitudServicio.findFirst({
    where: { idSolicitud: id, idUsuario: idUsuarioDe(req) },
    include: includeDetalleSolicitud,
  });
  if (!solicitud) throw new AppError(404, "Solicitud no encontrada");
  res.json(mapearDetalleSolicitud(solicitud, false));
}
