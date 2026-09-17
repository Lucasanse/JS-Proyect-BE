const prisma = require('../prisma/client');
const { ApiError } = require('../middlewares/error.middleware');

async function agregar(idUsuario, idProducto) {
  const producto = await prisma.producto.findUnique({ where: { idProducto } });
  if (!producto) throw new ApiError(404, 'Producto no encontrado');

  const existente = await prisma.favorito.findUnique({
    where: { idUsuario_idProducto: { idUsuario, idProducto } },
  });
  if (existente) throw new ApiError(409, 'El producto ya esta en tus favoritos');

  return prisma.favorito.create({ data: { idUsuario, idProducto }, include: { producto: true } });
}

async function eliminar(idUsuario, idProducto) {
  const favorito = await prisma.favorito.findUnique({
    where: { idUsuario_idProducto: { idUsuario, idProducto } },
  });
  if (!favorito) throw new ApiError(404, 'El producto no esta en tus favoritos');

  await prisma.favorito.delete({ where: { idFavorito: favorito.idFavorito } });
}

async function listar(idUsuario) {
  return prisma.favorito.findMany({
    where: { idUsuario },
    include: { producto: true },
    orderBy: { fechaAgregado: 'desc' },
  });
}

module.exports = { agregar, eliminar, listar };
