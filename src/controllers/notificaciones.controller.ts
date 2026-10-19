import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ENDPOINT 1: Mostrar todas las notificaciones del usuario
export const obtenerNotificaciones = async (req: Request, res: Response) => {
  try {
    const idUsuario = parseInt(req.params.idUsuario, 10);

    if (isNaN(idUsuario)) {
      return res.status(400).json({ error: "ID de usuario inválido" });
    }

    // Buscamos las notificaciones ordenadas por fecha (las más nuevas primero)
    const notificaciones = await prisma.notificacion.findMany({
      where: { idUsuario },
      orderBy: { fecha: "desc" },
      include: {
        tipoNotificacion: true,
        venta: true,
      },
    });

    // Mapeamos para enviar un objeto limpio al frontend
    const notificacionesFormateadas = notificaciones.map((notif) => {
      let mensajeFinal = notif.tipoNotificacion.plantillaMensaje;

      if (notif.venta) {
        mensajeFinal = mensajeFinal
          .replace("{idVenta}", notif.venta.idVenta.toString())
          .replace("{total}", notif.venta.total.toString());
      }
      return {
        id: notif.idNotificacion,
        mensaje: mensajeFinal,
        leida: notif.leida,
        fecha: notif.fecha,
        tipo: notif.tipoNotificacion.codigo,
      };
    });

    return res.status(200).json(notificacionesFormateadas);
  } catch (error) {
    console.error("Error al obtener notificaciones:", error);
    return res
      .status(500)
      .json({ error: "Hubo un error al obtener las notificaciones" });
  }
};

export const marcarComoLeida = async (req: Request, res: Response) => {
  try {
    const idNotificacion = parseInt(req.params.idNotificacion, 10);

    if (isNaN(idNotificacion)) {
      return res.status(400).json({ error: "ID de notificación inválido" });
    }

    const notificacionActualizada = await prisma.notificacion.update({
      where: { idNotificacion },
      data: { leida: true },
    });

    return res.status(200).json({
      mensaje: "Notificación marcada como leída",
      notificacion: notificacionActualizada,
    });
  } catch (error) {
    console.error("Error al marcar notificación como leída:", error);
    return res
      .status(500)
      .json({ error: "No se pudo actualizar la notificación" });
  }
};
