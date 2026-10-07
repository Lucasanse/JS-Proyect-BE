import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { AppError } from "../utils/AppError";
import type { Paginado, ProductoAdmin } from "../utils/catalogo.types";
import { borrarImagenLocal } from "../middlewares/subirImagen";
import {
  estadoSchema,
  idParamSchema,
  listarAdminQuerySchema,
  productoParcialSchema,
  productoSchema,
  type ProductoParcialInput,
} from "../validations/adminProductos.validation";

// Todas estas rutas pasan por requireAuth + requireAdmin (ver routes/index.ts).

const CODIGO_INGLES = "en";

const includeAdmin = {
  categoria: true,
  marca: true,
  componentePC: {
    include: {
      tipoComponente: { select: { nombre: true } },
      valoresAtributo: { select: { idAtributo: true, valor: true }, orderBy: { idAtributo: "asc" } },
    },
  },
  traducciones: {
    where: { idioma: { codigo: CODIGO_INGLES } },
    select: { nombreTraducido: true, descripcionTraducida: true },
    take: 1,
  },
} satisfies Prisma.ProductoInclude;

type ProductoConAdmin = Prisma.ProductoGetPayload<{ include: typeof includeAdmin }>;

function mapearAdmin(p: ProductoConAdmin): ProductoAdmin {
  const traduccion = p.traducciones[0];
  return {
    id: p.idProducto,
    nombre: p.nombre,
    descripcion: p.descripcion,
    marca: { id: p.marca.idMarca, nombre: p.marca.nombre },
    precio: p.precio.toNumber(),
    stock: p.stock,
    imagenUrl: p.imagenUrl,
    activo: p.activo,
    categoria: { id: p.categoria.idCategoria, nombre: p.categoria.nombre },
    traduccionEn: traduccion
      ? { nombre: traduccion.nombreTraducido, descripcion: traduccion.descripcionTraducida }
      : null,
    componente: p.componentePC
      ? {
          idTipoComponente: p.componentePC.idTipoComponente,
          tipo: p.componentePC.tipoComponente.nombre,
          wattsRequeridos: p.componentePC.wattsRequeridos,
          atributos: p.componentePC.valoresAtributo,
        }
      : null,
  };
}

async function buscarProducto(idProducto: number) {
  const producto = await prisma.producto.findUnique({ where: { idProducto }, include: includeAdmin });
  if (!producto) throw new AppError(404, "Producto no encontrado");
  return producto;
}

async function validarCategoriaYMarca(idCategoria: number | undefined, idMarca: number | undefined) {
  if (idCategoria !== undefined && !(await prisma.categoria.findUnique({ where: { idCategoria } }))) {
    throw new AppError(400, "La categoría no existe");
  }
  if (idMarca !== undefined && !(await prisma.marca.findUnique({ where: { idMarca } }))) {
    throw new AppError(400, "La marca no existe");
  }
}

// Crea, reemplaza o borra (null) la traduccion al ingles. undefined = no se toca.
async function guardarTraduccionEn(
  tx: Prisma.TransactionClient,
  idProducto: number,
  traduccion: ProductoParcialInput["traduccionEn"],
) {
  if (traduccion === undefined) return;
  const idioma = await tx.idioma.findUnique({ where: { codigo: CODIGO_INGLES } });
  if (!idioma) {
    if (traduccion === null) return;
    throw new AppError(400, "El idioma inglés no está configurado");
  }
  const id = { idProducto, idIdioma: idioma.idIdioma };

  if (traduccion === null) {
    await tx.traduccionProducto.deleteMany({ where: id });
    return;
  }
  const datos = { nombreTraducido: traduccion.nombre, descripcionTraducida: traduccion.descripcion };
  await tx.traduccionProducto.upsert({
    where: { idProducto_idIdioma: id },
    create: { ...id, ...datos },
    update: datos,
  });
}

