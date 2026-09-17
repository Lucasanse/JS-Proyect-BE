const prisma = require('../prisma/client');
const { ApiError } = require('../middlewares/error.middleware');

async function listar() {
  return prisma.categoria.findMany({ orderBy: { idCategoria: 'asc' } });
}

async function obtenerPorId(idCategoria) {
  const categoria = await prisma.categoria.findUnique({ where: { idCategoria } });
  if (!categoria) throw new ApiError(404, 'Categoria no encontrada');
  return categoria;
}

async function crear(data) {
  return prisma.categoria.create({ data });
}

async function actualizar(idCategoria, data) {
  await obtenerPorId(idCategoria);
  return prisma.categoria.update({ where: { idCategoria }, data });
}

async function eliminar(idCategoria) {
  await obtenerPorId(idCategoria);
  await prisma.categoria.delete({ where: { idCategoria } });
}

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
