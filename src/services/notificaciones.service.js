const prisma = require('../prisma/client');
const { ApiError } = require('../middlewares/error.middleware');

async function listarPropias(idUsuario, { leida, page = 1, limit = 20 }) {
  const where = { idUsuario, ...(leida !== undefined ? { leida: leida === 'true' } : {}) };
  const [notificaciones, total] = await Promise.all([
    prisma.notificacion.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { fecha: 'desc' },
    }),
    prisma.notificacion.count({ where }),
  ]);
  return { data: notificaciones, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

async function marcarComoLeida(idUsuario, idNotificacion) {
  const notificacion = await prisma.notificacion.findUnique({ where: { idNotificacion } });
  if (!notificacion || notificacion.idUsuario !== idUsuario) {
    throw new ApiError(404, 'Notificacion no encontrada');
  }
  return prisma.notificacion.update({ where: { idNotificacion }, data: { leida: true } });
}

async function marcarTodasComoLeidas(idUsuario) {
  await prisma.notificacion.updateMany({ where: { idUsuario, leida: false }, data: { leida: true } });
}

module.exports = { listarPropias, marcarComoLeida, marcarTodasComoLeidas };