// Crea, reemplaza o quita (null) los datos de componente de PC. undefined = no se toca.
async function guardarComponente(
  tx: Prisma.TransactionClient,
  idProducto: number,
  componente: ProductoParcialInput["componente"],
) {
  if (componente === undefined) return;

  if (componente === null) {
    if (!(await tx.componentePC.findUnique({ where: { idProducto } }))) return;
    if ((await tx.componentePreset.count({ where: { idProducto } })) > 0) {
      throw new AppError(
        409,
        "No se puede quitar el tipo de componente porque el producto forma parte de PCs armadas por usuarios.",
      );
    }
    await tx.componentePC.delete({ where: { idProducto } }); // los valores se borran en cascada
    return;
  }

  const tipo = await tx.tipoComponente.findUnique({
    where: { idTipoComponente: componente.idTipoComponente },
    include: { atributos: true },
  });
  if (!tipo) throw new AppError(400, "El tipo de componente no existe");

  const definiciones = new Map(tipo.atributos.map((a) => [a.idAtributo, a]));
  const valores = componente.atributos.map(({ idAtributo, valor }) => {
    const atributo = definiciones.get(idAtributo);
    if (!atributo) {
      throw new AppError(400, `Hay atributos que no corresponden al tipo "${tipo.nombre}"`);
    }
    if (!atributo.numerico) return { idProducto, idAtributo, valor };
    const numero = Number(valor);
    if (!Number.isFinite(numero) || numero < 0) {
      throw new AppError(400, `"${atributo.nombre}" tiene que ser un número`);
    }
    return { idProducto, idAtributo, valor: String(numero) }; // "3.80" -> "3.8"
  });

  const datos = { idTipoComponente: tipo.idTipoComponente, wattsRequeridos: componente.wattsRequeridos };
  await tx.componentePC.upsert({ where: { idProducto }, create: { idProducto, ...datos }, update: datos });
  // Los valores se reemplazan completos: si cambio el tipo, no quedan atributos del tipo anterior
  await tx.valorAtributo.deleteMany({ where: { idProducto } });
  if (valores.length > 0) await tx.valorAtributo.createMany({ data: valores });
}

// Borra la imagen del disco solo si ningun otro producto la sigue usando.
async function liberarImagen(url: string | null) {
  if (!url) return;
  const enUso = await prisma.producto.count({ where: { imagenUrl: url } });
  if (enUso === 0) await borrarImagenLocal(url);
}

