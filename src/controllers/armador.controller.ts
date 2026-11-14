import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { AppError } from "../utils/AppError";
import { crearIncludeResumen, mapearResumen } from "../utils/producto.mapper";
import { detalleCarrito, obtenerOCrearCarrito } from "./carrito.controller";
import {
  CATEGORIAS_PERIFERICOS,
  CATEGORIA_MONITORES,
  CATEGORIA_SERVICIOS,
  PASO_MONITOR,
  PASO_PERIFERICOS,
  PASO_SERVICIOS,
  calcularPotencia,
  esTipoArmador,
  incompatibilidadesDe,
  permiteVarios,
  validarConfiguracion,
  type ComponenteArmado,
  type TipoArmador,
} from "../utils/armador.compatibilidad";
import type {
  CompatiblesRespuesta,
  FuenteSugeridaRespuesta,
  PresetArmado,
  ProductoArmador,
  ValidacionArmado,
} from "../utils/armador.types";
import {
  compatiblesSchema,
  guardarPresetSchema,
  idPresetParamSchema,
  langQuerySchema,
  seleccionBodySchema,
} from "../validations/armador.validation";

// Las rutas de carrito y presets pasan por requireAuth. Better Auth devuelve el id como string.
const idUsuarioDe = (req: Request) => Number(req.usuario!.id);

// Atributos que se muestran en cada paso para explicar la compatibilidad
const ESPECIFICACIONES: Record<TipoArmador, string[]> = {
  Motherboard: ["Socket", "Tipo de RAM", "Formato", "Slots de memoria", "Ranuras M.2", "Puertos SATA"],
  CPU: ["Socket", "Nucleos", "Memoria soportada", "Graficos integrados"],
  RAM: ["Tipo", "Capacidad", "Frecuencia", "Modulos"],
  Gabinete: ["Formato", "Motherboards soportadas", "Largo maximo de GPU", "Fuentes soportadas", "Largo maximo de fuente"],
  GPU: ["Memoria", "Largo", "Conectores de energia"],
  Almacenamiento: ["Tipo", "Capacidad", "Formato"],
  Fuente: ["Potencia", "Certificacion", "Formato", "Largo"],
};

// Mismo include que el catalogo, mas los atributos tecnicos del componente
const crearIncludeArmador = (codigoIdioma: string) =>
  ({
    ...crearIncludeResumen(codigoIdioma),
    componentePC: {
      select: {
        wattsRequeridos: true,
        tipoComponente: { select: { nombre: true } },
        valoresAtributo: { select: { valor: true, atributo: { select: { nombre: true, unidad: true } } } },
      },
    },
  }) satisfies Prisma.ProductoInclude;

type ProductoConAtributos = Prisma.ProductoGetPayload<{
  include: ReturnType<typeof crearIncludeArmador>;
}>;

interface ProductoCargado {
  producto: ProductoArmador; // para la respuesta
  cantidad: number;
  // Para las reglas de compatibilidad. null = periferico (no tiene reglas ni consumo)
  componente: ComponenteArmado | null;
}

const tipoArmadorDe = (p: ProductoConAtributos) => {
  const tipo = p.componentePC?.tipoComponente.nombre;
  return tipo && esTipoArmador(tipo) ? tipo : null;
};

const esMonitor = (p: ProductoConAtributos) => !p.componentePC && p.categoria.nombre === CATEGORIA_MONITORES;
const esPeriferico = (p: ProductoConAtributos) =>
  esMonitor(p) || (!p.componentePC && CATEGORIAS_PERIFERICOS.includes(p.categoria.nombre));
const esServicio = (p: ProductoConAtributos) => !p.componentePC && p.categoria.nombre === CATEGORIA_SERVICIOS;

// Se puede usar en el armador: un componente de alguno de los pasos o un periferico.
// Los servicios no se guardan en los armados: se eligen al comprar.
const esDelArmador = (p: ProductoConAtributos) => !!tipoArmadorDe(p) || esPeriferico(p);

