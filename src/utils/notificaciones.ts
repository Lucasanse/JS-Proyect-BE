import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const crearNotificacionCompra = async (
  idUsuario: number,
  idVenta: number,
) => {
  try {
    // 1. Buscamos el tipo de notificación por su código.
    const tipoNotificacion = await prisma.tipoNotificacion.findUnique({
      where: {
        codigo: "VENTA_CONFIRMADA",
      },
    });

    if (!tipoNotificacion) {
      console.error(
        "No se generó la notificación: falta el tipo 'COMPRA_EXITOSA' en la BD.",
      );
      return;
    }

    // 2. Creamos la notificación vinculando el usuario, el tipo y la venta
    await prisma.notificacion.create({
      data: {
        idUsuario: idUsuario,
        idTipoNotificacion: tipoNotificacion.idTipoNotificacion,
        idVenta: idVenta,
        // idSolicitud queda undefined/null implícitamente
        leida: false,
      },
    });

    console.log(`Notificación creada: Usuario ${idUsuario} | Venta ${idVenta}`);
  } catch (error) {
    console.error(
      "Error al guardar la notificación de compra en la BD:",
      error,
    );
  }
};
