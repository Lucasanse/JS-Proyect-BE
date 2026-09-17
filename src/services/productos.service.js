const prisma = require('../prisma/client');
const { ApiError } = require('../middlewares/error.middleware');

const PRODUCTO_FIELDS = ['idCategoria', 'nombre', 'marca', 'precio', 'stock'];
const COMPONENTE_FIELDS = ['tipoComponente', 'socket', 'wattsRequeridos'];

function separarCampos(data) {
  const productoData = {};
  const componenteData = {};
  for (const [key, value] of Object.entries(data)) {
    if (PRODUCTO_FIELDS.includes(key)) productoData[key] = value;
    if (COMPONENTE_FIELDS.includes(key)) componenteData[key] = value;
  }
  return { productoData, componenteData };
}

async function listar({ idCategoria, marca, search, page = 1, limit = 20 }) {
  const where = {
    ...(idCategoria ? { idCategoria } : {}),
    ...(marca ? { marca: { equals: marca, mode: 'insensitive' } } : {}),
    ...(search ? { nombre: { contains: search, mode: 'insensitive' } } : {}),
  };

  const [productos, total] = await Promise.all([
    prisma.producto.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { idProducto: 'asc' },
      include: { categoria: true, componentePC: true },
    }),
    prisma.producto.count({ where }),
  ]);

  return { data: productos, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

async function obtenerPorId(idProducto) {
  const producto = await prisma.producto.findUnique({
    where: { idProducto },
    include: { categoria: true, componentePC: true, traducciones: true },
  });
  if (!producto) throw new ApiError(404, 'Producto no encontrado');
  return producto;
}

async function crear(data) {
  const categoria = await prisma.categoria.findUnique({ where: { idCategoria: data.idCategoria } });
  if (!categoria) throw new ApiError(400, 'La categoria indicada no existe');
  return prisma.producto.create({ data });
}

async function actualizar(idProducto, data) {
  await obtenerPorId(idProducto);
  if (data.idCategoria) {
    const categoria = await prisma.categoria.findUnique({ where: { idCategoria: data.idCategoria } });
    if (!categoria) throw new ApiError(400, 'La categoria indicada no existe');
  }
  return prisma.producto.update({ where: { idProducto }, data });
}

async function eliminar(idProducto) {
  await obtenerPorId(idProducto);
  await prisma.producto.delete({ where: { idProducto } });
}

async function listarComponentes({ tipoComponente, page = 1, limit = 20 }) {
  const where = tipoComponente ? { tipoComponente: { equals: tipoComponente, mode: 'insensitive' } } : {};

  const [componentes, total] = await Promise.all([
    prisma.componentePC.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { idProducto: 'asc' },
      include: { producto: { include: { categoria: true } } },
    }),
    prisma.componentePC.count({ where }),
  ]);

  return { data: componentes, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

async function crearComponente(data) {
  const categoria = await prisma.categoria.findUnique({ where: { idCategoria: data.idCategoria } });
  if (!categoria) throw new ApiError(400, 'La categoria indicada no existe');

  const { productoData, componenteData } = separarCampos(data);

  return prisma.$transaction(async (tx) => {
    const producto = await tx.producto.create({ data: productoData });
    const componentePC = await tx.componentePC.create({
      data: { idProducto: producto.idProducto, ...componenteData },
    });
    return { ...producto, componentePC };
  });
}

async function actualizarComponente(idProducto, data) {
  const componente = await prisma.componentePC.findUnique({ where: { idProducto } });
  if (!componente) throw new ApiError(404, 'Componente no encontrado');

  if (data.idCategoria) {
    const categoria = await prisma.categoria.findUnique({ where: { idCategoria: data.idCategoria } });
    if (!categoria) throw new ApiError(400, 'La categoria indicada no existe');
  }

  const { productoData, componenteData } = separarCampos(data);

  return prisma.$transaction(async (tx) => {
    let producto = await tx.producto.findUnique({ where: { idProducto } });
    if (Object.keys(productoData).length > 0) {
      producto = await tx.producto.update({ where: { idProducto }, data: productoData });
    }
    let componentePC = componente;
    if (Object.keys(componenteData).length > 0) {
      componentePC = await tx.componentePC.update({ where: { idProducto }, data: componenteData });
    }
    return { ...producto, componentePC };
  });
}

async function eliminarComponente(idProducto) {
  const componente = await prisma.componentePC.findUnique({ where: { idProducto } });
  if (!componente) throw new ApiError(404, 'Componente no encontrado');
  // Cascade elimina el registro de ComponentePC al borrar el Producto
  await prisma.producto.delete({ where: { idProducto } });
}

async function listarTraducciones(idProducto) {
  await obtenerPorId(idProducto);
  return prisma.traduccionProducto.findMany({ where: { idProducto }, include: { idioma: true } });
}

async function crearTraduccion(idProducto, data) {
  await obtenerPorId(idProducto);

  const idioma = await prisma.idioma.findUnique({ where: { idIdioma: data.idIdioma } });
  if (!idioma) throw new ApiError(400, 'El idioma indicado no existe');

  const existente = await prisma.traduccionProducto.findUnique({
    where: { idProducto_idIdioma: { idProducto, idIdioma: data.idIdioma } },
  });
  if (existente) throw new ApiError(409, 'Ya existe una traduccion para ese producto en ese idioma');

  return prisma.traduccionProducto.create({ data: { idProducto, ...data } });
}

async function actualizarTraduccion(idTraduccion, data) {
  const traduccion = await prisma.traduccionProducto.findUnique({ where: { idTraduccion } });
  if (!traduccion) throw new ApiError(404, 'Traduccion no encontrada');
  return prisma.traduccionProducto.update({ where: { idTraduccion }, data });
}

async function eliminarTraduccion(idTraduccion) {
  const traduccion = await prisma.traduccionProducto.findUnique({ where: { idTraduccion } });
  if (!traduccion) throw new ApiError(404, 'Traduccion no encontrada');
  await prisma.traduccionProducto.delete({ where: { idTraduccion } });
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  listarComponentes,
  crearComponente,
  actualizarComponente,
  eliminarComponente,
  listarTraducciones,
  crearTraduccion,
  actualizarTraduccion,
  eliminarTraduccion,
};
