import { Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export const cambiarEstadoVentaAdmin = async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    const idStr = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!idStr) {
      return res.status(400).json({ error: "ID de venta no provisto" });
    }

    const idVenta = parseInt(idStr, 10);
    if (isNaN(idVenta)) {
      return res
        .status(400)
        .json({ error: "El ID de la venta debe ser numérico" });
    }

    // Extraemos el nuevo estado del cuerpo de la petición
    const { estado } = req.body;

    // Validación básica: asegurarse de que enviaron un estado válido
    if (!estado || typeof estado !== "string") {
      return res.status(400).json({
        error: "Debe proporcionar un estado válido en el cuerpo de la petición",
      });
    }

    // Validamos que la venta exista antes de actualizarla
    const ventaExistente = await prisma.venta.findUnique({
      where: { idVenta },
    });

    if (!ventaExistente) {
      return res
        .status(404)
        .json({ error: `No se encontró la venta con ID #${idVenta}` });
    }

    const ventaActualizada = await prisma.venta.update({
      where: { idVenta },
      data: { estado },
    });

    return res.status(200).json({
      mensaje: "Estado actualizado exitosamente",
      venta: ventaActualizada,
    });
  } catch (error) {
    console.error("Error al actualizar el estado de la venta:", error);
    return res
      .status(500)
      .json({ error: "Error interno al actualizar el estado del pedido" });
  }
};

export const obtenerVentaPorIdAdmin = async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    const idStr = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!idStr) {
      return res.status(400).json({ error: "ID de venta no provisto" });
    }

    const idVenta = parseInt(idStr, 10);
    if (isNaN(idVenta)) {
      return res
        .status(400)
        .json({ error: "El ID de la venta debe ser numérico" });
    }

    const venta = await prisma.venta.findUnique({
      where: { idVenta },
      include: {
        usuario: {
          select: {
            id: true,
            nombreCompleto: true,
            correo: true,
          },
        },
        detalles: {
          include: {
            producto: {
              select: {
                idProducto: true,
                nombre: true,
                precio: true,
                imagenUrl: true,
              },
            },
          },
        },
      },
    });

    if (!venta) {
      return res
        .status(404)
        .json({ error: `No se encontró la venta con ID #${idVenta}` });
    }

    return res.status(200).json(venta);
  } catch (error) {
    console.error("Error al obtener venta por ID:", error);
    return res.status(500).json({ error: "Error interno al buscar el pedido" });
  }
};
export const listarVentasAdmin = async (req: Request, res: Response) => {
  try {
    const {
      estado,
      fechaDesde,
      fechaHasta,
      idUsuario,
      page = "1",
      limit = "10",
    } = req.query;

    // 2. Armamos la configuración matemática del paginado
    const pagina = Math.max(1, parseInt(page as string, 10));
    const limite = Math.max(1, parseInt(limit as string, 10));
    const skip = (pagina - 1) * limite;
    const take = limite;

    const whereParams: Prisma.VentaWhereInput = {};

    if (estado && typeof estado === "string") {
      whereParams.estado = estado;
    }

    if (idUsuario && !isNaN(Number(idUsuario))) {
      whereParams.idUsuario = Number(idUsuario);
    }

    if (fechaDesde || fechaHasta) {
      whereParams.fecha = {};
      if (fechaDesde && typeof fechaDesde === "string") {
        whereParams.fecha.gte = new Date(fechaDesde);
      }
      if (fechaHasta && typeof fechaHasta === "string") {
        const fechaFin = new Date(fechaHasta);
        fechaFin.setHours(23, 59, 59, 999);
        whereParams.fecha.lte = fechaFin;
      }
    }

    // 4. Ejecutamos la búsqueda de datos y el conteo total AL MISMO TIEMPO
    const [ventas, totalVentas] = await Promise.all([
      prisma.venta.findMany({
        where: whereParams,
        skip: skip,
        take: take,
        orderBy: { fecha: "desc" },
        include: {
          usuario: {
            select: {
              id: true, // Ajustá si tu id de usuario se llama idUsuario
              nombreCompleto: true,
              correo: true,
            },
          },
          detalles: {
            include: {
              producto: {
                select: {
                  idProducto: true,
                  nombre: true,
                  precio: true,
                  imagenUrl: true,
                },
              },
            },
          },
        },
      }),
      prisma.venta.count({ where: whereParams }),
    ]);

    return res.status(200).json({
      data: ventas,
      meta: {
        total: totalVentas,
        paginaActual: pagina,
        limitePorPagina: limite,
        totalPaginas: Math.ceil(totalVentas / limite),
      },
    });
  } catch (error) {
    console.error("Error al listar ventas para admin:", error);
    return res
      .status(500)
      .json({ error: "Hubo un error al obtener los pedidos" });
  }
};
