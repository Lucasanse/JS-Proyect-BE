import type { Prisma } from "@prisma/client";
import type { ProductoResumen } from "./catalogo.types";

// ─── Include de Prisma ────────────────────────────────────────────────
// Recibe el codigo de idioma y filtra la traduccion correspondiente.
// Se mantiene "satisfies" para que Prisma infiera el tipo exacto del resultado.

export const crearIncludeResumen = (codigoIdioma: string = "es") =>
  ({
    categoria: true,
    marca: true,
    componentePC: { select: { tipoComponente: { select: { nombre: true } } } },
    traducciones: {
      where: {
        idioma: {
          codigo: codigoIdioma,
          activo: true,
        },
      },
      select: {
        nombreTraducido: true,
        descripcionTraducida: true,
      },
      take: 1,
    },
  }) satisfies Prisma.ProductoInclude;

// Exportamos también la constante fija por si algún otro archivo la importa
export const includeResumen = crearIncludeResumen("es");

type ProductoConResumen = Prisma.ProductoGetPayload<{
  include: ReturnType<typeof crearIncludeResumen>;
}>;

// ─── Mapper: modelo de Prisma -> DTO de respuesta ────────────────────

export function mapearResumen(p: ProductoConResumen): ProductoResumen {
  const traduccion = p.traducciones[0];

  const comunes = {
    id: p.idProducto,
    nombre: traduccion ? traduccion.nombreTraducido : p.nombre,
    descripcion: traduccion ? traduccion.descripcionTraducida : p.descripcion,
    marca: p.marca.nombre,
    precio: p.precio.toNumber(),
    stock: p.stock,
    imagenUrl: p.imagenUrl,
    disponible: p.stock > 0,
    categoria: { id: p.categoria.idCategoria, nombre: p.categoria.nombre },
  };
  return p.componentePC
    ? {
        ...comunes,
        esComponentePC: true,
        tipoComponente: p.componentePC.tipoComponente.nombre,
      }
    : { ...comunes, esComponentePC: false, tipoComponente: null };
}
