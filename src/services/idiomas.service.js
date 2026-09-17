const prisma = require('../prisma/client');
const { ApiError } = require('../middlewares/error.middleware');

async function listar() {
  return prisma.idioma.findMany({ orderBy: { idIdioma: 'asc' } });
}

async function obtenerPorId(idIdioma) {
  const idioma = await prisma.idioma.findUnique({ where: { idIdioma } });
  if (!idioma) throw new ApiError(404, 'Idioma no encontrado');
  return idioma;
}

async function crear(data) {
  return prisma.idioma.create({ data });
}

async function actualizar(idIdioma, data) {
  await obtenerPorId(idIdioma);
  return prisma.idioma.update({ where: { idIdioma }, data });
}

async function eliminar(idIdioma) {
  await obtenerPorId(idIdioma);
  await prisma.idioma.delete({ where: { idIdioma } });
}

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
