import { error } from "node:console";
import { prisma } from "../utils/prisma";
import { crearNotificacionCompra } from "../utils/notificaciones";

export async function procesarCompraAprobadaUnidad(
  idUsuario: number,
  idPagoMP: string,
  idProducto: number,
  cantidad: number,
) {
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
    let totalVenta = Number(producto.precio) * cantidad;

    const nuevaVenta = await tx.venta.create({
      data: {
        idUsuario,
        total: totalVenta,
        estado: "Pagado",
        idPagoMp: idPagoMP,
        detalles: {
          create: {
            idProducto: idProducto,
            cantidad: cantidad,
            precioUnitario: producto.precio,
          },
        },
      },
    });
    await tx.producto.update({
      where: { idProducto: idProducto },
      data: { stock: { decrement: cantidad } },
    });

    return nuevaVenta;
  });
  crearNotificacionCompra(idUsuario, resultadoVenta.idVenta);
  return resultadoVenta;
}

export async function procesarCompraAprobadaCarrito(
  idUsuario: number,
  idPagoMP: string,
) {
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
      include: { items: { include: { producto: true } } },
    });

    if (!carrito || carrito.items.length === 0) {
      throw new Error("El carrito no existe o esta vacio");
    }

    //Armamos lo que va en la tabla detalleVenta
    let totalVenta = 0;
    const detallesParaInsertar = carrito.items.map((item) => {
      const subtotal = Number(item.producto.precio) * item.cantidad;
      totalVenta += subtotal;

      return {
        idProducto: item.idProducto,
        cantidad: item.cantidad,
        precioUnitario: item.producto.precio,
      };
    });

    //Creamos la venta y le metemos los detalles de arriba

    const nuevaVenta = await tx.venta.create({
      data: {
        idUsuario,
        total: totalVenta,
        estado: "Pagado",
        idPagoMp: idPagoMP,
        detalles: {
          create: detallesParaInsertar,
        },
      },
    });

    //Descontamos el stock de cada producto vendido

    for (const item of carrito.items) {
      await tx.producto.update({
        where: { idProducto: item.idProducto },
        data: { stock: { decrement: item.cantidad } },
      });
    }

    //Limpiamos el carrito del usuario
    await tx.itemCarrito.deleteMany({
      where: { idCarrito: carrito.idCarrito },
    });

    return nuevaVenta;
  });
  crearNotificacionCompra(idUsuario, resultadoVenta.idVenta);
  return resultadoVenta;
}
