import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { AppError } from "../utils/AppError";
import {
  ESTADOS_SOLICITUD,
  aceptaRespuestas,
  validarTransicion,
  type EstadoSolicitud,
} from "../utils/servicioTecnico.estados";
import {
  includeDetalleSolicitud,
  includeResumenSolicitud,
  mapearDetalleSolicitud,
  mapearResumenSolicitud,
} from "../utils/servicioTecnico.mapper";
import type { ListadoSolicitudesAdmin, SolicitudDetalle } from "../utils/servicioTecnico.types";
import {
  cambiarEstadoSchema,
  idSolicitudParamSchema,
  listarSolicitudesQuerySchema,
  respuestaSchema,
} from "../validations/servicioTecnico.validation";

// Todas estas rutas pasan por requireAuth + requireAdmin (ver routes/index.ts).

const idUsuarioDe = (req: Request) => Number(req.usuario!.id);

async function buscarSolicitud(id: number) {
  const solicitud = await prisma.solicitudServicio.findUnique({
    where: { idSolicitud: id },
    include: includeDetalleSolicitud,
  });
  if (!solicitud) throw new AppError(404, "Solicitud no encontrada");
  return solicitud;
}

// GET /api/admin/servicio-tecnico?estado=&q=&page=&limit=
// Las mas nuevas primero. conteoPorEstado ignora el filtro de estado (pero no la busqueda).
export async function listarSolicitudes(req: Request, res: Response<ListadoSolicitudesAdmin>) {
  const { page, limit, estado, q } = listarSolicitudesQuerySchema.parse(req.query);

  const numero = q ? Number(q.replace(/^#/, "")) : NaN;
  const busqueda: Prisma.SolicitudServicioWhereInput = q
    ? {
        OR: [
          ...(Number.isInteger(numero) && numero > 0 ? [{ idSolicitud: numero }] : []),
          { descripcion: { contains: q, mode: "insensitive" } },
          { usuario: { nombreCompleto: { contains: q, mode: "insensitive" } } },
          { usuario: { correo: { contains: q, mode: "insensitive" } } },
        ],
      }
    : {};
  const where: Prisma.SolicitudServicioWhereInput = { ...busqueda, estado };

  const [solicitudes, total, conteos] = await prisma.$transaction([
    prisma.solicitudServicio.findMany({
      where,
      include: includeResumenSolicitud,
      orderBy: { idSolicitud: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.solicitudServicio.count({ where }),
    prisma.solicitudServicio.groupBy({
      by: ["estado"],
      where: busqueda,
      orderBy: { estado: "asc" },
      _count: { _all: true },
    }),
  ]);

  const conteoPorEstado = Object.fromEntries(ESTADOS_SOLICITUD.map((e) => [e, 0])) as Record<EstadoSolicitud, number>;
  for (const c of conteos) {
    if (c.estado in conteoPorEstado) {
      conteoPorEstado[c.estado as EstadoSolicitud] = (c._count as { _all: number })._all;
    }
  }

  const totalPages = Math.ceil(total / limit);
  res.json({
    data: solicitudes.map(mapearResumenSolicitud),
    paginacion: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    conteoPorEstado,
  });
}

// GET /api/admin/servicio-tecnico/:id
export async function obtenerSolicitud(req: Request, res: Response<SolicitudDetalle>) {
  const { id } = idSolicitudParamSchema.parse(req.params);
  res.json(mapearDetalleSolicitud(await buscarSolicitud(id), true));
}

// POST /api/admin/servicio-tecnico/:id/respuestas  { mensaje }
// Devuelve el detalle actualizado. Una solicitud CERRADA no se puede responder (409).
export async function responderSolicitud(req: Request, res: Response<SolicitudDetalle>) {
  const { id } = idSolicitudParamSchema.parse(req.params);
  const { mensaje } = respuestaSchema.parse(req.body);
  const solicitud = await buscarSolicitud(id);

  if (!aceptaRespuestas(solicitud.estado)) {
    throw new AppError(409, "La solicitud ya está finalizada (rechazada o cerrada) y no se puede responder");
  }

  await prisma.$transaction([
    prisma.respuestaSolicitud.create({ data: { idSolicitud: id, idUsuario: idUsuarioDe(req), mensaje } }),
    // Marca la solicitud como actualizada (el cliente ve primero las que tienen novedades)
    prisma.solicitudServicio.update({ where: { idSolicitud: id }, data: { actualizadoEn: new Date() } }),
  ]);

  res.status(201).json(mapearDetalleSolicitud(await buscarSolicitud(id), true));
}

// PATCH /api/admin/servicio-tecnico/:id/estado  { estado, mensaje? }
// Valida que la transicion este permitida (409 si no) y la registra en el historial.
// Al rechazar, el mensaje (obligatorio) queda como ultima respuesta al cliente.
export async function cambiarEstadoSolicitud(req: Request, res: Response<SolicitudDetalle>) {
  const { id } = idSolicitudParamSchema.parse(req.params);
  const { estado, mensaje } = cambiarEstadoSchema.parse(req.body);
  const solicitud = await buscarSolicitud(id);

  validarTransicion(solicitud.estado, estado);

  await prisma.$transaction(async (tx) => {
    // Solo se actualiza si nadie la cambio entre la lectura y ahora
    const { count } = await tx.solicitudServicio.updateMany({
      where: { idSolicitud: id, estado: solicitud.estado },
      data: { estado },
    });
    if (count === 0) {
      throw new AppError(409, "Otro administrador cambió el estado mientras tanto. Recargá la solicitud.");
    }
    await tx.historialEstadoSolicitud.create({
      data: { idSolicitud: id, idUsuario: idUsuarioDe(req), estadoAnterior: solicitud.estado, estadoNuevo: estado },
    });
    // El motivo del rechazo se guarda como respuesta, asi el cliente lo ve con las demas
    if (mensaje) {
      await tx.respuestaSolicitud.create({ data: { idSolicitud: id, idUsuario: idUsuarioDe(req), mensaje } });
    }
  });

  res.json(mapearDetalleSolicitud(await buscarSolicitud(id), true));
}
