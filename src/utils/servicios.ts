import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { AppError } from "./AppError";
import type { Software, TipoServicio } from "./servicioTecnico.catalogo";

// Servicios del local (tabla Servicio). Ver el comentario del modelo en schema.prisma.
export const GRUPOS_SERVICIO = ["ARMADOR", "TIPO", "EXTRA", "SOFTWARE"] as const;
export type GrupoServicio = (typeof GRUPOS_SERVICIO)[number];

// Extras de una solicitud de servicio tecnico -> codigo del servicio que tiene su precio
export const CODIGOS_EXTRA = {
  conBackup: "EXTRA_BACKUP",
  conPastaTermica: "EXTRA_PASTA_TERMICA",
  conSSD: "EXTRA_SSD",
} as const;
export const codigoSoftware = (s: Software) => `SOFTWARE_${s}`;

// Lo que ve el cliente de un servicio del armador (y lo que va en el carrito)
export interface ServicioResumen {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  precio: number;
}

// Nombre y descripcion en el idioma pedido (si no hay traduccion, en espanol)
export const crearIncludeServicio = (codigoIdioma = "es") =>
  ({
    traducciones: {
      where: { idioma: { codigo: codigoIdioma, activo: true } },
      select: { nombreTraducido: true, descripcionTraducida: true },
      take: 1,
    },
  }) satisfies Prisma.ServicioInclude;

type ServicioConTraduccion = Prisma.ServicioGetPayload<{ include: ReturnType<typeof crearIncludeServicio> }>;

export function mapearServicioResumen(s: ServicioConTraduccion): ServicioResumen {
  const t = s.traducciones[0];
  return {
    id: s.idServicio,
    codigo: s.codigo,
    nombre: t ? t.nombreTraducido : s.nombre,
    descripcion: t ? t.descripcionTraducida : s.descripcion,
    precio: s.precio?.toNumber() ?? 0,
  };
}

// Servicios del armador que se ofrecen hoy (activos), en el orden configurado
export async function serviciosArmadorActivos(codigoIdioma = "es") {
  const servicios = await prisma.servicio.findMany({
    where: { grupo: "ARMADOR", activo: true },
    include: crearIncludeServicio(codigoIdioma),
    orderBy: [{ orden: "asc" }, { idServicio: "asc" }],
  });
  return servicios.map(mapearServicioResumen);
}

// Valida que los ids sean servicios del armador activos (para el carrito o un presupuesto)
export async function cargarServiciosArmador(ids: number[], codigoIdioma = "es") {
  if (ids.length === 0) return [];
  const servicios = await prisma.servicio.findMany({
    where: { idServicio: { in: ids }, grupo: "ARMADOR" },
    include: crearIncludeServicio(codigoIdioma),
  });
  const porId = new Map(servicios.map((s) => [s.idServicio, s]));
  return ids.map((id) => {
    const s = porId.get(id);
    if (!s) throw new AppError(404, `Servicio ${id} no encontrado`);
    if (!s.activo) throw new AppError(400, `"${s.nombre}" ya no está disponible`);
    return mapearServicioResumen(s);
  });
}

// ─── Servicio tecnico ───

export interface PrecioSolicitud {
  codigo: string;
  nombre: string; // como se llamaba al pedirlo (los programas los puede agregar el admin)
  precio: number | null; // null = a presupuestar
}

// Instalacion de software no tiene precio propio: se cobra cada programa
export const TIPO_SOFTWARE = "INSTALACION_SOFTWARE";

// Lo que pidio el cliente en una solicitud, como codigos de la tabla Servicio
export function codigosDeSolicitud(d: {
  servicios: TipoServicio[];
  software: Software[];
  conBackup: boolean;
  conPastaTermica: boolean;
  conSSD: boolean;
}) {
  return [
    ...d.servicios.filter((s) => s !== TIPO_SOFTWARE),
    ...(Object.keys(CODIGOS_EXTRA) as (keyof typeof CODIGOS_EXTRA)[]).filter((k) => d[k]).map((k) => CODIGOS_EXTRA[k]),
    ...d.software.map(codigoSoftware),
  ];
}

// Precios vigentes de lo pedido. Si algo esta deshabilitado (o el programa no existe), no se puede pedir.
export async function preciosDeSolicitud(codigos: string[]) {
  const servicios = await prisma.servicio.findMany({ where: { codigo: { in: codigos }, grupo: { not: "ARMADOR" } } });
  const porCodigo = new Map(servicios.map((s) => [s.codigo, s]));
  const precios: PrecioSolicitud[] = codigos.map((codigo) => {
    const s = porCodigo.get(codigo);
    if (!s && codigo.startsWith("SOFTWARE_")) throw new AppError(400, "Uno de los programas elegidos ya no está disponible");
    if (!s || !s.activo) throw new AppError(400, `"${s?.nombre ?? codigo}" no está disponible en este momento`);
    return { codigo, nombre: s.nombre, precio: s.precio?.toNumber() ?? null };
  });
  const total = precios.reduce((acc, p) => acc + (p.precio ?? 0), 0);
  return { precios, precioEstimado: Math.round(total * 100) / 100 };
}
