const prisma = require('../prisma/client');
const { ApiError } = require('../middlewares/error.middleware');

function includeCompleto() {
  return { componentes: { include: { componentePC: { include: { producto: true } } } } };
}

async function crear(idUsuario, data) {
  return prisma.preset.create({ data: { idUsuario, ...data }, include: includeCompleto() });
}

async function obtenerPropioPorId(idUsuario, idPreset) {
  const preset = await prisma.preset.findUnique({ where: { idPreset }, include: includeCompleto() });
  if (!preset || preset.idUsuario !== idUsuario) throw new ApiError(404, 'Preset no encontrado');
  return preset;
}

async function listarPropios(idUsuario) {
  return prisma.preset.findMany({
    where: { idUsuario },
    include: includeCompleto(),
    orderBy: { idPreset: 'desc' },
  });
}

async function agregarComponente(idUsuario, idPreset, idProducto) {
  await obtenerPropioPorId(idUsuario, idPreset);

  const componentePC = await prisma.componentePC.findUnique({ where: { idProducto } });
  if (!componentePC) throw new ApiError(400, 'El producto indicado no es un componente de PC');

  const existente = await prisma.componentePreset.findUnique({
    where: { idPreset_idProducto: { idPreset, idProducto } },
  });
  if (existente) throw new ApiError(409, 'Ese componente ya esta en el preset');

  await prisma.componentePreset.create({ data: { idPreset, idProducto } });
  return obtenerPropioPorId(idUsuario, idPreset);
}

async function eliminarComponente(idUsuario, idPreset, idComponentePreset) {
  await obtenerPropioPorId(idUsuario, idPreset);

  const componente = await prisma.componentePreset.findUnique({ where: { idComponentePreset } });
  if (!componente || componente.idPreset !== idPreset) throw new ApiError(404, 'Componente no encontrado en el preset');

  await prisma.componentePreset.delete({ where: { idComponentePreset } });
  return obtenerPropioPorId(idUsuario, idPreset);
}

async function eliminar(idUsuario, idPreset) {
  await obtenerPropioPorId(idUsuario, idPreset);
  await prisma.preset.delete({ where: { idPreset } });
}

module.exports = { crear, obtenerPropioPorId, listarPropios, agregarComponente, eliminarComponente, eliminar };
