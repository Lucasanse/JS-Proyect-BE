import type { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { AppError } from "../utils/AppError";
import {
  contarNoLeidas,
  crearNovedad,
  emitirContador,
  formatearNotificacion,
  includeNotificacion,
} from "../utils/notificaciones";
import { escribirEvento, suscribir } from "../utils/notificaciones.tiempoReal";
import type { ListadoNotificaciones } from "../utils/notificaciones.types";
import {
  crearNovedadSchema,
  idNotificacionParamSchema,
  listarNotificacionesQuerySchema,
  streamQuerySchema,
} from "../validations/notificaciones.validation";

// Todas las rutas pasan por requireAuth: cada usuario solo ve y modifica las suyas
// (el usuario sale de la sesion, nunca de la URL).
const idUsuarioDe = (req: Request) => Number(req.usuario!.id);

// GET /api/notifications?page=1&limit=10&soloNoLeidas=true&lang=es
// Las mas nuevas primero. noLeidas es el total de no leidas (no depende del filtro).
export async function listarNotificaciones(req: Request, res: Response<ListadoNotificaciones>) {
  const idUsuario = idUsuarioDe(req);
  const { page, limit, soloNoLeidas, lang } = listarNotificacionesQuerySchema.parse(req.query);
  const where = { idUsuario, ...(soloNoLeidas ? { leida: false } : {}) };

  const [notificaciones, total, noLeidas] = await prisma.$transaction([
    prisma.notificacion.findMany({
      where,
      include: includeNotificacion,
      orderBy: [{ fecha: "desc" }, { idNotificacion: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notificacion.count({ where }),
    prisma.notificacion.count({ where: { idUsuario, leida: false } }),
  ]);

  res.json({
    items: notificaciones.map((n) => formatearNotificacion(n, lang)),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    noLeidas,
  });
}

// GET /api/notifications/unread-count
export async function contarNotificacionesNoLeidas(req: Request, res: Response<{ noLeidas: number }>) {
  res.json({ noLeidas: await contarNoLeidas(idUsuarioDe(req)) });
}

// PATCH /api/notifications/:id/read
// 404 si no existe o es de otro usuario (no se revela cual de las dos).
export async function marcarComoLeida(req: Request, res: Response<{ noLeidas: number }>) {
  const idUsuario = idUsuarioDe(req);
  const { id } = idNotificacionParamSchema.parse(req.params);

  const notificacion = await prisma.notificacion.findFirst({
    where: { idNotificacion: id, idUsuario },
    select: { leida: true },
  });
  if (!notificacion) throw new AppError(404, "Notificación no encontrada");

  if (!notificacion.leida) {
    await prisma.notificacion.update({ where: { idNotificacion: id }, data: { leida: true } });
    // Las demas pestañas del usuario actualizan el contador
    await emitirContador(idUsuario);
  }
  res.json({ noLeidas: await contarNoLeidas(idUsuario) });
}

// PATCH /api/notifications/read-all
export async function marcarTodasComoLeidas(req: Request, res: Response<{ actualizadas: number; noLeidas: number }>) {
  const idUsuario = idUsuarioDe(req);
  const { count } = await prisma.notificacion.updateMany({
    where: { idUsuario, leida: false },
    data: { leida: true },
  });
  if (count > 0) await emitirContador(idUsuario);
  res.json({ actualizadas: count, noLeidas: 0 });
}

// GET /api/notifications/stream?lang=es  (Server-Sent Events)
// Eventos:
//   contador      { noLeidas }            al conectar y cada vez que cambia
//   notificacion  NotificacionDTO          cada notificacion nueva
// Cada 25 s se manda un comentario para que proxies no corten la conexion.
const INTERVALO_LATIDO_MS = 25_000;

export async function streamNotificaciones(req: Request, res: Response) {
  const idUsuario = idUsuarioDe(req);
  const { lang } = streamQuerySchema.parse(req.query);

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  // Si se corta, el navegador reintenta a los 5 s
  res.write("retry: 5000\n\n");

  const quitar = suscribir(idUsuario, res, lang);
  const latido = setInterval(() => res.write(": ping\n\n"), INTERVALO_LATIDO_MS);
  req.on("close", () => {
    clearInterval(latido);
    quitar();
  });

  escribirEvento(res, "contador", { noLeidas: await contarNoLeidas(idUsuario) });
}

// POST /api/admin/notifications  { titulo, mensaje, idUsuarios? }  (solo ADMIN)
// Novedades generales: sin idUsuarios va a todos los usuarios habilitados.
export async function enviarNovedad(req: Request, res: Response<{ enviadas: number }>) {
  const { titulo, mensaje, idUsuarios } = crearNovedadSchema.parse(req.body);
  res.status(201).json({ enviadas: await crearNovedad(titulo, mensaje, idUsuarios) });
}