function mapearArmador(p: ProductoConAtributos, cantidad = 1): ProductoCargado {
  const tipo = tipoArmadorDe(p);
  if (!p.componentePC || !tipo) {
    if (!esPeriferico(p) && !esServicio(p)) throw new AppError(400, `"${p.nombre}" no se puede usar en el armador`);
    return {
      producto: {
        ...mapearResumen(p),
        paso: esServicio(p) ? PASO_SERVICIOS : esMonitor(p) ? PASO_MONITOR : PASO_PERIFERICOS,
        watts: 0,
        especificaciones: [],
      },
      cantidad,
      componente: null,
    };
  }

  const valores = p.componentePC.valoresAtributo;
  const atributos = Object.fromEntries(valores.map((v) => [v.atributo.nombre, v.valor]));
  const especificaciones = ESPECIFICACIONES[tipo].flatMap((nombre) => {
    const v = valores.find((x) => x.atributo.nombre === nombre);
    return v ? [{ nombre, valor: v.valor, unidad: v.atributo.unidad }] : [];
  });
  const watts = p.componentePC.wattsRequeridos;

  return {
    producto: { ...mapearResumen(p), paso: tipo, watts, especificaciones },
    cantidad,
    componente: { id: p.idProducto, tipo, cantidad, watts, atributos },
  };
}

const componentesDe = (cargados: ProductoCargado[]) => cargados.flatMap((c) => c.componente ?? []);

// Trae los productos elegidos. Un componente por paso (dos motherboards, por ejemplo, es un error);
// discos y perifericos puede haber varios.
async function cargarSeleccion(
  seleccion: { idProducto: number; cantidad: number }[],
  lang = "es",
): Promise<ProductoCargado[]> {
  if (seleccion.length === 0) return [];
  const productos = await prisma.producto.findMany({
    where: { idProducto: { in: seleccion.map((s) => s.idProducto) } },
    include: crearIncludeArmador(lang),
  });
  const porId = new Map(productos.map((p) => [p.idProducto, p]));

  const cargados = seleccion.map(({ idProducto, cantidad }) => {
    const p = porId.get(idProducto);
    if (!p) throw new AppError(404, `Producto ${idProducto} no encontrado`);
    if (!p.activo) throw new AppError(400, `"${p.nombre}" ya no está disponible`);
    return mapearArmador(p, cantidad);
  });

  const tipos = componentesDe(cargados)
    .map((c) => c.tipo)
    .filter((t) => !permiteVarios(t));
  const repetido = tipos.find((t, i) => tipos.indexOf(t) !== i);
  if (repetido) throw new AppError(400, `Solo se puede elegir un componente de tipo ${repetido}`);
  return cargados;
}

function armarValidacion(cargados: ProductoCargado[]): ValidacionArmado {
  const { incompatibilidades, faltantes, potencia } = validarConfiguracion(componentesDe(cargados));
  const total = cargados.reduce((acc, c) => acc + c.producto.precio * c.cantidad, 0);
  return {
    valida: incompatibilidades.length === 0,
    completa: faltantes.length === 0,
    incompatibilidades,
    faltantes,
    potencia,
    // Se redondea a 2 decimales para evitar errores de coma flotante
    total: Math.round(total * 100) / 100,
  };
}

// 409 con el detalle, para que el FE muestre que hay que corregir
function rechazar(res: Response, error: string, validacion: ValidacionArmado) {
  res.status(409).json({
    error,
    incompatibilidades: validacion.incompatibilidades,
    faltantes: validacion.faltantes,
  });
}

