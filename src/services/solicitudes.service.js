const prisma = require('../prisma/client');
const { ApiError } = require('../middlewares/error.middleware');

async function crear(idUsuario, data) {
  return prisma.solicitudServicio.create({
    data: { idUsuario, descripcion: data.descripcion, diagnosticoIA: data.diagnosticoIA ?? null },
  });
}

async function listarPropias(idUsuario, { page = 1, limit = 20 }) {
  const where = { idUsuario };
  const [solicitudes, total] = await Promise.all([
    prisma.solicitudServicio.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { fecha: 'desc' },
    }),
    prisma.solicitudServicio.count({ where }),
  ]);
  return { data: solicitudes, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

async function listar({ estado, page = 1, limit = 20 }) {
  const where = estado ? { estado } : {};
  const [solicitudes, total] = await Promise.all([
    prisma.solicitudServicio.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { fecha: 'desc' },
      include: { usuario: true },
    }),
    prisma.solicitudServicio.count({ where }),
  ]);
  return { data: solicitudes, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

async function obtenerPorId(idSolicitud, usuarioActual) {
  const solicitud = await prisma.solicitudServicio.findUnique({ where: { idSolicitud } });
  if (!solicitud) throw new ApiError(404, 'Solicitud no encontrada');
  if (usuarioActual.rol !== 'ADMIN' && solicitud.idUsuario !== usuarioActual.idUsuario) {
    throw new ApiError(403, 'No tenes permisos para ver esta solicitud');
  }
  return solicitud;
}

async function actualizarEstado(idSolicitud, data) {
  const solicitud = await prisma.solicitudServicio.findUnique({ where: { idSolicitud } });
  if (!solicitud) throw new ApiError(404, 'Solicitud no encontrada');
  return prisma.solicitudServicio.update({ where: { idSolicitud }, data });
}

module.exports = { crear, listarPropias, listar, obtenerPorId, actualizarEstado };
