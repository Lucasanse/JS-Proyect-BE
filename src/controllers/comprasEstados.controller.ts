import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const obtenerHistorialCompras = async (req: Request, res: Response) => {
  try {
    const rawId = req.params.idUsuario;
    const idUsuarioStr = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!idUsuarioStr) {
      return res
        .status(400)
        .json({ error: "El ID de usuario es inválido o no fue provisto" });
    }

    const idUsuario = parseInt(idUsuarioStr, 10);
    if (isNaN(idUsuario)) {
      return res
        .status(400)
        .json({ error: "El ID de usuario debe ser numérico" });
    }

    const ventas = await prisma.venta.findMany({
      where: {
        idUsuario,
      },
      orderBy: {
        fecha: "desc",
      },
      include: {
        detalles: {
          include: {
            producto: true,
          },
        },
      },
    });

    const comprasFormateadas = ventas.map((venta) => {
      const cantidadTotal = venta.detalles.reduce(
        (acc, item) => acc + (Number(item.cantidad) || 1),
        0,
      );

      // Mapeamos los productos sacando id y nombre desde la relación 'producto'
      const productos = venta.detalles.map((detalle) => ({
        idProducto:
          detalle.idProducto ??
          detalle.producto?.idProducto ??
          detalle.producto?.idProducto,
        nombre: detalle.producto?.nombre ?? "Producto sin nombre",
        cantidad: Number(detalle.cantidad),
        precioUnitario: Number(
          detalle.precioUnitario ?? detalle.producto?.precio ?? 0,
        ),
      }));

      return {
        id: venta.idVenta.toString(),
        total: Number(venta.total),
        status: venta.estado.toLowerCase(),
        fecha: venta.fecha.toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        items: cantidadTotal,
        metodoPago: venta.metodoPago,
        idPagoMp: venta.idPagoMp,
        productos,
      };
    });

    return res.status(200).json(comprasFormateadas);
  } catch (error) {
    console.error("Error al obtener compras:", error);
    return res
      .status(500)
      .json({ error: "No se pudo obtener el historial de compras." });
  }
};