// POST /api/armador/compatibles?lang=  { seleccion: [{ idProducto, cantidad }], tipo }
// Productos del paso "tipo" separados en compatibles e incompatibles (con el motivo) con lo ya elegido.
// tipo "Monitor" o "Perifericos" (mouses, teclados...): todos compatibles.
export async function listarCompatibles(req: Request, res: Response<CompatiblesRespuesta>) {
  const { lang } = langQuerySchema.parse(req.query);
  const { seleccion, tipo } = compatiblesSchema.parse(req.body);

  if (tipo === PASO_MONITOR || tipo === PASO_PERIFERICOS) {
    const categorias = tipo === PASO_MONITOR ? [CATEGORIA_MONITORES] : CATEGORIAS_PERIFERICOS;
    const perifericos = await prisma.producto.findMany({
      where: { activo: true, componentePC: null, categoria: { nombre: { in: categorias } } },
      include: crearIncludeArmador(lang),
      orderBy: [{ categoria: { nombre: "asc" } }, { precio: "asc" }, { idProducto: "asc" }],
    });
    res.json({ tipo, productos: perifericos.map((p) => mapearArmador(p).producto), incompatibles: [] });
    return;
  }

  const elegidos = componentesDe(await cargarSeleccion(seleccion, lang));
  // Si ya habia uno elegido de este tipo, el candidato se evalua con la misma cantidad (ej. 2 modulos de RAM).
  // En almacenamiento cada disco tiene su cantidad: se usa la del mismo producto si ya esta elegido.
  const cantidadDe = (idProducto: number) =>
    elegidos.find((c) => (permiteVarios(tipo) ? c.id === idProducto : c.tipo === tipo))?.cantidad ?? 1;

  const candidatos = await prisma.producto.findMany({
    where: { activo: true, componentePC: { tipoComponente: { nombre: tipo } } },
    include: crearIncludeArmador(lang),
    orderBy: [{ precio: "asc" }, { idProducto: "asc" }],
  });

  const respuesta: CompatiblesRespuesta = { tipo, productos: [], incompatibles: [] };
  for (const p of candidatos) {
    const { producto, componente } = mapearArmador(p, cantidadDe(p.idProducto));
    const motivos = componente ? incompatibilidadesDe(componente, elegidos) : [];
    if (motivos.length === 0) respuesta.productos.push(producto);
    else respuesta.incompatibles.push({ producto, motivos });
  }
  res.json(respuesta);
}

// POST /api/armador/validar  { seleccion }
// Incompatibilidades (con su motivo), componentes faltantes, potencia y precio total.
export async function validarArmado(req: Request, res: Response<ValidacionArmado>) {
  const { seleccion } = seleccionBodySchema.parse(req.body);
  res.json(armarValidacion(await cargarSeleccion(seleccion)));
}

// POST /api/armador/fuente-sugerida?lang=  { seleccion }
export async function sugerirFuente(req: Request, res: Response<FuenteSugeridaRespuesta>) {
  const { lang } = langQuerySchema.parse(req.query);
  const { seleccion } = seleccionBodySchema.parse(req.body);
  const elegidos = componentesDe(await cargarSeleccion(seleccion, lang));
  const potencia = calcularPotencia(elegidos);

  const candidatas = await prisma.producto.findMany({
    where: { activo: true, stock: { gt: 0 }, componentePC: { tipoComponente: { nombre: "Fuente" } } },
    include: crearIncludeArmador(lang),
    orderBy: [{ precio: "asc" }, { idProducto: "asc" }],
  });

  // Ademas de compatible, tiene que tener la potencia cargada: sin ese dato no se puede sugerir
  const fuentes = candidatas
    .map((p) => mapearArmador(p))
    .filter(
      ({ componente }) =>
        !!componente &&
        Number(componente.atributos.Potencia) >= potencia.recomendada &&
        incompatibilidadesDe(componente, elegidos).length === 0,
    )
    .map((c) => c.producto);

  res.json({ potencia, fuentes });
}

// GET /api/armador/servicios?lang=
// Servicios que se pueden sumar al armado al comprarlo (armado, instalacion de Windows...)
export async function listarServicios(req: Request, res: Response<ProductoArmador[]>) {
  const { lang } = langQuerySchema.parse(req.query);
  const servicios = await prisma.producto.findMany({
    where: { activo: true, componentePC: null, categoria: { nombre: CATEGORIA_SERVICIOS } },
    include: crearIncludeArmador(lang),
    orderBy: { idProducto: "asc" },
  });
  res.json(servicios.map((p) => mapearArmador(p).producto));
}

