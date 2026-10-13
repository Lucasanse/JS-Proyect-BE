import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../utils/AppError';
import { includeResumen, mapearResumen } from '../utils/producto.mapper';
import type { CarritoDetalle } from '../utils/catalogo.types';
import { agregarItemSchema, idProductoParamSchema, modificarCantidadSchema } from '../validations/carrito.validation';

// Todas las rutas del carrito pasan por requireAuth, asi que req.usuario siempre existe.
// Better Auth devuelve el id como string; en la base es Int.
const idUsuarioDe = (req: Request) => Number(req.usuario!.id);

// Cada usuario tiene un unico carrito: si no existe todavia, se crea.
async function obtenerOCrearCarrito(idUsuario: number) {
  return prisma.carrito.upsert({ where: { idUsuario }, create: { idUsuario }, update: {} });
}

async function buscarProducto(idProducto: number) {
  const producto = await prisma.producto.findUnique({ where: { idProducto } });
  if (!producto) throw new AppError(404, 'Producto no encontrado');
  if (!producto.activo) throw new AppError(400, 'El producto ya no está disponible');
  return producto;
}

// Arma la respuesta con el detalle de cada item y el total.
async function detalleCarrito(idCarrito: number): Promise<CarritoDetalle> {
  const items = await prisma.itemCarrito.findMany({
    where: { idCarrito },
    include: { producto: { include: includeResumen } },
    orderBy: { idItemCarrito: 'asc' },
  });

  const detalle = items.map((i) => {
    const producto = mapearResumen(i.producto);
    return { producto, cantidad: i.cantidad, subtotal: producto.precio * i.cantidad };
  });

  return {
    items: detalle,
    cantidadTotal: detalle.reduce((acc, i) => acc + i.cantidad, 0),
    // Se redondea a 2 decimales para evitar errores de coma flotante
    total: Math.round(detalle.reduce((acc, i) => acc + i.subtotal, 0) * 100) / 100,
  };
}

// GET /api/carrito
export async function obtenerCarrito(req: Request, res: Response<CarritoDetalle>) {
  const carrito = await obtenerOCrearCarrito(idUsuarioDe(req));
  res.json(await detalleCarrito(carrito.idCarrito));
}

// POST /api/carrito/items  { idProducto, cantidad }
// Si el producto ya estaba en el carrito, suma la cantidad.
export async function agregarItem(req: Request, res: Response<CarritoDetalle>) {
  const { idProducto, cantidad } = agregarItemSchema.parse(req.body);
  const carrito = await obtenerOCrearCarrito(idUsuarioDe(req));
  const producto = await buscarProducto(idProducto);

  if (producto.stock <= 0) throw new AppError(400, 'El producto no tiene stock');

  const existente = await prisma.itemCarrito.findUnique({
    where: { idCarrito_idProducto: { idCarrito: carrito.idCarrito, idProducto } },
  });
  const nuevaCantidad = (existente?.cantidad ?? 0) + cantidad;

  if (nuevaCantidad > producto.stock) {
    throw new AppError(400, `Stock insuficiente. Disponible: ${producto.stock}`);
  }

  await prisma.itemCarrito.upsert({
    where: { idCarrito_idProducto: { idCarrito: carrito.idCarrito, idProducto } },
    create: { idCarrito: carrito.idCarrito, idProducto, cantidad: nuevaCantidad },
    update: { cantidad: nuevaCantidad },
  });

  res.status(201).json(await detalleCarrito(carrito.idCarrito));
}

// PATCH /api/carrito/items/:idProducto  { cantidad }
// Reemplaza la cantidad del item.
export async function modificarCantidad(req: Request, res: Response<CarritoDetalle>) {
  const { idProducto } = idProductoParamSchema.parse(req.params);
  const { cantidad } = modificarCantidadSchema.parse(req.body);
  const carrito = await obtenerOCrearCarrito(idUsuarioDe(req));
  const producto = await buscarProducto(idProducto);

  if (cantidad > producto.stock) {
    throw new AppError(400, `Stock insuficiente. Disponible: ${producto.stock}`);
  }

  const { count } = await prisma.itemCarrito.updateMany({
    where: { idCarrito: carrito.idCarrito, idProducto },
    data: { cantidad },
  });
  if (count === 0) throw new AppError(404, 'El producto no esta en el carrito');

  res.json(await detalleCarrito(carrito.idCarrito));
}

// DELETE /api/carrito/items/:idProducto
export async function quitarItem(req: Request, res: Response<CarritoDetalle>) {
  const { idProducto } = idProductoParamSchema.parse(req.params);
  const carrito = await obtenerOCrearCarrito(idUsuarioDe(req));

  const { count } = await prisma.itemCarrito.deleteMany({
    where: { idCarrito: carrito.idCarrito, idProducto },
  });
  if (count === 0) throw new AppError(404, 'El producto no esta en el carrito');

  res.json(await detalleCarrito(carrito.idCarrito));
}

// DELETE /api/carrito  (vacia el carrito completo)
export async function vaciarCarrito(req: Request, res: Response<CarritoDetalle>) {
  const carrito = await obtenerOCrearCarrito(idUsuarioDe(req));
  await prisma.itemCarrito.deleteMany({ where: { idCarrito: carrito.idCarrito } });
  res.json(await detalleCarrito(carrito.idCarrito));
}
