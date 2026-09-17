const prisma = require('../prisma/client');
const { ApiError } = require('../middlewares/error.middleware');

function includeCompleto() {
  return { items: { include: { producto: true }, orderBy: { idItemCarrito: 'asc' } } };
}

async function obtenerOCrearCarrito(idUsuario) {
  let carrito = await prisma.carrito.findUnique({ where: { idUsuario }, include: includeCompleto() });
  if (!carrito) {
    carrito = await prisma.carrito.create({ data: { idUsuario }, include: includeCompleto() });
  }
  return carrito;
}

async function agregarItem(idUsuario, { idProducto, cantidad }) {
  const producto = await prisma.producto.findUnique({ where: { idProducto } });
  if (!producto) throw new ApiError(404, 'Producto no encontrado');
  if (producto.stock <= 0) throw new ApiError(400, 'El producto no tiene stock disponible');

  const carrito = await prisma.carrito.upsert({
    where: { idUsuario },
    create: { idUsuario },
    update: {},
  });

  const itemExistente = await prisma.itemCarrito.findUnique({
    where: { idCarrito_idProducto: { idCarrito: carrito.idCarrito, idProducto } },
  });

  const cantidadTotal = (itemExistente?.cantidad ?? 0) + cantidad;
  if (cantidadTotal > producto.stock) {
    throw new ApiError(400, `Stock insuficiente. Disponible: ${producto.stock}`);
  }

  if (itemExistente) {
    await prisma.itemCarrito.update({
      where: { idItemCarrito: itemExistente.idItemCarrito },
      data: { cantidad: cantidadTotal },
    });
  } else {
    await prisma.itemCarrito.create({
      data: { idCarrito: carrito.idCarrito, idProducto, cantidad },
    });
  }

  return obtenerOCrearCarrito(idUsuario);
}

async function actualizarItem(idUsuario, idItemCarrito, cantidad) {
  const item = await prisma.itemCarrito.findUnique({
    where: { idItemCarrito },
    include: { carrito: true, producto: true },
  });
  if (!item || item.carrito.idUsuario !== idUsuario) throw new ApiError(404, 'Item no encontrado en tu carrito');

  if (cantidad > item.producto.stock) {
    throw new ApiError(400, `Stock insuficiente. Disponible: ${item.producto.stock}`);
  }

  await prisma.itemCarrito.update({ where: { idItemCarrito }, data: { cantidad } });
  return obtenerOCrearCarrito(idUsuario);
}

async function eliminarItem(idUsuario, idItemCarrito) {
  const item = await prisma.itemCarrito.findUnique({ where: { idItemCarrito }, include: { carrito: true } });
  if (!item || item.carrito.idUsuario !== idUsuario) throw new ApiError(404, 'Item no encontrado en tu carrito');

  await prisma.itemCarrito.delete({ where: { idItemCarrito } });
  return obtenerOCrearCarrito(idUsuario);
}

async function vaciarCarrito(idUsuario) {
  const carrito = await prisma.carrito.findUnique({ where: { idUsuario } });
  if (!carrito) return obtenerOCrearCarrito(idUsuario);

  await prisma.itemCarrito.deleteMany({ where: { idCarrito: carrito.idCarrito } });
  return obtenerOCrearCarrito(idUsuario);
}

module.exports = { obtenerOCrearCarrito, agregarItem, actualizarItem, eliminarItem, vaciarCarrito };