// POST /api/armador/carrito  { seleccion }
// Agrega todo el armado al carrito. Solo si esta completo y no tiene incompatibilidades.
export async function agregarArmadoAlCarrito(req: Request, res: Response) {
  const { seleccion } = seleccionBodySchema.parse(req.body);
  const cargados = await cargarSeleccion(seleccion);
  const validacion = armarValidacion(cargados);
  if (!validacion.valida) return rechazar(res, "El armado tiene componentes incompatibles", validacion);
  if (!validacion.completa) return rechazar(res, "Faltan componentes obligatorios en el armado", validacion);

  const carrito = await obtenerOCrearCarrito(idUsuarioDe(req));
  // En una transaccion: si a uno le falta stock, no se agrega ninguno
  await prisma.$transaction(async (tx) => {
    for (const { producto, cantidad: aAgregar } of cargados) {
      const clave = { idCarrito_idProducto: { idCarrito: carrito.idCarrito, idProducto: producto.id } };
      const existente = await tx.itemCarrito.findUnique({ where: clave });
      // Un servicio va una sola vez, aunque se agregue otro armado que tambien lo tenga
      const cantidad = producto.paso === PASO_SERVICIOS ? 1 : (existente?.cantidad ?? 0) + aAgregar;
      if (cantidad > producto.stock) {
        throw new AppError(400, `Stock insuficiente de "${producto.nombre}". Disponible: ${producto.stock}`);
      }
      await tx.itemCarrito.upsert({
        where: clave,
        create: { idCarrito: carrito.idCarrito, idProducto: producto.id, cantidad },
        update: { cantidad },
      });
    }
  });

  res.status(201).json(await detalleCarrito(carrito.idCarrito));
}

// GET /api/armador/presets?lang=  (armados guardados del usuario)
export async function listarPresets(req: Request, res: Response<PresetArmado[]>) {
  const { lang } = langQuerySchema.parse(req.query);
  const presets = await prisma.preset.findMany({
    where: { idUsuario: idUsuarioDe(req) },
    include: { componentes: { include: { producto: { include: crearIncludeArmador(lang) } } } },
    orderBy: { idPreset: "desc" },
  });

  res.json(
    presets.map((p) => ({
      id: p.idPreset,
      nombre: p.nombre,
      potenciaWatts: p.potenciaWatts,
      // Los productos dados de baja ya no se pueden elegir: el armado se carga sin ellos
      componentes: p.componentes
        .filter((c) => c.producto.activo && esDelArmador(c.producto))
        .map((c) => ({ producto: mapearArmador(c.producto).producto, cantidad: c.cantidad })),
    })),
  );
}

// POST /api/armador/presets  { nombre, seleccion }
// Se puede guardar un armado a medias (presupuesto), pero nunca uno incompatible.
export async function guardarPreset(req: Request, res: Response) {
  const { nombre, seleccion } = guardarPresetSchema.parse(req.body);
  const cargados = await cargarSeleccion(seleccion);
  const validacion = armarValidacion(cargados);
  if (!validacion.valida) return rechazar(res, "El armado tiene componentes incompatibles", validacion);

  const preset = await prisma.preset.create({
    data: {
      idUsuario: idUsuarioDe(req),
      nombre,
      potenciaWatts: validacion.potencia.consumo,
      componentes: {
        create: cargados.map((c) => ({ idProducto: c.producto.id, cantidad: c.cantidad })),
      },
    },
  });

  const respuesta: PresetArmado = {
    id: preset.idPreset,
    nombre: preset.nombre,
    potenciaWatts: preset.potenciaWatts,
    componentes: cargados.map((c) => ({ producto: c.producto, cantidad: c.cantidad })),
  };
  res.status(201).json(respuesta);
}

// DELETE /api/armador/presets/:id  (solo los del propio usuario)
export async function eliminarPreset(req: Request, res: Response) {
  const { id } = idPresetParamSchema.parse(req.params);
  const { count } = await prisma.preset.deleteMany({ where: { idPreset: id, idUsuario: idUsuarioDe(req) } });
  if (count === 0) throw new AppError(404, "Armado no encontrado");
  res.status(204).end();
}
