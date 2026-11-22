import { error } from "node:console";
import { prisma } from "../utils/prisma";
import {
  crearNotificacionCompra,
  notificarAdminsVentaNueva,
  notificarPresetsAfectados,
} from "../utils/notificaciones";
import { cotizacionParaVenta } from "../utils/cotizacion";
import { preciosProducto, preciosServicio } from "../utils/iva";
import { emitirFacturaSinFallar } from "../utils/documentos";

// Avisa a los admins de la compra y a los usuarios cuyos armados se quedaron sin stock por ella
async function avisosVentaNueva(idVenta: number) {
  await notificarAdminsVentaNueva(idVenta);
  const agotados = await prisma.producto.findMany({
    where: { stock: { lte: 0 }, detallesVenta: { some: { idVenta } } },
    select: { idProducto: true },
  });
  await notificarPresetsAfectados(agotados.map((p) => p.idProducto), "SIN_STOCK");
}

export async function procesarCompraAprobadaUnidad(
  idUsuario: number,
  idPagoMP: string,
  idProducto: number,
  cantidad: number,
) {
  // Solo una venta nueva avisa a los admins y a los armados (MP repite el aviso del mismo pago)
  let esNueva = false;
  const resultadoVenta = await prisma.$transaction(async (tx) => {
    //Esto lo hacemos pq MP tira muchos avisos y esto hace que quede limpio y sin que se duplique
    const ventaExistente = await tx.venta.findUnique({
      where: { idPagoMp: idPagoMP },
    });

    if (ventaExistente) {
      console.log(
        `El pago ${idPagoMP} del carrito ya fue procesado. Ignorando duplicado.`,
      );
      return ventaExistente;
    }
    const producto = await tx.producto.findUnique({
      where: {
        idProducto: idProducto,
      },
    });
    if (!producto) {
      throw new Error(
        "El producto no existe o hubo un error en la transaccion del sistema",
      );
    }
    //Creamos lo que va en detalleVenta
    // Se cobra con IVA
    const { final, alicuotaIva } = preciosProducto(producto);
    let totalVenta = Math.round(final * cantidad * 100) / 100;

    const nuevaVenta = await tx.venta.create({
      data: {
        idUsuario,
        total: totalVenta,
        estado: "Pagado",
        idPagoMp: idPagoMP,
        ...(await cotizacionParaVenta()),
        detalles: {
          create: {
            idProducto: idProducto,
            cantidad: cantidad,
            precioUnitario: final,
            alicuotaIva,
          },
        },
      },
    });
    await tx.producto.update({
      where: { idProducto: idProducto },
      data: { stock: { decrement: cantidad } },
    });

    esNueva = true;
    return nuevaVenta;
  });
  crearNotificacionCompra(idUsuario, resultadoVenta.idVenta);
  if (esNueva) avisosVentaNueva(resultadoVenta.idVenta).catch((e) => console.error("Error en los avisos de la venta:", e));
  // Pago acreditado: se genera la factura en PDF (una sola vez por venta)
  emitirFacturaSinFallar(resultadoVenta.idVenta);
  return resultadoVenta;
}

export async function procesarCompraAprobadaCarrito(
  idUsuario: number,
  idPagoMP: string,
) {
  // Solo una venta nueva avisa a los admins y a los armados (MP repite el aviso del mismo pago)
  let esNueva = false;
  const resultadoVenta = await prisma.$transaction(async (tx) => {
    //Esto lo hacemos pq MP tira muchos avisos y esto hace que quede limpio y sin que se duplique
    const ventaExistente = await tx.venta.findUnique({
      where: { idPagoMp: idPagoMP },
    });

    if (ventaExistente) {
      console.log(
        `El pago ${idPagoMP} del carrito ya fue procesado. Ignorando duplicado.`,
      );
      return ventaExistente;
    }

    //Aca traemos todo el carrito

    const carrito = await tx.carrito.findUnique({
      where: { idUsuario },
      include: { items: { include: { producto: true, servicio: true } } },
    });

    if (!carrito || carrito.items.length === 0) {
      throw new Error("El carrito no existe o esta vacio");
    }

    //Armamos lo que va en la tabla detalleVenta
    let totalVenta = 0;
    // Cada item es un producto o un servicio del armador (armado de PC, instalacion de Windows...)
    const detallesParaInsertar = carrito.items.map((item) => {
      // Lo que se cobra por unidad, con IVA
      const { final, alicuotaIva } = item.producto
        ? preciosProducto(item.producto)
        : preciosServicio(item.servicio!);
      const subtotal = Math.round(final * item.cantidad * 100) / 100;
      totalVenta += subtotal;

      return {
        idProducto: item.idProducto,
        idServicio: item.idServicio,
        cantidad: item.cantidad,
        precioUnitario: final,
        alicuotaIva,
      };
    });

    //Creamos la venta y le metemos los detalles de arriba

    const nuevaVenta = await tx.venta.create({
      data: {
        idUsuario,
        total: totalVenta,
        estado: "Pagado",
        idPagoMp: idPagoMP,
        ...(await cotizacionParaVenta()),
        detalles: {
          create: detallesParaInsertar,
        },
      },
    });

    //Descontamos el stock de cada producto vendido (los servicios no tienen stock)

    for (const item of carrito.items) {
      if (!item.idProducto) continue;
      await tx.producto.update({
        where: { idProducto: item.idProducto },
        data: { stock: { decrement: item.cantidad } },
      });
    }

    //Limpiamos el carrito del usuario
    await tx.itemCarrito.deleteMany({
      where: { idCarrito: carrito.idCarrito },
    });

    esNueva = true;
    return nuevaVenta;
  });
  crearNotificacionCompra(idUsuario, resultadoVenta.idVenta);
  if (esNueva) avisosVentaNueva(resultadoVenta.idVenta).catch((e) => console.error("Error en los avisos de la venta:", e));
  // Pago acreditado: se genera la factura en PDF (una sola vez por venta)
  emitirFacturaSinFallar(resultadoVenta.idVenta);
  return resultadoVenta;
}