// GET /api/admin/productos?q=&estado=todos|activos|inactivos&categoria=&page=&limit=
// A diferencia del catalogo publico, incluye los productos inactivos.
export async function listarProductosAdmin(req: Request, res: Response<Paginado<ProductoAdmin>>) {
  const { page, limit, q, categoria, estado } = listarAdminQuerySchema.parse(req.query);

  const where: Prisma.ProductoWhereInput = {
    OR: q
      ? [
          { nombre: { contains: q, mode: "insensitive" } },
          { marca: { nombre: { contains: q, mode: "insensitive" } } },
        ]
      : undefined,
    idCategoria: categoria,
    activo: estado === "todos" ? undefined : estado === "activos",
  };

  const [productos, total] = await prisma.$transaction([
    prisma.producto.findMany({
      where,
      include: includeAdmin,
      orderBy: { idProducto: "desc" }, // los recien creados primero
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.producto.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);
  res.json({
    data: productos.map(mapearAdmin),
    paginacion: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
  });
}

// GET /api/admin/productos/:id
export async function obtenerProductoAdmin(req: Request, res: Response<ProductoAdmin>) {
  const { id } = idParamSchema.parse(req.params);
  res.json(mapearAdmin(await buscarProducto(id)));
}

// POST /api/admin/productos
export async function crearProducto(req: Request, res: Response<ProductoAdmin>) {
  const { traduccionEn, componente, ...datos } = productoSchema.parse(req.body);
  await validarCategoriaYMarca(datos.idCategoria, datos.idMarca);

  const { idProducto } = await prisma.$transaction(async (tx) => {
    const creado = await tx.producto.create({ data: datos });
    await guardarTraduccionEn(tx, creado.idProducto, traduccionEn);
    await guardarComponente(tx, creado.idProducto, componente);
    return creado;
  });

  res.status(201).json(mapearAdmin(await buscarProducto(idProducto)));
}

// PUT /api/admin/productos/:id   -> se mandan todos los campos
// PATCH /api/admin/productos/:id -> solo los campos que cambian
export async function actualizarProducto(req: Request, res: Response<ProductoAdmin>) {
  const { id } = idParamSchema.parse(req.params);
  const schema = req.method === "PUT" ? productoSchema : productoParcialSchema;
  const { traduccionEn, componente, ...datos } = schema.parse(req.body);
  const anterior = await buscarProducto(id);
  await validarCategoriaYMarca(datos.idCategoria, datos.idMarca);

  await prisma.$transaction(async (tx) => {
    await tx.producto.update({ where: { idProducto: id }, data: datos });
    await guardarTraduccionEn(tx, id, traduccionEn);
    await guardarComponente(tx, id, componente);
  });

  if (datos.imagenUrl !== undefined && datos.imagenUrl !== anterior.imagenUrl) {
    await liberarImagen(anterior.imagenUrl);
  }

  res.json(mapearAdmin(await buscarProducto(id)));
}

const mensajeConVentas = (nombre: string) =>
  `No se puede eliminar "${nombre}" porque tiene ventas asociadas. ` +
  "Desactivalo para que deje de aparecer en el catálogo sin perder el historial de ventas.";

// DELETE /api/admin/productos/:id
// Solo se puede eliminar si nunca se vendio. Si tiene ventas -> 409 y hay que desactivarlo.
export async function eliminarProducto(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  const producto = await buscarProducto(id);

  const ventas = await prisma.detalleVenta.count({ where: { idProducto: id } });
  if (ventas > 0) throw new AppError(409, mensajeConVentas(producto.nombre));

  const presets = await prisma.componentePreset.count({ where: { idProducto: id } });
  if (presets > 0) {
    throw new AppError(
      409,
      `No se puede eliminar "${producto.nombre}" porque forma parte de PCs armadas por usuarios. ` +
        "Desactivalo para que deje de aparecer en el catálogo.",
    );
  }

  try {
    // Los carritos no son historial: se quita el producto de los carritos y se borra.
    // Traducciones, favoritos y datos de componente se borran en cascada.
    await prisma.$transaction([
      prisma.itemCarrito.deleteMany({ where: { idProducto: id } }),
      prisma.producto.delete({ where: { idProducto: id } }),
    ]);
  } catch (e) {
    // Una venta registrada justo entre el chequeo y el borrado: la FK lo impide.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      throw new AppError(409, mensajeConVentas(producto.nombre));
    }
    throw e;
  }

  await liberarImagen(producto.imagenUrl);
  res.status(204).end();
}

// PATCH /api/admin/productos/:id/estado  { activo: boolean }
export async function cambiarEstadoProducto(req: Request, res: Response<ProductoAdmin>) {
  const { id } = idParamSchema.parse(req.params);
  const { activo } = estadoSchema.parse(req.body);
  await buscarProducto(id);

  await prisma.producto.update({ where: { idProducto: id }, data: { activo } });
  res.json(mapearAdmin(await buscarProducto(id)));
}

// POST /api/admin/productos/imagen  (multipart/form-data, campo "imagen")
// Guarda el archivo y devuelve la URL publica para usarla como imagenUrl del producto.
export async function subirImagenProducto(req: Request, res: Response<{ url: string }>) {
  if (!req.file) throw new AppError(400, "No se envió ninguna imagen");
  const base = process.env.PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
  res.status(201).json({ url: `${base}/uploads/${req.file.filename}` });
}
