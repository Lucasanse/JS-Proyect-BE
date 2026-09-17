const prisma = require('../prisma/client');
const { ApiError } = require('../middlewares/error.middleware');

function includeCompleto() {
  return { detalles: { include: { producto: true } }, factura: true };
}

async function crearDesdeCarrito(idUsuario) {
  const carrito = await prisma.carrito.findUnique({
    where: { idUsuario },
    include: { items: { include: { producto: true } } },
  });

  if (!carrito || carrito.items.length === 0) {
    throw new ApiError(400, 'El carrito esta vacio');
  }

  return prisma.$transaction(async (tx) => {
    let total = 0;
    const detallesData = [];

    for (const item of carrito.items) {
      const producto = await tx.producto.findUnique({ where: { idProducto: item.idProducto } });
      if (!producto || producto.stock < item.cantidad) {
        throw new ApiError(400, `Stock insuficiente para el producto "${item.producto.nombre}"`);
      }

      await tx.producto.update({
        where: { idProducto: producto.idProducto },
        data: { stock: producto.stock - item.cantidad },
      });

      detallesData.push({
        idProducto: producto.idProducto,
        cantidad: item.cantidad,
        precioUnitario: producto.precio,
      });
      total += Number(producto.precio) * item.cantidad;
    }

    const venta = await tx.venta.create({
      data: {
        idUsuario,
        total,
        estado: 'PENDIENTE',
        detalles: { create: detallesData },
      },
      include: includeCompleto(),
    });

    await tx.itemCarrito.deleteMany({ where: { idCarrito: carrito.idCarrito } });

    return venta;
  });
}

async function listarPropias(idUsuario, { page = 1, limit = 20 }) {
  const where = { idUsuario };
  const [ventas, total] = await Promise.all([
    prisma.venta.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { fecha: 'desc' },
      include: includeCompleto(),
    }),
    prisma.venta.count({ where }),
  ]);
  return { data: ventas, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

async function listar({ estado, page = 1, limit = 20 }) {
  const where = estado ? { estado } : {};
  const [ventas, total] = await Promise.all([
    prisma.venta.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { fecha: 'desc' },
      include: { ...includeCompleto(), usuario: true },
    }),
    prisma.venta.count({ where }),
  ]);
  return { data: ventas, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

async function obtenerPorId(idVenta, usuarioActual) {
  const venta = await prisma.venta.findUnique({ where: { idVenta }, include: includeCompleto() });
  if (!venta) throw new ApiError(404, 'Venta no encontrada');
  if (usuarioActual.rol !== 'ADMIN' && venta.idUsuario !== usuarioActual.idUsuario) {
    throw new ApiError(403, 'No tenes permisos para ver esta venta');
  }
  return venta;
}

async function actualizarEstado(idVenta, estado) {
  const venta = await prisma.venta.findUnique({ where: { idVenta } });
  if (!venta) throw new ApiError(404, 'Venta no encontrada');
  return prisma.venta.update({ where: { idVenta }, data: { estado }, include: includeCompleto() });
}

module.exports = { crearDesdeCarrito, listarPropias, listar, obtenerPorId, actualizarEstado };
