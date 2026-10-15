import { prisma } from "../utils/prisma";

export async function procesarCompraAprobadaCarrito(
  idUsuario: number,
  idPagoMP: string,
) {
  return await prisma.$transaction(async (tx) => {
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
}
