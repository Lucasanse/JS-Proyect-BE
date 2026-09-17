const prisma = require('../prisma/client');
const { ApiError } = require('../middlewares/error.middleware');
const { sinPassword } = require('./auth.service');

async function obtenerPropio(idUsuario) {
  const usuario = await prisma.usuario.findUnique({ where: { idUsuario }, include: { idioma: true } });
  if (!usuario) throw new ApiError(404, 'Usuario no encontrado');
  return sinPassword(usuario);
}

async function actualizarPropio(idUsuario, data) {
  if (data.idIdioma) {
    const idioma = await prisma.idioma.findUnique({ where: { idIdioma: data.idIdioma } });
    if (!idioma) throw new ApiError(400, 'El idioma indicado no existe');
  }
  const usuario = await prisma.usuario.update({ where: { idUsuario }, data });
  return sinPassword(usuario);
}

async function listar({ rol, page = 1, limit = 20 }) {
  const where = rol ? { rol } : {};
  const [usuarios, total] = await Promise.all([
    prisma.usuario.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { idUsuario: 'asc' },
    }),
    prisma.usuario.count({ where }),
  ]);

  return {
    data: usuarios.map(sinPassword),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

async function obtenerPorId(idUsuario) {
  const usuario = await prisma.usuario.findUnique({ where: { idUsuario }, include: { idioma: true } });
  if (!usuario) throw new ApiError(404, 'Usuario no encontrado');
  return sinPassword(usuario);
}

async function actualizarPorAdmin(idUsuario, data) {
  if (data.idIdioma) {
    const idioma = await prisma.idioma.findUnique({ where: { idIdioma: data.idIdioma } });
    if (!idioma) throw new ApiError(400, 'El idioma indicado no existe');
  }
  const usuario = await prisma.usuario.update({ where: { idUsuario }, data });
  return sinPassword(usuario);
}

async function eliminar(idUsuario) {
  await prisma.usuario.delete({ where: { idUsuario } });
}

module.exports = { obtenerPropio, actualizarPropio, listar, obtenerPorId, actualizarPorAdmin, eliminar };
